-- A finished session stays correctable by its scorekeeper for 2 hours after `completed_at` — long
-- enough to fix a fat-fingered score once everyone's back home and someone points it out, without
-- reopening the session indefinitely. Mirrors the grace window `can_write_session_notes` already
-- gave everyone for notes; this one is scores-only and scorekeeper-only, matching who could write
-- scores at all before the session finished.
--
-- Deliberately narrow: the participant list, the scorekeeper, and the rounds structure (round
-- count, template) all stay locked the moment a session completes. Only session_scores, and the
-- round RPCs that write it, get the extra window.

-- `can_write_scores` used to also gate session_participants writes, since both were "scorekeeper of
-- a live session". Widening it below would have widened participant edits too, which isn't wanted,
-- so participants get their own copy of the old, unwidened rule first. No explicit grant needed,
-- same as `can_write_session_notes`: schema `private` already has USAGE granted to `authenticated`
-- (rls_helpers.sql), and a new function is EXECUTE-able by PUBLIC unless revoked.
create or replace function private.can_write_participants(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and s.scorekeeper_id = (select auth.uid())
      and s.status = 'in_progress'
  );
$$;

drop policy session_participants_insert on public.session_participants;
create policy session_participants_insert on public.session_participants for insert to authenticated
  with check (private.can_write_participants(session_id));

drop policy session_participants_delete on public.session_participants;
create policy session_participants_delete on public.session_participants for delete to authenticated
  using (private.can_write_participants(session_id));

-- The widened rule: still in progress, or completed within the last 2 hours. Used by the
-- session_scores policies (unchanged, still call `can_write_scores`) and, via `create or replace`,
-- by every round RPC below that used to inline the old "scorekeeper and in_progress" check.
create or replace function private.can_write_scores(p_session_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and s.scorekeeper_id = (select auth.uid())
      and (
        s.status = 'in_progress'
        or (s.status = 'completed' and now() <= s.completed_at + interval '2 hours')
      )
  );
$$;

-- Round RPCs below: bodies are unchanged from `generic_rounds`, only the scorekeeper/status guard
-- is swapped for the shared predicate above. Undoing a round on a completed session leaves `status`
-- at 'completed' — it's a correction, not a reopen — so the scorekeeper is expected to re-commit
-- the corrected round with commit_ranked_round/commit_field_round before the window closes;
-- nothing here extends the window to compensate for time spent mid-correction.
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

  if not private.can_write_scores(p_session_id) then
    raise exception 'only the scorekeeper can score a round, and only while the session is live or within its edit window' using errcode = '42501';
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

  if not private.can_write_scores(p_session_id) then
    raise exception 'only the scorekeeper can score a round, and only while the session is live or within its edit window' using errcode = '42501';
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

  if not private.can_write_scores(p_session_id) then
    raise exception 'only the scorekeeper can undo a round, and only while the session is live or within its edit window' using errcode = '42501';
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
