create or replace function pg_temp.template_definition_to_state(value jsonb)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
  object_key text;
  object_value jsonb;
begin
  if jsonb_typeof(value) = 'object' then
    if value->>'kind' = 'percent' and value->>'anchor' = 'training_max' then
      value := (value - 'kind' - 'anchor') || jsonb_build_object(
        'kind', 'percent_of_state',
        'stateType', 'training_max'
      );
    end if;

    result := '{}'::jsonb;
    for object_key, object_value in
      select key, val
      from jsonb_each(value) as entry(key, val)
    loop
      result := result || jsonb_build_object(
        object_key,
        pg_temp.template_definition_to_state(object_value)
      );
    end loop;
    return result;
  end if;

  if jsonb_typeof(value) = 'array' then
    select coalesce(jsonb_agg(pg_temp.template_definition_to_state(array_value) order by ordinality), '[]'::jsonb)
    into result
    from jsonb_array_elements(value) with ordinality as array_item(array_value, ordinality);
    return result;
  end if;

  return value;
end;
$$;

with source_versions as (
  select distinct on (template_id)
    template_id,
    definition
  from public.program_template_versions
  where template_id in (
    'healthy-531-fsl',
    'bromley-bullmastiff',
    'bromley-70s-powerlifter',
    'bromley-volume-intensity'
  )
    and definition ? 'requiredAnchors'
  order by template_id, created_at desc
),
state_definitions as (
  select
    template_id,
    pg_temp.template_definition_to_state(
      (definition - 'anchorType' - 'requiredAnchors') ||
      jsonb_build_object(
        'requiredState',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'key', movement_id || '_training_max',
                'movementId', movement_id,
                'type', 'training_max'
              )
              order by ordinality
            )
            from jsonb_array_elements_text(definition->'requiredAnchors') with ordinality as required(movement_id, ordinality)
          ),
          '[]'::jsonb
        )
      )
    ) as definition
  from source_versions
)
insert into public.program_template_versions (template_id, version, definition)
select
  template_id,
  '2026.06-state',
  definition
from state_definitions
on conflict (template_id, version) do update set
  definition = excluded.definition;
