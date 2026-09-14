-- Group creation / joining, plus the realtime wiring the live session view depends on.

-- Creating a group is two writes that must not be separable: the group row, and the creator's
-- membership. Doing it client-side would need an INSERT policy on group_members, which is exactly
-- the hole we want to avoid, so it runs as a definer function instead.
create or replace function public.create_group(p_name text)
returns public.groups
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.groups;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Codes are short enough that collisions are possible; retry rather than surfacing a unique
  -- violation to the caller.
  for _ in 1..10 loop
    begin
      insert into public.groups (name, created_by, invite_code)
      values (btrim(p_name), v_user_id, private.generate_invite_code())
      returning * into v_group;
      exit;
    exception when unique_violation then
      v_group := null;
    end;
  end loop;

  if v_group.id is null then
    raise exception 'could not allocate a unique invite code';
  end if;

  insert into public.group_members (group_id, user_id) values (v_group.id, v_user_id);
  return v_group;
end;
$$;

-- Joining by code is the one operation that must read a group the caller cannot see. Keeping the
-- lookup inside a definer function means the invite code alone grants membership, and never grants
-- read access to anything until the membership row exists. Idempotent on re-join.
create or replace function public.join_group_by_code(p_code text)
returns public.groups
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.groups;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_group from public.groups g where g.invite_code = upper(btrim(p_code));
  if not found then
    raise exception 'invalid invite code' using errcode = 'P0002';
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group.id, v_user_id)
  on conflict do nothing;

  return v_group;
end;
$$;

revoke all on function public.create_group(text) from public, anon;
revoke all on function public.join_group_by_code(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;

-- Keeps session_scores.updated_at honest without the client having to send it.
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger session_scores_touch_updated_at
  before update on public.session_scores
  for each row execute function private.touch_updated_at();

-- Realtime: the read-only live view subscribes to these two tables. REPLICA IDENTITY FULL is
-- needed so RLS can be applied to UPDATE/DELETE events, which carry the old row.
alter table public.session_scores replica identity full;
alter table public.sessions replica identity full;
alter publication supabase_realtime add table public.session_scores;
alter publication supabase_realtime add table public.sessions;
