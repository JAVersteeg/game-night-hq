-- Per-group player colour. Chosen on join (auto-assigned to the first free colour so joining
-- never blocks on a picker screen), changeable later from group settings. Unique per group so two
-- members are never visually indistinguishable in the live view, leaderboards, and charts.

create type public.player_color as enum (
  'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'brown', 'grey', 'black', 'white'
);

alter table public.group_members add column color public.player_color;

-- Backfill pre-existing membership rows (this table predates the column) with distinct colours in
-- join order, so the NOT NULL + uniqueness constraints below can land without a manual data fix.
with ranked as (
  select group_id, user_id,
         row_number() over (partition by group_id order by joined_at) as rn
  from public.group_members
)
update public.group_members gm
set color = (enum_range(null::public.player_color))[ranked.rn]
from ranked
where gm.group_id = ranked.group_id and gm.user_id = ranked.user_id;

alter table public.group_members alter column color set not null;
alter table public.group_members
  add constraint group_members_group_id_color_key unique (group_id, color);

-- The first colour, in enum order, not already taken within the group. Used to auto-assign on
-- join/create; null means all 12 are spoken for.
create or replace function private.next_available_color(p_group_id uuid)
returns public.player_color
language sql stable set search_path = '' as $$
  select c
  from unnest(enum_range(null::public.player_color)) as c
  where c not in (select gm.color from public.group_members gm where gm.group_id = p_group_id)
  order by c
  limit 1;
$$;

-- Recreated to also assign the creator's colour: a brand-new group has no members yet, so this is
-- always the first enum value, but going through next_available_color keeps one code path for
-- "assign a colour to a member of this group" rather than hardcoding it twice.
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

  insert into public.group_members (group_id, user_id, color)
  values (v_group.id, v_user_id, private.next_available_color(v_group.id));
  return v_group;
end;
$$;

-- Recreated to auto-assign a colour on join. `on conflict (group_id, user_id)` targets the PK
-- specifically (not a bare `on conflict do nothing`) so a genuine colour collision from two people
-- joining the same group in the same instant still surfaces as an error instead of silently
-- dropping the join — rare enough in a friend-group-sized app that a retry on failure is enough.
create or replace function public.join_group_by_code(p_code text)
returns public.groups
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.groups;
  v_color public.player_color;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_group from public.groups g where g.invite_code = upper(btrim(p_code));
  if not found then
    raise exception 'invalid invite code' using errcode = 'P0002';
  end if;

  v_color := private.next_available_color(v_group.id);
  if v_color is null then
    raise exception 'this group has no colours left' using errcode = 'P0003';
  end if;

  insert into public.group_members (group_id, user_id, color)
  values (v_group.id, v_user_id, v_color)
  on conflict (group_id, user_id) do nothing;

  return v_group;
end;
$$;

-- Changing your own colour is a definer RPC rather than an UPDATE policy for the same reason
-- create_group/join_group_by_code are: an open `using (user_id = auth.uid())` policy would let a
-- member rewrite group_id on their own row too, effectively joining a group without its invite
-- code. Scoping the write to this function is what keeps that from being possible.
create or replace function public.set_member_color(p_group_id uuid, p_color public.player_color)
returns public.group_members
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_row public.group_members;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.group_members
  set color = p_color
  where group_id = p_group_id and user_id = v_user_id
  returning * into v_row;

  if v_row.user_id is null then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;

  return v_row;
exception when unique_violation then
  raise exception 'colour already taken' using errcode = '23505';
end;
$$;

revoke all on function public.set_member_color(uuid, public.player_color) from public, anon;
grant execute on function public.set_member_color(uuid, public.player_color) to authenticated;
