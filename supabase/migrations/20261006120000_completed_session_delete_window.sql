-- A finished session can now be thrown away too — by its scorekeeper, within the same 2-hour
-- window after `completed_at` that already lets them correct its scores (`can_write_scores`). A
-- potje entered by mistake, or twice, otherwise sits in history and stats forever. Live sessions
-- keep their existing rule: any group member may delete one (`sessions_delete_any_member`).
--
-- One predicate for both the row and its photo files, so the storage cleanup the app does right
-- before deleting the row can never be refused for a session the row delete would allow. Notes,
-- scores, participants and photo rows go with it via `on delete cascade` (RI actions bypass RLS).
create or replace function private.can_delete_session(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and private.is_group_member(s.group_id)
      and (
        s.status = 'in_progress'
        or (
          s.status = 'completed'
          and s.scorekeeper_id = (select auth.uid())
          and now() <= s.completed_at + interval '2 hours'
        )
      )
  );
$$;

drop policy sessions_delete on public.sessions;
create policy sessions_delete on public.sessions for delete to authenticated
  using (private.can_delete_session(id));

-- Swap the live-only helper the photo-files policy used for the shared predicate above.
drop policy session_photos_objects_delete on storage.objects;
create policy session_photos_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'session-photos'
    and (
      (
        owner_id = (select auth.uid())::text
        and private.can_write_session_notes(private.session_photo_session_id(name))
      )
      or private.can_delete_session(private.session_photo_session_id(name))
    )
  );

drop function private.can_delete_live_session(uuid);
