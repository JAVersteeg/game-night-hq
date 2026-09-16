-- Notes are the group's shared commentary on a session, not the scorekeeper's own record — widen
-- who can add one from "the scorekeeper only" to "anyone who can read the session" (i.e. any
-- member of its group). The insert/delete policies already require author_id = auth.uid(), so this
-- alone is enough: each writer can still only touch their own notes, and the same in-progress /
-- 2-hour-grace-window rule still applies to everyone.
create or replace function private.can_write_session_notes(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and private.can_read_session(s.id)
      and (
        s.status = 'in_progress'
        or (s.status = 'completed' and now() <= s.completed_at + interval '2 hours')
      )
  );
$$;
