-- Some fields (Catan's longest trade route, largest army) can be held by at most one participant
-- per session and are worth a fixed number of points to whoever holds it. `exclusive` marks a
-- field as this kind of single-holder toggle rather than a freely entered number; `default_value`
-- doubles as the point value awarded while held, since it was otherwise unused for such fields.
-- Enforcement itself (clearing every other participant when one is toggled on) is client-side, the
-- same trust boundary the scorekeeper already operates under for every other score entry.
alter table public.game_template_fields
  add column exclusive boolean not null default false;

-- Body-only change (same signature): p_fields already carries an `exclusive` key through, so no
-- new parameter is needed.
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

  if p_scoring_direction = 'ranked' then
    if jsonb_array_length(p_fields) > 0 then
      raise exception 'a ranked template cannot have fields' using errcode = '22023';
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
