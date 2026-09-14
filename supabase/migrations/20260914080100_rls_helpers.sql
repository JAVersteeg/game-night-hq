-- RLS helper functions.
--
-- These live in `private` and are SECURITY DEFINER for two reasons:
--   1. A policy on group_members that checks membership by selecting group_members recurses
--      infinitely. A definer function bypasses RLS on the tables it reads, breaking the cycle.
--   2. Policy expressions are re-evaluated per row; a single indexed EXISTS in a STABLE function
--      is far cheaper than an inlined correlated subquery.
--
-- Every function pins `search_path = ''` (so all names must be schema-qualified) and checks
-- auth.uid() internally rather than trusting its caller. `private` is not in PostgREST's exposed
-- schemas, so none of these are reachable as an RPC from the client regardless of grants.

create schema if not exists private;

create or replace function private.is_group_member(p_group_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = (select auth.uid())
  );
$$;

-- Same check for an arbitrary user, used by WITH CHECK policies to confirm that a scorekeeper or
-- participant being written actually belongs to the group.
create or replace function private.is_member_of(p_group_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_user_id
  );
$$;

create or replace function private.shares_group_with(p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1
    from public.group_members me
    join public.group_members them on them.group_id = me.group_id
    where me.user_id = (select auth.uid()) and them.user_id = p_user_id
  );
$$;

create or replace function private.template_group_id(p_template_id uuid)
returns uuid language sql security definer stable set search_path = '' as $$
  select gt.group_id from public.game_templates gt where gt.id = p_template_id;
$$;

create or replace function private.can_read_session(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1
    from public.sessions s
    join public.group_members gm on gm.group_id = s.group_id
    where s.id = p_session_id and gm.user_id = (select auth.uid())
  );
$$;

-- The whole permissions model in one predicate: scores are writable only by the session's current
-- scorekeeper, and only while that session is still in progress. Finalising flips status, which
-- is what "locks" the result.
create or replace function private.can_write_scores(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and s.scorekeeper_id = (select auth.uid())
      and s.status = 'in_progress'
  );
$$;

-- Ambiguity-free alphabet: no O/0, I/1, or similar, because these get read aloud and retyped.
create or replace function private.generate_invite_code()
returns text language sql volatile set search_path = '' as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32)::int) + 1, 1), ''
  )
  from generate_series(1, 6);
$$;

revoke all on schema private from anon, authenticated;
revoke all on all functions in schema private from anon, authenticated;
-- PostgREST cannot reach `private`, so these grants only enable use from inside policy expressions,
-- which are evaluated with the querying role's privileges.
grant usage on schema private to authenticated;
grant execute on function
  private.is_group_member(uuid),
  private.is_member_of(uuid, uuid),
  private.shares_group_with(uuid),
  private.template_group_id(uuid),
  private.can_read_session(uuid),
  private.can_write_scores(uuid)
to authenticated;
