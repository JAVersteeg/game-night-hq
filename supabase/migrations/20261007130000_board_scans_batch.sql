-- Board analysis runs through Anthropic's Message Batches API: a careful reading takes longer than
-- an edge function may live, and batches cost half. The scan remembers its batch so whoever views
-- it next can collect the result. A batch expires after 24 hours, so only a scan stuck in
-- 'analyzing' for longer than that may be restarted.

alter table public.board_scans add column batch_id text;

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
    batch_id = null,
    detected_state = null,
    state = null,
    color_players = '{}'::jsonb,
    model = null,
    usage = null,
    error = null,
    updated_by = null
  where b.attempts < 3
    and (b.status <> 'analyzing' or b.updated_at < now() - interval '25 hours')
  returning *;
$$;
revoke execute on function public.begin_board_scan(uuid, uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.begin_board_scan(uuid, uuid, text, text[]) to service_role;
