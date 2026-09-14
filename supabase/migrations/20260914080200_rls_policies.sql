-- Row Level Security. Every table is deny-by-default; a row is reachable only through membership
-- of the group it belongs to. auth.uid() is always wrapped in a scalar subquery so the planner
-- evaluates it once per statement instead of once per row.

alter table public.profiles              enable row level security;
alter table public.groups                enable row level security;
alter table public.group_members         enable row level security;
alter table public.game_templates        enable row level security;
alter table public.game_template_fields  enable row level security;
alter table public.bonus_rules           enable row level security;
alter table public.sessions              enable row level security;
alter table public.session_participants  enable row level security;
alter table public.session_scores        enable row level security;

-- profiles ---------------------------------------------------------------
-- You can see yourself, and anyone you share at least one group with. Nobody else's display name
-- is enumerable.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_group_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- groups -----------------------------------------------------------------
-- No INSERT policy: groups are created solely through public.create_group(), which also inserts
-- the creator's membership row in the same transaction. Joining goes through join_group_by_code().
-- That keeps an invite code from ever requiring a readable groups row for a non-member.
create policy groups_select on public.groups for select to authenticated
  using (private.is_group_member(id));
create policy groups_update on public.groups for update to authenticated
  using (private.is_group_member(id)) with check (private.is_group_member(id));

-- group_members ----------------------------------------------------------
-- Likewise no INSERT policy. DELETE is self-only: you can leave a group, not remove someone else,
-- which matches "no admin role in v1".
create policy group_members_select on public.group_members for select to authenticated
  using (private.is_group_member(group_id));
create policy group_members_delete on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- game templates ---------------------------------------------------------
-- Any member may define or edit a game; there is no template owner.
create policy game_templates_select on public.game_templates for select to authenticated
  using (private.is_group_member(group_id));
create policy game_templates_insert on public.game_templates for insert to authenticated
  with check (private.is_group_member(group_id) and created_by = (select auth.uid()));
create policy game_templates_update on public.game_templates for update to authenticated
  using (private.is_group_member(group_id)) with check (private.is_group_member(group_id));
create policy game_templates_delete on public.game_templates for delete to authenticated
  using (private.is_group_member(group_id));

create policy game_template_fields_all on public.game_template_fields for all to authenticated
  using (private.is_group_member(private.template_group_id(template_id)))
  with check (private.is_group_member(private.template_group_id(template_id)));

create policy bonus_rules_all on public.bonus_rules for all to authenticated
  using (private.is_group_member(private.template_group_id(template_id)))
  with check (private.is_group_member(private.template_group_id(template_id)));

-- sessions ---------------------------------------------------------------
-- Anyone in the group can start a session, but the WITH CHECK pins the template to the same group
-- and requires the nominated scorekeeper to actually be a member.
create policy sessions_select on public.sessions for select to authenticated
  using (private.is_group_member(group_id));
create policy sessions_insert on public.sessions for insert to authenticated
  with check (
    private.is_group_member(group_id)
    and private.template_group_id(template_id) = group_id
    and private.is_member_of(group_id, scorekeeper_id)
  );
-- Only the scorekeeper mutates the session itself (that is how it gets finalised).
create policy sessions_update on public.sessions for update to authenticated
  using (scorekeeper_id = (select auth.uid()))
  with check (scorekeeper_id = (select auth.uid()));

-- session participants ---------------------------------------------------
-- Readable by the whole group; edited only by the scorekeeper of a live session.
create policy session_participants_select on public.session_participants for select to authenticated
  using (private.can_read_session(session_id));
create policy session_participants_insert on public.session_participants for insert to authenticated
  with check (private.can_write_scores(session_id));
create policy session_participants_delete on public.session_participants for delete to authenticated
  using (private.can_write_scores(session_id));

-- session scores ---------------------------------------------------------
-- The read side is what everyone else's live read-only view subscribes to. The write side is the
-- scorekeeper-while-in-progress rule, which is also what locks a finalised session.
create policy session_scores_select on public.session_scores for select to authenticated
  using (private.can_read_session(session_id));
create policy session_scores_insert on public.session_scores for insert to authenticated
  with check (private.can_write_scores(session_id));
create policy session_scores_update on public.session_scores for update to authenticated
  using (private.can_write_scores(session_id))
  with check (private.can_write_scores(session_id));
create policy session_scores_delete on public.session_scores for delete to authenticated
  using (private.can_write_scores(session_id));
