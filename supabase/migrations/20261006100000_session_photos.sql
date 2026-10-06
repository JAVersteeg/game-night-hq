-- Two changes to what can be attached to a session after the fact:
--
-- 1. Notes can be added at any time, by any member who can read the session — a closing remark the
--    next morning shouldn't be locked out. Deleting one keeps the old rule (the author, while the
--    session is live or within 2 hours of completion), so `can_write_session_notes` now only gates
--    deletes and doubles as "the session's delete window" for photos below.
--
-- 2. Photos: same shape as notes. Any member can add one at any time; only the uploader can delete
--    it, within the same window. The image itself lives in the private `session-photos` bucket at
--    `{session_id}/{uuid}.jpg`; `session_photos` is the row the app lists, reads realtime from and
--    deletes through.

drop policy session_notes_insert on public.session_notes;
create policy session_notes_insert on public.session_notes for insert to authenticated
  with check (private.can_read_session(session_id) and author_id = (select auth.uid()));

comment on function private.can_write_session_notes(uuid) is
  'Delete window for notes and photos: session in progress, or completed within the last 2 hours.';

create table public.session_photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  uploader_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
create index session_photos_session_id_idx on public.session_photos (session_id, created_at);
create index session_photos_uploader_id_idx on public.session_photos (uploader_id);

alter table public.session_photos enable row level security;

create policy session_photos_select on public.session_photos for select to authenticated
  using (private.can_read_session(session_id));
create policy session_photos_insert on public.session_photos for insert to authenticated
  with check (private.can_read_session(session_id) and uploader_id = (select auth.uid()));
create policy session_photos_delete on public.session_photos for delete to authenticated
  using (private.can_write_session_notes(session_id) and uploader_id = (select auth.uid()));

alter publication supabase_realtime add table public.session_photos;

-- Private bucket: images are only reachable through signed URLs, which `can_read_session` gates.
-- The app resizes to ~1600px JPEG before upload, so 10 MB is a generous ceiling, not a target.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('session-photos', 'session-photos', false, 10485760, array['image/jpeg']);

-- The session id is the object's first path segment. A malformed name would fail the uuid cast, so
-- it's parsed defensively and yields null (and thereby no access) instead of raising.
create or replace function private.session_photo_session_id(p_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-fA-F-]{36}$'
      then ((storage.foldername(p_name))[1])::uuid
  end;
$$;

-- Throwing a live session away is open to any member (`sessions_delete`), so whoever does that can
-- also clear its photo files first rather than leaving them orphaned once the rows cascade away.
create or replace function private.can_delete_live_session(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and s.status = 'in_progress'
      and private.is_group_member(s.group_id)
  );
$$;

create policy session_photos_objects_select on storage.objects for select to authenticated
  using (
    bucket_id = 'session-photos'
    and private.can_read_session(private.session_photo_session_id(name))
  );
create policy session_photos_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'session-photos'
    and owner_id = (select auth.uid())::text
    and private.can_read_session(private.session_photo_session_id(name))
  );
create policy session_photos_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'session-photos'
    and (
      (
        owner_id = (select auth.uid())::text
        and private.can_write_session_notes(private.session_photo_session_id(name))
      )
      or private.can_delete_live_session(private.session_photo_session_id(name))
    )
  );
