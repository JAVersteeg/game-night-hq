-- A session the scorekeeper starts and immediately abandons (backs out before entering any
-- scores) has no business surviving as an orphaned in_progress row nobody can ever finish or see
-- in history. Only the scorekeeper can delete it, and only while it's still in progress — a
-- completed session is real history and stays immutable, same as the update policy already
-- guards. Deleting the session row cascades to session_participants and session_scores via their
-- existing "on delete cascade" foreign keys, so nothing else has to change.
create policy sessions_delete on public.sessions for delete to authenticated
  using (scorekeeper_id = (select auth.uid()) and status = 'in_progress');
