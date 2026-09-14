-- Starting a session touches two tables (sessions, session_participants). The scorekeeper for a
-- session is chosen fresh each time and is often not the person starting it, but
-- session_participants_insert only allows writes from that session's scorekeeper — a rule aimed at
-- an in-progress game, not at setup. A security definer RPC is what lets any group member stand up
-- a session for someone else to run, the same reasoning as create_group's definer function.
create or replace function public.create_session(
  p_group_id uuid,
  p_template_id uuid,
  p_scorekeeper_id uuid,
  p_participant_ids uuid[]
)
returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.sessions;
  v_participant_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not private.is_group_member(p_group_id) then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;

  if private.template_group_id(p_template_id) is distinct from p_group_id then
    raise exception 'game does not belong to this group' using errcode = '22023';
  end if;

  if not private.is_member_of(p_group_id, p_scorekeeper_id) then
    raise exception 'scorekeeper must be a member of this group' using errcode = '22023';
  end if;

  if array_length(p_participant_ids, 1) is null then
    raise exception 'a session needs at least one participant' using errcode = '22023';
  end if;

  foreach v_participant_id in array p_participant_ids loop
    if not private.is_member_of(p_group_id, v_participant_id) then
      raise exception 'participant must be a member of this group' using errcode = '22023';
    end if;
  end loop;

  insert into public.sessions (group_id, template_id, scorekeeper_id)
  values (p_group_id, p_template_id, p_scorekeeper_id)
  returning * into v_session;

  insert into public.session_participants (session_id, user_id)
  select v_session.id, participant_id
  from unnest(p_participant_ids) as participant_id
  on conflict do nothing;

  return v_session;
end;
$$;

revoke all on function public.create_session(uuid, uuid, uuid, uuid[]) from public, anon;
grant execute on function public.create_session(uuid, uuid, uuid, uuid[]) to authenticated;
