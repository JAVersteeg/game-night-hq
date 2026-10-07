-- Board analysis no longer goes through the Message Batches API — a test batch sat in the queue
-- for over 1.5 hours. The edge function now reads the board itself with parallel calls (~35 s, see
-- supabase/functions/analyze-board/eval/README.md), so:
--   - the batch id goes;
--   - a scan still 'analyzing' after 5 minutes is a run that died, and may be restarted;
--   - a reading that fails hands its attempt back, so the counter may drop to 0.

alter table public.board_scans drop column batch_id;

alter table public.board_scans drop constraint board_scans_attempts_check;
alter table public.board_scans add constraint board_scans_attempts_check check (attempts between 0 and 3);

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
