-- Team games. A template opts in with `teams`; the teams themselves are formed fresh for every
-- session, since who plays with whom changes from night to night.
--
-- A team game is either decided on points (an ordinary highest/lowest_total_wins template whose
-- fields are filled in once per team) or by simply naming the winning team (`team_win`, fieldless).
--
-- Team scores are stored on every member's own session_scores rows rather than in a table of their
-- own: the client always writes a team's entry to all of its members at once. That keeps totals,
-- history, badges and every per-player stat working off the rows they already read — each member
-- simply carries the team total, and the whole winning team counts as winners.
alter table public.game_templates
  add column teams boolean not null default false,
  add constraint game_templates_team_win_needs_teams
    check (scoring_direction <> 'team_win' or (teams and not rounds)),
  add constraint game_templates_ranked_not_teams
    check (scoring_direction <> 'ranked' or not teams);

-- Teams are numbered 1..N within a session. Null for a session of a non-team template.
alter table public.session_participants
  add column team smallint,
  add constraint session_participants_team_positive check (team is null or team > 0);

-- `team_names[n]` names team n. A null entry (or a missing one) means "name it after its players",
-- so only a name someone actually typed is stored, and the default keeps up with the roster.
--
-- `winning_team` is to teams what `winner_id` is to players: the result itself for a `team_win`
-- game, and the tie-break for a single-winner team game decided on points.
alter table public.sessions
  add column team_names text[],
  add column winning_team smallint,
  add constraint sessions_winning_team_positive check (winning_team is null or winning_team > 0);

-- Same reason winner_id uses a trigger rather than a composite FK (see single_winner_fk_fix): a
-- winning team has to be one that actually played.
create function private.check_session_winning_team_played()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.winning_team is not null and not exists (
    select 1 from public.session_participants sp
    where sp.session_id = new.id and sp.team = new.winning_team
  ) then
    raise exception 'the winning team must be a team of the session' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger sessions_winning_team_played
  before insert or update of winning_team on public.sessions
  for each row execute function private.check_session_winning_team_played();

drop function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text, boolean, integer, boolean);

create function public.create_game_template(
  p_group_id uuid,
  p_name text,
  p_scoring_direction public.scoring_direction,
  p_fields jsonb,
  p_bonus_rules jsonb default '[]'::jsonb,
  p_cover_key text default null,
  p_rounds boolean default false,
  p_round_count integer default null,
  p_single_winner boolean default false,
  p_teams boolean default false
)
returns public.game_templates
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_template public.game_templates;
  v_field jsonb;
  v_rule jsonb;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_scoring_direction in ('ranked', 'team_win') then
    if jsonb_array_length(p_fields) > 0 or jsonb_array_length(p_bonus_rules) > 0 then
      raise exception 'a template without points cannot have fields or bonus rules' using errcode = '22023';
    end if;
  elsif jsonb_array_length(p_fields) = 0 then
    raise exception 'a game template needs at least one field' using errcode = '22023';
  end if;

  if p_round_count is not null and (not p_rounds or p_round_count <= 0) then
    raise exception 'round_count only applies to a rounds template, and must be positive' using errcode = '22023';
  end if;

  insert into public.game_templates
    (group_id, name, scoring_direction, created_by, cover_key, rounds, round_count, single_winner, teams)
  values
    (p_group_id, btrim(p_name), p_scoring_direction, v_user_id, p_cover_key, p_rounds, p_round_count,
     p_single_winner, p_teams)
  returning * into v_template;

  for v_field in select * from jsonb_array_elements(p_fields)
  loop
    insert into public.game_template_fields (template_id, key, label, sign, default_value, exclusive, position)
    values (
      v_template.id,
      v_field->>'key',
      v_field->>'label',
      coalesce((v_field->>'sign')::smallint, 1),
      coalesce((v_field->>'default_value')::numeric, 0),
      coalesce((v_field->>'exclusive')::boolean, false),
      coalesce((v_field->>'position')::integer, 0)
    );
  end loop;

  for v_rule in select * from jsonb_array_elements(p_bonus_rules)
  loop
    insert into public.bonus_rules (template_id, field_key, operator, value, points_delta)
    values (
      v_template.id,
      v_rule->>'field_key',
      (v_rule->>'operator')::public.bonus_operator,
      (v_rule->>'value')::numeric,
      (v_rule->>'points_delta')::numeric
    );
  end loop;

  return v_template;
end;
$$;

revoke all on function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text, boolean, integer, boolean, boolean) from public, anon;
grant execute on function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text, boolean, integer, boolean, boolean) to authenticated;

-- Adds p_teams (one team number per entry of p_participant_ids, same order) and p_team_names.
-- Otherwise unchanged from seed_field_defaults, including seeding every member's starting values.
drop function public.create_session(uuid, uuid, uuid, uuid[]);

create function public.create_session(
  p_group_id uuid,
  p_template_id uuid,
  p_scorekeeper_id uuid,
  p_participant_ids uuid[],
  p_teams smallint[] default null,
  p_team_names text[] default null
)
returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.sessions;
  v_participant_id uuid;
  v_is_team_game boolean;
  v_team_count integer;
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

  if array_length(p_participant_ids, 1) <> (select count(distinct id) from unnest(p_participant_ids) as id) then
    raise exception 'a participant can only be listed once' using errcode = '22023';
  end if;

  foreach v_participant_id in array p_participant_ids loop
    if not private.is_member_of(p_group_id, v_participant_id) then
      raise exception 'participant must be a member of this group' using errcode = '22023';
    end if;
  end loop;

  select teams into v_is_team_game from public.game_templates where id = p_template_id;

  if v_is_team_game then
    v_team_count := (select count(distinct team) from unnest(p_teams) as team);

    -- Every participant on a team, at least two teams, numbered 1..N without gaps.
    if p_teams is null
       or array_length(p_teams, 1) is distinct from array_length(p_participant_ids, 1)
       or array_position(p_teams, null) is not null
       or v_team_count < 2
       or (select min(team) from unnest(p_teams) as team) <> 1
       or (select max(team) from unnest(p_teams) as team) <> v_team_count then
      raise exception 'every participant needs a team, and a team game needs at least two teams' using errcode = '22023';
    end if;

    if coalesce(array_length(p_team_names, 1), 0) > v_team_count then
      raise exception 'more team names than teams' using errcode = '22023';
    end if;
  elsif p_teams is not null or p_team_names is not null then
    raise exception 'this game is not played in teams' using errcode = '22023';
  end if;

  insert into public.sessions (group_id, template_id, scorekeeper_id, team_names)
  values (
    p_group_id,
    p_template_id,
    p_scorekeeper_id,
    -- Blank names are stored as null, so they fall back to the players' names like untouched ones.
    case when v_is_team_game and p_team_names is not null then
      array(
        select nullif(btrim(name), '')
        from unnest(p_team_names) with ordinality as entry (name, position)
        order by position
      )
    end
  )
  returning * into v_session;

  insert into public.session_participants (session_id, user_id, team)
  select v_session.id, entry.participant_id, entry.team
  from unnest(p_participant_ids, p_teams) as entry (participant_id, team);

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

revoke all on function public.create_session(uuid, uuid, uuid, uuid[], smallint[], text[]) from public, anon;
grant execute on function public.create_session(uuid, uuid, uuid, uuid[], smallint[], text[]) to authenticated;
