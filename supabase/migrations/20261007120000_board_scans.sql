-- Board scans: a photo of a finished Catan board, read into a digital board by Claude (edge function
-- `analyze-board`) and correctable afterwards by the session's participants.
--
-- One row per session; analysing again replaces it, at most 3 times per session to bound API cost.
-- Rows are created and reset only by the edge function (secret key) through `begin_board_scan`, so
-- the cap can't be bypassed from the client. Participants may only touch the corrected `state` and
-- the colour → player labelling. `detected_state` keeps Claude's raw reading, so corrections double
-- as an accuracy measurement.

create or replace function private.is_session_participant(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.session_participants sp
    where sp.session_id = p_session_id and sp.user_id = (select auth.uid())
  );
$$;

create table public.board_scans (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  status text not null default 'analyzing' check (status in ('analyzing', 'ready', 'failed')),
  -- 'standard' = the 3–4 player board, 'extended' = the 5–6 player board.
  layout text not null check (layout in ('standard', 'extended')),
  image_paths text[] not null,
  attempts smallint not null default 1 check (attempts between 1 and 3),
  detected_state jsonb,
  state jsonb,
  -- { "<piece colour>": "<user id>" }
  color_players jsonb not null default '{}'::jsonb,
  model text,
  usage jsonb,
  error text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index board_scans_created_by_idx on public.board_scans (created_by);
create index board_scans_updated_by_idx on public.board_scans (updated_by);

create trigger board_scans_touch_updated_at
  before update on public.board_scans
  for each row execute function private.touch_updated_at();

alter table public.board_scans enable row level security;

revoke all on public.board_scans from anon, authenticated;
grant select on public.board_scans to authenticated;
grant update (state, color_players, updated_by) on public.board_scans to authenticated;

create policy board_scans_select on public.board_scans for select to authenticated
  using (private.can_read_session(session_id));
create policy board_scans_update on public.board_scans for update to authenticated
  using (status = 'ready' and private.is_session_participant(session_id))
  with check (
    status = 'ready'
    and private.is_session_participant(session_id)
    and updated_by = (select auth.uid())
  );

alter publication supabase_realtime add table public.board_scans;

-- Starts (or restarts) the scan for a session, atomically enforcing the cap. Returns no row when the
-- cap is reached or an analysis is still running. A run that died without finishing stops counting
-- as "running" after 5 minutes, so a killed worker can't lock the session forever.
create or replace function public.begin_board_scan(
  p_session_id uuid,
  p_user_id uuid,
  p_layout text,
  p_image_paths text[]
)
returns setof public.board_scans language sql security invoker set search_path = '' as $$
  insert into public.board_scans as b (session_id, created_by, layout, image_paths)
  values (p_session_id, p_user_id, p_layout, p_image_paths)
  on conflict (session_id) do update set
    created_by = excluded.created_by,
    layout = excluded.layout,
    image_paths = excluded.image_paths,
    attempts = b.attempts + 1,
    status = 'analyzing',
    detected_state = null,
    state = null,
    color_players = '{}'::jsonb,
    model = null,
    usage = null,
    error = null,
    updated_by = null
  where b.attempts < 3
    and (b.status <> 'analyzing' or b.updated_at < now() - interval '5 minutes')
  returning *;
$$;
revoke execute on function public.begin_board_scan(uuid, uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.begin_board_scan(uuid, uuid, text, text[]) to service_role;

-- Private bucket for the scan images: an overview plus full-resolution crops, at
-- `{session_id}/{scan_uuid}/{n}.jpg`. Participants upload; the edge function removes replaced ones.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-scans', 'board-scans', false, 15728640, array['image/jpeg']);

create policy board_scans_objects_select on storage.objects for select to authenticated
  using (
    bucket_id = 'board-scans'
    and private.can_read_session(private.session_photo_session_id(name))
  );
create policy board_scans_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'board-scans'
    and owner_id = (select auth.uid())::text
    and private.is_session_participant(private.session_photo_session_id(name))
  );
