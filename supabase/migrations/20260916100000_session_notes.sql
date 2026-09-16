-- Session notes: a free-text, append-only log attached to a session. Multiple notes per session,
-- written only by the scorekeeper, while the session is in progress or within a 2-hour grace
-- window after it's completed. No edit — only insert and delete — so the log is otherwise
-- immutable once that window closes.

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
-- History and the live view always read a single session oldest-first.
create index session_notes_session_id_idx on public.session_notes (session_id, created_at);

alter table public.session_notes enable row level security;

-- Same shape as can_write_scores, plus a 2-hour grace window after completion so a scorekeeper can
-- still add a closing note without racing to finalize first.
create or replace function private.can_write_session_notes(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and s.scorekeeper_id = (select auth.uid())
      and (
        s.status = 'in_progress'
        or (s.status = 'completed' and now() <= s.completed_at + interval '2 hours')
      )
  );
$$;

grant execute on function private.can_write_session_notes(uuid) to authenticated;

create policy session_notes_select on public.session_notes for select to authenticated
  using (private.can_read_session(session_id));
create policy session_notes_insert on public.session_notes for insert to authenticated
  with check (private.can_write_session_notes(session_id) and author_id = (select auth.uid()));
create policy session_notes_delete on public.session_notes for delete to authenticated
  using (private.can_write_session_notes(session_id) and author_id = (select auth.uid()));

alter publication supabase_realtime add table public.session_notes;
