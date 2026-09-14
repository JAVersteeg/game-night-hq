-- Defining a game touches three tables (game_templates, its fields, and optionally bonus_rules).
-- Direct RLS already lets any group member write all three individually, but a client doing three
-- separate inserts could leave a template with no fields if the second one failed. This runs them
-- as one transaction instead, the same reasoning as create_group's two-table insert.
create or replace function public.create_game_template(
  p_group_id uuid,
  p_name text,
  p_scoring_direction public.scoring_direction,
  p_fields jsonb,
  p_bonus_rules jsonb default '[]'::jsonb
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

  if jsonb_array_length(p_fields) = 0 then
    raise exception 'a game template needs at least one field' using errcode = '22023';
  end if;

  insert into public.game_templates (group_id, name, scoring_direction, created_by)
  values (p_group_id, btrim(p_name), p_scoring_direction, v_user_id)
  returning * into v_template;

  for v_field in select * from jsonb_array_elements(p_fields)
  loop
    insert into public.game_template_fields (template_id, key, label, sign, default_value, position)
    values (
      v_template.id,
      v_field->>'key',
      v_field->>'label',
      coalesce((v_field->>'sign')::smallint, 1),
      coalesce((v_field->>'default_value')::numeric, 0),
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

revoke all on function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb) from public, anon;
grant execute on function public.create_game_template(uuid, text, public.scoring_direction, jsonb, jsonb) to authenticated;
