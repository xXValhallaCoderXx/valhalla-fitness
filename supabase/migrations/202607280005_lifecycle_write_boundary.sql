-- Close the authenticated lifecycle write boundary.
--
-- Application clients retain SELECT access to their RLS-scoped rows, but all
-- lifecycle writes flow through guarded SECURITY DEFINER functions so related
-- rows, ownership checks, and optimistic versions change in one transaction.

create function public.set_session_favorite_v2(
  p_session_id uuid,
  p_favorite boolean,
  p_title text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session record;
  v_lineage_root uuid;
  v_title text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_session_id is null
    or p_favorite is null
    or char_length(coalesce(p_title, '')) > 60 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  if p_favorite then
    v_title := nullif(trim(p_title), '');
    if v_title is null then
      raise exception 'FAVORITE_TITLE_REQUIRED' using errcode = '22023';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select
    session.id,
    session.source_session_id,
    session.status,
    session.program_instance_id,
    session.prescription_snapshot
  into v_session
  from public.workout_sessions as session
  where session.id = p_session_id
    and session.user_id = v_user_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_session.program_instance_id is not null then
    raise exception 'ONLY_AD_HOC_FAVORITES' using errcode = 'P0001';
  end if;
  if v_session.status <> 'completed' then
    raise exception 'ONLY_COMPLETED_FAVORITES' using errcode = 'P0001';
  end if;
  if jsonb_typeof(v_session.prescription_snapshot) is distinct from 'object' then
    raise exception 'INVALID_SESSION_SNAPSHOT' using errcode = 'P0001';
  end if;

  -- Follow every ancestor, then clear/set across every descendant. UNION (not
  -- UNION ALL) also makes legacy cyclic data terminate safely.
  with recursive ancestors as (
    select session.id, session.source_session_id
    from public.workout_sessions as session
    where session.id = p_session_id
      and session.user_id = v_user_id

    union

    select parent.id, parent.source_session_id
    from public.workout_sessions as parent
    join ancestors as child
      on child.source_session_id = parent.id
    where parent.user_id = v_user_id
      and parent.program_instance_id is null
  )
  select ancestor.id
  into v_lineage_root
  from ancestors as ancestor
  where ancestor.source_session_id is null
  order by ancestor.id
  limit 1;

  v_lineage_root := coalesce(
    v_lineage_root,
    v_session.id
  );

  with recursive lineage as (
    select session.id
    from public.workout_sessions as session
    where session.id = v_lineage_root
      and session.user_id = v_user_id
      and session.program_instance_id is null

    union

    select child.id
    from public.workout_sessions as child
    join lineage as parent
      on child.source_session_id = parent.id
    where child.user_id = v_user_id
      and child.program_instance_id is null
  )
  update public.workout_sessions as session
  set is_favorite = false
  where session.user_id = v_user_id
    and session.is_favorite
    and session.id in (select id from lineage);

  if p_favorite then
    update public.workout_sessions
    set
      is_favorite = true,
      prescription_snapshot = jsonb_set(
        prescription_snapshot,
        '{title}',
        to_jsonb(v_title),
        true
      )
    where id = p_session_id
      and user_id = v_user_id;
  end if;

  return p_session_id;
end;
$$;

create function public.advance_program_position_v2(
  p_program_id uuid,
  p_expected_state_version integer,
  p_current_week_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_week_index integer;
  v_state_version integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_program_id is null
    or p_expected_state_version is null
    or p_expected_state_version < 0
    or p_current_week_index is null
    or p_current_week_index < 0
    or p_current_week_index > 1000000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select program.current_week_index, program.state_version
  into v_current_week_index, v_state_version
  from public.program_instances as program
  where program.id = p_program_id
    and program.user_id = v_user_id
    and program.status = 'active'
  for update;

  if not found then
    raise exception 'PROGRAM_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  -- Convergent replay: a caller that lost the response can observe that the
  -- exact target is already current without incrementing the version twice.
  if v_current_week_index = p_current_week_index then
    return jsonb_build_object(
      'programId', p_program_id,
      'currentWeekIndex', v_current_week_index,
      'stateVersion', v_state_version,
      'advanced', false
    );
  end if;

  if v_state_version <> p_expected_state_version then
    raise exception 'CONFLICT' using errcode = '40001';
  end if;
  if p_current_week_index < v_current_week_index then
    raise exception 'PROGRAM_POSITION_REGRESSION' using errcode = '22023';
  end if;

  update public.program_instances
  set
    current_week_index = p_current_week_index,
    state_version = state_version + 1
  where id = p_program_id
    and user_id = v_user_id
    and status = 'active'
  returning current_week_index, state_version
  into v_current_week_index, v_state_version;

  return jsonb_build_object(
    'programId', p_program_id,
    'currentWeekIndex', v_current_week_index,
    'stateVersion', v_state_version,
    'advanced', true
  );
end;
$$;

create function public.create_custom_program_template_v2(
  p_template jsonb,
  p_definition jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template_id text;
  v_name text;
  v_description text;
  v_days_per_week integer;
  v_progression_label text;
  v_complexity text;
  v_schema_version text;
  v_tags text[];
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_template) is distinct from 'object'
    or jsonb_typeof(p_definition) is distinct from 'object'
    or octet_length(p_template::text) > 50000
    or octet_length(p_definition::text) > 1000000
    or jsonb_typeof(p_template->'daysPerWeek') is distinct from 'number'
    or jsonb_typeof(p_template->'tags') is distinct from 'array'
    or jsonb_typeof(p_definition->'daysPerWeek') is distinct from 'number'
    or jsonb_typeof(p_definition->'requiredState') is distinct from 'array'
    or jsonb_typeof(p_definition->'sessions') is distinct from 'array'
    or jsonb_typeof(p_definition->'weeks') is distinct from 'array'
    or (
      p_definition ? 'progressionRules'
      and jsonb_typeof(p_definition->'progressionRules') is distinct from 'object'
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_template_id := p_template->>'id';
  v_name := trim(p_template->>'name');
  v_description := trim(p_template->>'description');
  v_progression_label := trim(p_template->>'progressionLabel');
  v_complexity := trim(p_template->>'complexity');
  v_schema_version := trim(p_template->>'schemaVersion');

  if nullif(v_template_id, '') is null
    or char_length(v_template_id) > 200
    or v_template_id !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]*$'
    or v_template_id not like (
      'custom-' || left(v_user_id::text, 8) || '-%'
    )
    or nullif(v_name, '') is null
    or char_length(v_name) < 3
    or char_length(v_name) > 80
    or nullif(v_description, '') is null
    or char_length(v_description) > 2000
    or nullif(v_progression_label, '') is null
    or char_length(v_progression_label) > 200
    or nullif(v_complexity, '') is null
    or char_length(v_complexity) > 100
    or nullif(v_schema_version, '') is null
    or char_length(v_schema_version) > 100
    or (p_template->>'daysPerWeek')::numeric
      <> trunc((p_template->>'daysPerWeek')::numeric)
    or (p_template->>'daysPerWeek')::numeric not between 1 and 7
    or (p_definition->>'daysPerWeek')::numeric
      <> trunc((p_definition->>'daysPerWeek')::numeric)
    or jsonb_array_length(p_template->'tags') > 20
    or jsonb_array_length(p_definition->'requiredState') > 500
    or jsonb_array_length(p_definition->'sessions') not between 1 and 20
    or jsonb_array_length(p_definition->'weeks') not between 1 and 500
    or (
      select count(*)
      from jsonb_object_keys(
        coalesce(p_definition->'progressionRules', '{}'::jsonb)
      )
    ) > 500
    or exists (
      select 1
      from jsonb_array_elements(p_template->'tags') as tag(value)
      where jsonb_typeof(tag.value) <> 'string'
        or char_length(tag.value #>> '{}') > 100
    )
    or exists (
      select 1
      from jsonb_each(
        coalesce(p_definition->'progressionRules', '{}'::jsonb)
      ) as rule(key, value)
      where char_length(rule.key) > 200
        or jsonb_typeof(rule.value) <> 'string'
        or char_length(rule.value #>> '{}') > 2000
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_days_per_week := (p_template->>'daysPerWeek')::integer;

  if p_definition->>'id' is distinct from v_template_id
    or trim(p_definition->>'name') is distinct from v_name
    or p_definition->>'schemaVersion' is distinct from v_schema_version
    or (p_definition->>'daysPerWeek')::numeric <> v_days_per_week
    or jsonb_array_length(p_definition->'sessions') <> v_days_per_week then
    raise exception 'TEMPLATE_DEFINITION_MISMATCH' using errcode = '22023';
  end if;

  select coalesce(array_agg(tag.value order by tag.ordinality), array[]::text[])
  into v_tags
  from jsonb_array_elements_text(p_template->'tags')
    with ordinality as tag(value, ordinality);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  perform 1
  from public.profiles
  where id = v_user_id
  for key share;
  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.program_templates (
    id,
    name,
    source,
    origin,
    created_by,
    description,
    days_per_week,
    progression_label,
    complexity,
    schema_version,
    tags,
    is_active
  ) values (
    v_template_id,
    v_name,
    'custom_program',
    'user_created',
    v_user_id,
    v_description,
    v_days_per_week,
    v_progression_label,
    v_complexity,
    v_schema_version,
    v_tags,
    true
  );

  insert into public.program_template_versions (
    template_id,
    version,
    definition
  ) values (
    v_template_id,
    '1',
    p_definition
  );

  return v_template_id;
end;
$$;

-- Cover both planned and performed movement lookups without truncating mature
-- workout histories before the requested movements are reached.
create index if not exists exercise_logs_user_planned_created_idx
  on public.exercise_logs(user_id, planned_movement_id, created_at desc, id desc);

create index if not exists exercise_logs_user_performed_created_idx
  on public.exercise_logs(user_id, performed_movement_id, created_at desc, id desc);

create index if not exists exercise_logs_user_session_order_idx
  on public.exercise_logs(user_id, session_id, order_index, id);

create index if not exists workout_sessions_user_program_status_scheduled_idx
  on public.workout_sessions(
    user_id,
    program_instance_id,
    status,
    scheduled_date,
    completed_at desc
  );

-- RLS-scoped reads stay available. Authenticated lifecycle writes are allowed
-- only through the guarded functions above and the earlier lifecycle RPCs.
grant select on table
  public.program_templates,
  public.program_template_versions,
  public.program_instances,
  public.program_state_values,
  public.program_movement_overrides,
  public.program_accessory_additions,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs,
  public.substitution_logs,
  public.progression_decisions,
  public.session_program_change_journal
to authenticated;

revoke insert, update, delete on table
  public.program_templates,
  public.program_template_versions,
  public.program_instances,
  public.program_state_values,
  public.program_movement_overrides,
  public.program_accessory_additions,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs,
  public.substitution_logs,
  public.progression_decisions,
  public.session_program_change_journal
from public, anon, authenticated;

-- program_anchors was retired, but fail closed if a drifted deployment still
-- has the legacy table.
do $$
begin
  if pg_catalog.to_regclass('public.program_anchors') is not null then
    execute 'revoke insert, update, delete on table public.program_anchors from public, anon, authenticated';
  end if;
end;
$$;

revoke all on function public.set_session_favorite_v2(uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function public.advance_program_position_v2(uuid, integer, integer)
  from public, anon, authenticated;
revoke all on function public.create_custom_program_template_v2(jsonb, jsonb)
  from public, anon, authenticated;

grant execute on function public.set_session_favorite_v2(uuid, boolean, text)
  to authenticated;
grant execute on function public.advance_program_position_v2(uuid, integer, integer)
  to authenticated;
grant execute on function public.create_custom_program_template_v2(jsonb, jsonb)
  to authenticated;
