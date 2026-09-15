-- Round bookkeeping for `dalmuti_rounds` sessions.
--
-- Only the running total is stored, under the synthetic session_scores field key `points` (the
-- counterpart of `ranked`'s `rank`) — there is no per-round table, because nothing in the app asks
-- "who won round 3". What that costs is undo: the in-progress drag order is client-side state, so
-- once the scorekeeper starts dragging the next round there is no way to reconstruct the deltas
-- that were just applied. Hence `last_round_order`: the finish order of the round that was banked
-- most recently, which is exactly enough to reverse it, and is cleared on undo so a round can only
-- ever be taken back once.
--
-- `rounds_played` is not just a UI counter: it's the divisor the stats surfaces normalise a session
-- total by (points per round), so sessions of different lengths stay comparable.
alter table public.sessions
  add column rounds_played integer not null default 0 check (rounds_played >= 0),
  add column last_round_order uuid[],
  add constraint sessions_last_round_order_needs_a_round
    check (last_round_order is null or rounds_played > 0);

-- Round payout: last place scores 0, every place above it one point more. Rank is 1-based.
create or replace function private.dalmuti_round_points(p_rank integer, p_participants integer)
returns integer language sql immutable set search_path = '' as $$
  select p_participants - p_rank;
$$;

-- Banking a round writes one row per participant and two session columns, and a half-applied round
-- would silently corrupt the standings — so it's one definer transaction rather than N client
-- upserts. The scorekeeper-while-in-progress rule that `private.can_write_scores` enforces for
-- direct score writes is re-checked here by hand, since a definer function bypasses the policies.
create or replace function public.commit_dalmuti_round(p_session_id uuid, p_order uuid[])
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

  if (select gt.scoring_direction from public.game_templates gt where gt.id = v_session.template_id)
     <> 'dalmuti_rounds' then
    raise exception 'this game is not scored in rounds' using errcode = '22023';
  end if;

  -- The order has to be a permutation of the session's participants: a missing player would score
  -- nothing for the round, a duplicate would score twice, and neither is recoverable afterwards.
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
      private.dalmuti_round_points(v_rank, v_participants)
    )
    on conflict (session_id, user_id, field_key)
    do update set value = public.session_scores.value + excluded.value, updated_at = now();
  end loop;

  update public.sessions
  set rounds_played = rounds_played + 1, last_round_order = p_order
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

-- Reverses the round `last_round_order` describes and clears it, so undo is available exactly once
-- per banked round. Returns the order that was taken back, which is what the client re-seeds its
-- drag list from — the whole point of undoing a round is to correct that order.
create or replace function public.undo_dalmuti_round(p_session_id uuid)
returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.sessions;
  v_order uuid[];
  v_participants integer;
  v_rank integer;
begin
  select * into v_session from public.sessions where id = p_session_id for update;

  if not found then
    raise exception 'session not found' using errcode = '22023';
  end if;

  if v_session.scorekeeper_id is distinct from (select auth.uid())
     or v_session.status <> 'in_progress' then
    raise exception 'only the scorekeeper of a live session can undo a round' using errcode = '42501';
  end if;

  if v_session.last_round_order is null then
    raise exception 'there is no round left to undo' using errcode = '22023';
  end if;

  v_order := v_session.last_round_order;
  v_participants := array_length(v_order, 1);

  for v_rank in 1..v_participants loop
    update public.session_scores
    set value = value - private.dalmuti_round_points(v_rank, v_participants), updated_at = now()
    where session_id = p_session_id and user_id = v_order[v_rank] and field_key = 'points';
  end loop;

  update public.sessions
  set rounds_played = rounds_played - 1, last_round_order = null
  where id = p_session_id;

  return v_order;
end;
$$;

revoke all on function public.commit_dalmuti_round(uuid, uuid[]) from public, anon;
grant execute on function public.commit_dalmuti_round(uuid, uuid[]) to authenticated;
revoke all on function public.undo_dalmuti_round(uuid) from public, anon;
grant execute on function public.undo_dalmuti_round(uuid) to authenticated;
grant execute on function private.dalmuti_round_points(integer, integer) to authenticated;

-- Body-only change (same signature): a rounds template has no fields either, for the same reason a
-- ranked one doesn't — there's nothing to sum, only a finish order per round.
create or replace function public.create_game_template(
  p_group_id uuid,
  p_name text,
  p_scoring_direction public.scoring_direction,
  p_fields jsonb,
  p_bonus_rules jsonb default '[]'::jsonb,
  p_cover_key text default null
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

  if p_scoring_direction in ('ranked', 'dalmuti_rounds') then
    if jsonb_array_length(p_fields) > 0 then
      raise exception 'a template scored on finish order cannot have fields' using errcode = '22023';
    end if;
  elsif jsonb_array_length(p_fields) = 0 then
    raise exception 'a game template needs at least one field' using errcode = '22023';
  end if;

  insert into public.game_templates (group_id, name, scoring_direction, created_by, cover_key)
  values (p_group_id, btrim(p_name), p_scoring_direction, v_user_id, p_cover_key)
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
