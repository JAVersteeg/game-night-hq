-- A field's default_value is where every player starts — Catan's two settlements, say. Until now it
-- was only what an untouched stepper displayed, while the total (and history, and stats) counted an
-- untouched field as 0, so the two disagreed. Seeding the defaults as real session_scores rows at
-- session start makes the starting position part of the score everywhere at once.
--
-- Only for a single-round template: a rounds template adds each round onto the running total, so a
-- seeded value would be counted as if a round had already been played. Exclusive fields are
-- skipped too — their default_value is the award for holding them, not a starting value.

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

  insert into public.session_scores (session_id, user_id, field_key, value)
  select v_session.id, participant.user_id, field.key, field.default_value
  from public.session_participants as participant
  cross join public.game_template_fields as field
  join public.game_templates as template on template.id = field.template_id
  where participant.session_id = v_session.id
    and field.template_id = p_template_id
    and not template.rounds
    and not field.exclusive
    and field.default_value <> 0
  on conflict do nothing;

  return v_session;
end;
$$;

revoke all on function public.create_session(uuid, uuid, uuid, uuid[]) from public, anon;
grant execute on function public.create_session(uuid, uuid, uuid, uuid[]) to authenticated;

-- Existing Catan templates predate the preset's starting value, so bring them in line. Matched the
-- same way the app recognises Catan (cover_key, or an exact name for templates without one).
update public.game_template_fields as field
set default_value = 2
from public.game_templates as template
where template.id = field.template_id
  and (template.cover_key = 'catan' or lower(trim(template.name)) = 'catan')
  and field.key = 'nederzettingen'
  and field.default_value = 0;
