-- Widen the in-progress delete from "the scorekeeper" to "any group member".
--
-- `sessions_delete` (20260914120000) let only the scorekeeper throw a live session away, which
-- makes an abandoned one immortal in practice: the person who walked off mid-game is exactly the
-- person who never comes back to clean it up, so the row sits on every member's dashboard forever
-- as a potje that is "nu bezig" and never will be again.
--
-- Still restricted to `status = 'in_progress'`: a completed session is real history and stays
-- immutable, same as before. Nothing of value is reachable this way — an in-progress session holds
-- at most a half-finished score sheet that anyone in the group could already overwrite by taking
-- over as scorekeeper.
drop policy sessions_delete on public.sessions;

create policy sessions_delete on public.sessions for delete to authenticated
  using (private.is_group_member(group_id) and status = 'in_progress');
