-- Generalises "played in rounds" into an ordinary template property instead of its own scoring
-- direction. `dalmuti_rounds` was deliberately game-specific (see its migration's comment); this
-- reverses that call so any field-based template can also be played round by round (e.g.
-- Arschmallows' 6 rounds), and folds De Grote Dalmuti back into being a plain `ranked` template
-- like Catan is a plain `highest_total_wins` one — nothing else marks it as special.
--
-- `rounds` turns the live entry form into "repeat each round, accumulate": for `ranked` that's
-- exactly today's Dalmuti mechanic (drag order per round, N-minus-rank points banked under the
-- `points` field key); for `highest_total_wins`/`lowest_total_wins` it's the same field-entry form
-- as a single-round template, just adding each round's entries onto the running per-field totals
-- instead of overwriting them — which is also why bonus rules and `computeTotal` need no changes
-- at all, they already sum whatever is in session_scores.
--
-- `round_count` is purely informational (drives "Ronde 3 van 6" and pre-opens the finish dialog
-- after the last expected round) and deliberately not a hard cap: life happens, someone leaves
-- early, an extra round gets played. Null for an open-ended rounds template like Dalmuti, where
-- there is no fixed count to begin with.
alter table public.game_templates
  add column rounds boolean not null default false,
  add column round_count integer,
  add constraint game_templates_round_count_needs_rounds
    check (round_count is null or (rounds and round_count > 0));

-- Every existing Dalmuti template becomes an ordinary rounds template before the enum value it
-- used to need disappears. Nothing about its sessions, scores or `rounds_played` changes.
update public.game_templates
set rounds = true
where scoring_direction = 'dalmuti_rounds';

-- A `highest_total_wins`/`lowest_total_wins` rounds session needs the same "last round" undo
-- affordance `last_round_order` already gives the ranked case, but keyed by field values instead
-- of a finish order. Only one of the two is ever set at a time (whichever mode the template uses),
-- and like `last_round_order`, it is cleared the moment it's undone.
alter table public.sessions
  add column last_round_values jsonb,
  add constraint sessions_last_round_values_needs_a_round
    check (last_round_values is null or rounds_played > 0);

-- These three are being rewritten below (generalised, or in create_game_template's case given new
-- parameters) and reference the enum value about to disappear, so they're dropped ahead of it
-- rather than left to break.
drop function if exists public.commit_dalmuti_round(uuid, uuid[]);
drop function if exists public.undo_dalmuti_round(uuid);
drop function if exists public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text);

-- ADD VALUE can extend an enum in place; there is no DROP VALUE, so removing `dalmuti_rounds`
-- means swapping in a new type under the same name. Any row still holding it was just migrated to
-- `ranked` above, so the USING clause here never actually hits its ELSE-less-obvious branch — it's
-- defensive, not load-bearing.
create type public.scoring_direction_new as enum ('highest_total_wins', 'lowest_total_wins', 'ranked');

alter table public.game_templates
  alter column scoring_direction type public.scoring_direction_new
  using (
    case when scoring_direction = 'dalmuti_rounds' then 'ranked' else scoring_direction::text end
  )::public.scoring_direction_new;

drop type public.scoring_direction;
alter type public.scoring_direction_new rename to scoring_direction;

-- Renamed from private.dalmuti_round_points now that the N-minus-rank payout applies to any
-- ranked-and-rounds template, not just Dalmuti. Same body.
create or replace function private.round_rank_points(p_rank integer, p_participants integer)
returns integer language sql immutable set search_path = '' as $$
  select p_participants - p_rank;
$$;
drop function if exists private.dalmuti_round_points(integer, integer);

-- Banks one round of a ranked-and-rounds template (Dalmuti's mechanic): the finish order goes in,
-- the server adds `participants - rank` to every player's running `points` total. Generalised from
-- commit_dalmuti_round only in its guard (rounds + ranked, rather than the old direction value) —
-- the payout logic is unchanged.
create or replace function public.commit_ranked_round(p_session_id uuid, p_order uuid[])
returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.sessions;
  v_participants integer := coalesce(array_length(p_order, 1), 0);
  v_rank integer;
begin
  select * into v_session from public.sessions where id = p_session_id for update;

  if not found then
    raise exception 'session not found' using errcode = '22023';
  end if;

  if v_session.scorekeeper_id is distinct from (select auth.uid())
     or v_session.status <> 'in_progress' then
    raise exception 'only the scorekeeper of a live session can score a round' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.game_templates gt
    where gt.id = v_session.template_id and gt.rounds and gt.scoring_direction = 'ranked'
  ) then
    raise exception 'this game is not scored in ranked rounds' using errcode = '22023';
  end if;

  if v_participants = 0
     or v_participants <> (
       select count(*) from public.session_participants sp where sp.session_id = p_session_id
     )
     or v_participants <> (select count(distinct ordered_id) from unnest(p_order) as ordered_id)
     or exists (
       select 1 from unnest(p_order) as ordered_id
       where not exists (
         select 1 from public.session_participants sp
         where sp.session_id = p_session_id and sp.user_id = ordered_id
       )
     ) then
    raise exception 'the finish order must list every participant exactly once' using errcode = '22023';
  end if;

  for v_rank in 1..v_participants loop
    insert into public.session_scores (session_id, user_id, field_key, value)
    values (
      p_session_id,
      p_order[v_rank],
      'points',
      private.round_rank_points(v_rank, v_participants)
    )
    on conflict (session_id, user_id, field_key)
    do update set value = public.session_scores.value + excluded.value, updated_at = now();
  end loop;

  update public.sessions
  set rounds_played = rounds_played + 1, last_round_order = p_order, last_round_values = null
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

-- Banks one round of a highest/lowest_total_wins rounds template (Arschmallows and friends):
-- p_values is { "<user_id>": { "<field_key>": <delta>, ... }, ... }, one entry per participant who
-- scored something this round. Deltas are added onto the same session_scores rows a single-round
-- template would overwrite, so the existing bonus-rule/total math needs no rounds-specific branch
-- at all — it already sums whatever ends up in session_scores.
create or replace function public.commit_field_round(p_session_id uuid, p_values jsonb)
returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.sessions;
  v_template_id uuid;
  v_valid_keys text[];
  v_user_id uuid;
  v_field_key text;
  v_value numeric;
begin
  select * into v_session from public.sessions where id = p_session_id for update;

  if not found then
    raise exception 'session not found' using errcode = '22023';
  end if;

  if v_session.scorekeeper_id is distinct from (select auth.uid())
     or v_session.status <> 'in_progress' then
    raise exception 'only the scorekeeper of a live session can score a round' using errcode = '42501';
  end if;

  select gt.id into v_template_id
  from public.game_templates gt
  where gt.id = v_session.template_id and gt.rounds and gt.scoring_direction <> 'ranked';

  if v_template_id is null then
    raise exception 'this game is not scored in field-based rounds' using errcode = '22023';
  end if;

  select array_agg(key) into v_valid_keys
  from public.game_template_fields
  where template_id = v_template_id;

  for v_user_id, v_field_key, v_value in
    select (participant.key)::uuid, field.key, field.value::numeric
    from jsonb_each(coalesce(p_values, '{}'::jsonb)) as participant
    cross join lateral jsonb_each_text(participant.value) as field
  loop
    if not exists (
      select 1 from public.session_participants sp
      where sp.session_id = p_session_id and sp.user_id = v_user_id
    ) then
      raise exception 'round values reference a non-participant' using errcode = '22023';
    end if;

    if v_field_key <> all (coalesce(v_valid_keys, array[]::text[])) then
      raise exception 'unknown field key %', v_field_key using errcode = '22023';
    end if;

    insert into public.session_scores (session_id, user_id, field_key, value)
    values (p_session_id, v_user_id, v_field_key, v_value)
    on conflict (session_id, user_id, field_key)
    do update set value = public.session_scores.value + excluded.value, updated_at = now();
  end loop;

  update public.sessions
  set rounds_played = rounds_played + 1, last_round_values = p_values, last_round_order = null
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

-- Reverses whichever round bookkeeping column is set (only one ever is) and clears it, so undo is
-- available exactly once per banked round, for either rounds mode. Returns the round that was
-- taken back as `{"order": [...]}` or `{"values": {...}}`, matching whichever shape the client
-- needs to re-seed its local round-in-progress state from.
create or replace function public.undo_round(p_session_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.sessions;
  v_order uuid[];
  v_participants integer;
  v_rank integer;
  v_user_id uuid;
  v_field_key text;
  v_value numeric;
begin
  select * into v_session from public.sessions where id = p_session_id for update;

  if not found then
    raise exception 'session not found' using errcode = '22023';
  end if;

  if v_session.scorekeeper_id is distinct from (select auth.uid())
     or v_session.status <> 'in_progress' then
    raise exception 'only the scorekeeper of a live session can undo a round' using errcode = '42501';
  end if;

  if v_session.last_round_order is not null then
    v_order := v_session.last_round_order;
    v_participants := array_length(v_order, 1);

    for v_rank in 1..v_participants loop
      update public.session_scores
      set value = value - private.round_rank_points(v_rank, v_participants), updated_at = now()
      where session_id = p_session_id and user_id = v_order[v_rank] and field_key = 'points';
    end loop;

    update public.sessions
    set rounds_played = rounds_played - 1, last_round_order = null
    where id = p_session_id;

    return jsonb_build_object('order', to_jsonb(v_order));
  end if;

  if v_session.last_round_values is not null then
    for v_user_id, v_field_key, v_value in
      select (participant.key)::uuid, field.key, field.value::numeric
      from jsonb_each(v_session.last_round_values) as participant
      cross join lateral jsonb_each_text(participant.value) as field
    loop
      update public.session_scores
      set value = value - v_value, updated_at = now()
      where session_id = p_session_id and user_id = v_user_id and field_key = v_field_key;
    end loop;

    update public.sessions
    set rounds_played = rounds_played - 1, last_round_values = null
    where id = p_session_id;

    return jsonb_build_object('values', v_session.last_round_values);
  end if;

  raise exception 'there is no round left to undo' using errcode = '22023';
end;
$$;

revoke all on function public.commit_ranked_round(uuid, uuid[]) from public, anon;
grant execute on function public.commit_ranked_round(uuid, uuid[]) to authenticated;
revoke all on function public.commit_field_round(uuid, jsonb) from public, anon;
grant execute on function public.commit_field_round(uuid, jsonb) to authenticated;
revoke all on function public.undo_round(uuid) from public, anon;
grant execute on function public.undo_round(uuid) to authenticated;
grant execute on function private.round_rank_points(integer, integer) to authenticated;

-- Adds p_rounds/p_round_count; otherwise the same shape as before. A rounds template follows the
-- same field-count rule as a single-round one for its direction (fieldless only for `ranked`) —
-- rounds changes how entries accumulate, not whether the template has fields at all.
create or replace function public.create_game_template(
  p_group_id uuid,
  p_name text,
  p_scoring_direction public.scoring_direction,
  p_fields jsonb,
  p_bonus_rules jsonb default '[]'::jsonb,
  p_cover_key text default null,
  p_rounds boolean default false,
  p_round_count integer default null
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

  if p_scoring_direction = 'ranked' then
    if jsonb_array_length(p_fields) > 0 then
      raise exception 'a template scored on finish order cannot have fields' using errcode = '22023';
    end if;
  elsif jsonb_array_length(p_fields) = 0 then
    raise exception 'a game template needs at least one field' using errcode = '22023';
  end if;

  if p_round_count is not null and (not p_rounds or p_round_count <= 0) then
    raise exception 'round_count only applies to a rounds template, and must be positive' using errcode = '22023';
  end if;

  insert into public.game_templates
    (group_id, name, scoring_direction, created_by, cover_key, rounds, round_count)
  values
    (p_group_id, btrim(p_name), p_scoring_direction, v_user_id, p_cover_key, p_rounds, p_round_count)
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

revoke all on function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text, boolean, integer) from public, anon;
grant execute on function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text, boolean, integer) to authenticated;
