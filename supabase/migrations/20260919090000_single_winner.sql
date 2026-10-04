-- Some games can only have one winner (Catan: whoever reaches 10 points on their own turn), so a tie
-- on the top total must not count as two wins. A template can opt in with `single_winner`; the
-- session then records who actually won in `winner_id`, picked by the scorekeeper once the top
-- total turns out to be shared.
--
-- `winner_id` is an override, not the source of truth: totals still decide the winner whenever the
-- top is unique, and the client only honours `winner_id` while that player is among the best
-- scorers (so correcting a score inside the edit window can't leave a stale pick standing).
alter table public.game_templates
  add column single_winner boolean not null default false;

-- Composite FK onto session_participants, the same trick session_scores uses: a winner has to have
-- played. MATCH SIMPLE (the default) skips the check while `winner_id` is null.
alter table public.sessions
  add column winner_id uuid,
  add constraint sessions_winner_is_participant
    foreign key (id, winner_id) references public.session_participants (session_id, user_id);

-- Any Catan template that already exists becomes single-winner too, whether it was created from the
-- library entry (cover_key) or typed in by hand (exact name, same match `gameKeyForTemplate` makes).
update public.game_templates
set single_winner = true
where cover_key = 'catan' or (cover_key is null and lower(btrim(name)) = 'catan');

drop function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text, boolean, integer);

create function public.create_game_template(
  p_group_id uuid,
  p_name text,
  p_scoring_direction public.scoring_direction,
  p_fields jsonb,
  p_bonus_rules jsonb default '[]'::jsonb,
  p_cover_key text default null,
  p_rounds boolean default false,
  p_round_count integer default null,
  p_single_winner boolean default false
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
    (group_id, name, scoring_direction, created_by, cover_key, rounds, round_count, single_winner)
  values
    (p_group_id, btrim(p_name), p_scoring_direction, v_user_id, p_cover_key, p_rounds, p_round_count, p_single_winner)
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

revoke all on function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text, boolean, integer, boolean) from public, anon;
grant execute on function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb, text, boolean, integer, boolean) to authenticated;
