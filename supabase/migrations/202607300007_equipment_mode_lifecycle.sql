-- Normalize equipment-mode choices, expose guarded lifecycle RPCs, and enforce
-- free-weight snapshots at the durable workout boundary.

create function public.resolve_program_equipment_source_v1(
  p_program_instance_id uuid,
  p_template_session_id text,
  p_slot_id text,
  p_phase_key text,
  p_role text,
  p_include_future boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program public.program_instances%rowtype;
  v_definition jsonb;
  v_slot jsonb;
  v_source_movement_id text;
begin
  select program.*
  into v_program
  from public.program_instances as program
  join public.program_template_versions as version
    on version.id = program.template_version_id
    and version.template_id = program.template_id
  where program.id = p_program_instance_id;
  if not found then
    return null;
  end if;
  select definition
  into v_definition
  from public.program_template_versions
  where id = v_program.template_version_id
    and template_id = v_program.template_id;

  select addition.movement_id
  into v_source_movement_id
  from public.program_accessory_additions as addition
  where addition.program_instance_id = p_program_instance_id
    and addition.user_id = v_program.user_id
    and addition.session_id = p_template_session_id
    and 'slot-' || addition.session_id || '-' || addition.slot_id = p_slot_id
    and addition.phase_key in ('*', p_phase_key)
    and (
      p_include_future
      or addition.effective_from_week_index <= v_program.current_week_index
    )
  order by
    (addition.phase_key = p_phase_key) desc,
    addition.effective_from_week_index desc,
    addition.id desc
  limit 1;
  if found then
    return v_source_movement_id;
  end if;

  select slot.value
  into v_slot
  from jsonb_array_elements(v_definition->'sessions') as session(value)
  cross join lateral jsonb_array_elements(session.value->'slots') as slot(value)
  where session.value->>'id' = p_template_session_id
    and 'slot-' || (session.value->>'id') || '-' || (slot.value->>'id') =
      p_slot_id
    and slot.value->>'role' = p_role
  limit 1;
  if not found then
    return null;
  end if;

  v_source_movement_id := case
    when jsonb_typeof(v_slot->'movementId') = 'string'
      then v_slot->>'movementId'
    when jsonb_typeof(v_slot->'movementId') = 'object'
      then coalesce(
        v_slot #>> array['movementId', 'byPhase', p_phase_key],
        v_slot #>> '{movementId,default}'
      )
    else null
  end;

  select override.replacement_movement_id
  into v_source_movement_id
  from public.program_movement_overrides as override
  where override.program_instance_id = p_program_instance_id
    and override.user_id = v_program.user_id
    and override.slot_id = p_slot_id
    and override.phase_key in ('*', p_phase_key)
    and override.role = p_role
    and (
      p_include_future
      or override.effective_from_week_index <= v_program.current_week_index
    )
  order by
    (override.phase_key = p_phase_key) desc,
    override.effective_from_week_index desc,
    override.id desc
  limit 1;

  return coalesce(v_source_movement_id, case
    when jsonb_typeof(v_slot->'movementId') = 'string'
      then v_slot->>'movementId'
    when jsonb_typeof(v_slot->'movementId') = 'object'
      then coalesce(
        v_slot #>> array['movementId', 'byPhase', p_phase_key],
        v_slot #>> '{movementId,default}'
      )
    else null
  end);
end;
$$;

create function public.normalize_free_weight_choices_v1(
  p_policy_version_id uuid,
  p_policy_checksum text,
  p_choices jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.equipment_mode_policy_versions%rowtype;
  v_normalized jsonb;
begin
  if p_policy_version_id is null
    or p_policy_checksum !~ '^[0-9a-f]{32}$'
    or jsonb_typeof(p_choices) is distinct from 'array'
    or jsonb_array_length(p_choices) > 1000
    or octet_length(p_choices::text) > 1000000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  select *
  into v_policy
  from public.equipment_mode_policy_versions
  where id = p_policy_version_id
    and mode = 'free_weight'
    and definition_checksum = p_policy_checksum
  for share;
  if not found then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  if jsonb_typeof(v_policy.definition->'rules') is distinct from 'array'
    or exists (
      select 1
      from jsonb_array_elements(p_choices) as choice(value)
      where jsonb_typeof(choice.value) <> 'object'
        or nullif(choice.value->>'templateSessionId', '') is null
        or char_length(choice.value->>'templateSessionId') > 200
        or nullif(choice.value->>'slotId', '') is null
        or char_length(choice.value->>'slotId') > 500
        or nullif(choice.value->>'phaseKey', '') is null
        or char_length(choice.value->>'phaseKey') > 200
        or choice.value->>'role' not in (
          'main', 'variation', 'accessory', 'warmup', 'event'
        )
        or nullif(choice.value->>'sourceMovementId', '') is null
        or char_length(choice.value->>'sourceMovementId') > 200
        or nullif(choice.value->>'replacementMovementId', '') is null
        or char_length(choice.value->>'replacementMovementId') > 200
        or nullif(choice.value->>'policyRuleId', '') is null
        or char_length(choice.value->>'policyRuleId') > 200
    )
    or exists (
      select 1
      from jsonb_array_elements(p_choices) as choice(value)
      left join public.movements as source
        on source.id = choice.value->>'sourceMovementId'
      left join public.movements as replacement
        on replacement.id = choice.value->>'replacementMovementId'
      where source.id is null
        or replacement.id is null
        or replacement.status <> 'active'
        or replacement.resistance_mode not in (
          'barbell', 'dumbbell', 'specialty_bar', 'bodyweight'
        )
    )
    or exists (
      select 1
      from jsonb_array_elements(p_choices) as choice(value)
      where not exists (
        select 1
        from jsonb_array_elements(v_policy.definition->'rules') as rule(value)
        where rule.value->>'id' = choice.value->>'policyRuleId'
          and rule.value->>'sourceMovementId' =
            choice.value->>'sourceMovementId'
          and rule.value->>'loadHandling' = 'clear'
          and jsonb_typeof(rule.value->'replacementMovementIds') = 'array'
          and exists (
            select 1
            from jsonb_array_elements_text(
              rule.value->'replacementMovementIds'
            ) as replacement_id(value)
            where replacement_id.value =
              choice.value->>'replacementMovementId'
          )
      )
    )
    or exists (
      select 1
      from jsonb_array_elements(p_choices) as choice(value)
      group by
        choice.value->>'templateSessionId',
        choice.value->>'slotId',
        choice.value->>'phaseKey',
        choice.value->>'role'
      having count(*) > 1
    ) then
    raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'templateSessionId', choice.value->>'templateSessionId',
        'slotId', choice.value->>'slotId',
        'phaseKey', choice.value->>'phaseKey',
        'role', choice.value->>'role',
        'sourceMovementId', choice.value->>'sourceMovementId',
        'replacementMovementId', choice.value->>'replacementMovementId',
        'policyRuleId', choice.value->>'policyRuleId'
      )
      order by
        choice.value->>'templateSessionId',
        choice.value->>'slotId',
        choice.value->>'phaseKey',
        choice.value->>'role',
        choice.value->>'sourceMovementId',
        choice.value->>'replacementMovementId',
        choice.value->>'policyRuleId'
    ),
    '[]'::jsonb
  )
  into v_normalized
  from jsonb_array_elements(p_choices) as choice(value);

  return v_normalized;
end;
$$;

create function public.validate_free_weight_choice_completeness_v1(
  p_program_instance_id uuid,
  p_choices jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definition jsonb;
  v_expected_count integer;
begin
  if p_program_instance_id is null
    or jsonb_typeof(p_choices) is distinct from 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  select version.definition
  into v_definition
  from public.program_instances as program
  join public.program_template_versions as version
    on version.id = program.template_version_id
    and version.template_id = program.template_id
  where program.id = p_program_instance_id;
  if not found
    or jsonb_typeof(v_definition->'sessions') is distinct from 'array'
    or jsonb_typeof(v_definition->'weeks') is distinct from 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  with phases as (
    select distinct week.value->>'phaseKey' as phase_key
    from jsonb_array_elements(v_definition->'weeks') as week(value)
    where nullif(week.value->>'phaseKey', '') is not null
  ),
  template_sources as (
    select
      session.value->>'id' as template_session_id,
      'slot-' || (session.value->>'id') || '-' || (slot.value->>'id')
        as slot_id,
      phase.phase_key,
      slot.value->>'role' as role,
      public.resolve_program_equipment_source_v1(
        p_program_instance_id,
        session.value->>'id',
        'slot-' || (session.value->>'id') || '-' || (slot.value->>'id'),
        phase.phase_key,
        slot.value->>'role',
        true
      ) as source_movement_id
    from jsonb_array_elements(v_definition->'sessions') as session(value)
    cross join lateral jsonb_array_elements(session.value->'slots') as slot(value)
    cross join phases as phase
  ),
  addition_sources as (
    select
      addition.session_id as template_session_id,
      'slot-' || addition.session_id || '-' || addition.slot_id as slot_id,
      phase.phase_key,
      'accessory'::text as role,
      addition.movement_id as source_movement_id
    from public.program_accessory_additions as addition
    join public.program_instances as program
      on program.id = addition.program_instance_id
      and program.user_id = addition.user_id
    cross join phases as phase
    where addition.program_instance_id = p_program_instance_id
      and addition.phase_key in ('*', phase.phase_key)
  ),
  all_sources as (
    select * from template_sources
    union all
    select * from addition_sources
  ),
  expected as (
    select source.*
    from all_sources as source
    left join public.movements as movement
      on movement.id = source.source_movement_id
    where movement.id is null
      or movement.status <> 'active'
      or movement.resistance_mode not in (
        'barbell', 'dumbbell', 'specialty_bar', 'bodyweight'
      )
  )
  select count(*)
  into v_expected_count
  from expected;

  if jsonb_array_length(p_choices) <> v_expected_count
    or exists (
      with phases as (
        select distinct week.value->>'phaseKey' as phase_key
        from jsonb_array_elements(v_definition->'weeks') as week(value)
        where nullif(week.value->>'phaseKey', '') is not null
      ),
      template_sources as (
        select
          session.value->>'id' as template_session_id,
          'slot-' || (session.value->>'id') || '-' || (slot.value->>'id')
            as slot_id,
          phase.phase_key,
          slot.value->>'role' as role,
          public.resolve_program_equipment_source_v1(
            p_program_instance_id,
            session.value->>'id',
            'slot-' || (session.value->>'id') || '-' || (slot.value->>'id'),
            phase.phase_key,
            slot.value->>'role',
            true
          ) as source_movement_id
        from jsonb_array_elements(v_definition->'sessions') as session(value)
        cross join lateral jsonb_array_elements(session.value->'slots') as slot(value)
        cross join phases as phase
      ),
      addition_sources as (
        select
          addition.session_id as template_session_id,
          'slot-' || addition.session_id || '-' || addition.slot_id as slot_id,
          phase.phase_key,
          'accessory'::text as role,
          addition.movement_id as source_movement_id
        from public.program_accessory_additions as addition
        cross join phases as phase
        where addition.program_instance_id = p_program_instance_id
          and addition.phase_key in ('*', phase.phase_key)
      ),
      all_sources as (
        select * from template_sources
        union all
        select * from addition_sources
      ),
      expected as (
        select source.*
        from all_sources as source
        left join public.movements as movement
          on movement.id = source.source_movement_id
        where movement.id is null
          or movement.status <> 'active'
          or movement.resistance_mode not in (
            'barbell', 'dumbbell', 'specialty_bar', 'bodyweight'
          )
      )
      select 1
      from expected
      where not exists (
        select 1
        from jsonb_array_elements(p_choices) as choice(value)
        where choice.value->>'templateSessionId' =
            expected.template_session_id
          and choice.value->>'slotId' = expected.slot_id
          and choice.value->>'phaseKey' = expected.phase_key
          and choice.value->>'role' = expected.role
          and choice.value->>'sourceMovementId' =
            expected.source_movement_id
      )
    ) then
    raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
  end if;
end;
$$;

create function public.insert_program_equipment_mode_choices_v1(
  p_user_id uuid,
  p_program_instance_id uuid,
  p_choices jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_choice jsonb;
begin
  for v_choice in
    select value from jsonb_array_elements(p_choices)
  loop
    insert into public.program_equipment_mode_choices (
      user_id,
      program_instance_id,
      equipment_mode,
      template_session_id,
      slot_id,
      phase_key,
      role,
      source_movement_id,
      replacement_movement_id,
      policy_rule_id
    ) values (
      p_user_id,
      p_program_instance_id,
      'free_weight',
      v_choice->>'templateSessionId',
      v_choice->>'slotId',
      v_choice->>'phaseKey',
      v_choice->>'role',
      v_choice->>'sourceMovementId',
      v_choice->>'replacementMovementId',
      v_choice->>'policyRuleId'
    );
  end loop;
end;
$$;

create function public.start_program_v3(
  p_request_id text,
  p_template_id text,
  p_template_version_id uuid,
  p_definition_checksum text,
  p_title text,
  p_start_date date,
  p_units text,
  p_rounding numeric,
  p_current_block_id text,
  p_state_values jsonb,
  p_movement_overrides jsonb,
  p_accessory_additions jsonb,
  p_replace_active boolean,
  p_equipment_mode text,
  p_free_weight_policy_version_id uuid,
  p_free_weight_policy_checksum text,
  p_free_weight_choices jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_program_id uuid;
  v_program public.program_instances%rowtype;
  v_choices jsonb;
  v_choices_hash text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_equipment_mode not in ('standard', 'free_weight') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  if p_equipment_mode = 'free_weight' then
    v_choices := public.normalize_free_weight_choices_v1(
      p_free_weight_policy_version_id,
      p_free_weight_policy_checksum,
      coalesce(p_free_weight_choices, '[]'::jsonb)
    );
    v_choices_hash := md5(v_choices::text);
  elsif p_free_weight_policy_version_id is not null
    or p_free_weight_policy_checksum is not null
    or (
      p_free_weight_choices is not null
      and p_free_weight_choices <> '[]'::jsonb
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  -- start_program_v2 predates equipment mode and treats its mutation key as a
  -- replay without comparing the v3-only payload. Resolve that replay before
  -- delegating so a standard programme can never be converted to free weight
  -- by reusing its original request id. The policy checksum is covered by the
  -- immutable policy id validated above; normalized choice identity is covered
  -- by its canonical hash.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );
  select *
  into v_program
  from public.program_instances
  where user_id = v_user_id
    and client_mutation_id = p_request_id
  limit 1
  for update;
  if found then
    if p_equipment_mode = 'standard' then
      if v_program.equipment_mode <> 'standard'
        or v_program.free_weight_policy_version_id is not null
        or v_program.free_weight_choices_hash is not null then
        raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '40001';
      end if;
      return v_program.id;
    end if;

    if v_program.equipment_mode <> 'free_weight'
      or v_program.free_weight_policy_version_id
        is distinct from p_free_weight_policy_version_id
      or v_program.free_weight_choices_hash is distinct from v_choices_hash then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '40001';
    end if;
    return v_program.id;
  end if;

  v_program_id := public.start_program_v2(
    p_request_id,
    p_template_id,
    p_template_version_id,
    p_definition_checksum,
    p_title,
    p_start_date,
    p_units,
    p_rounding,
    p_current_block_id,
    p_state_values,
    p_movement_overrides,
    p_accessory_additions,
    p_replace_active
  );

  select *
  into v_program
  from public.program_instances
  where id = v_program_id
    and user_id = v_user_id
  for update;

  if p_equipment_mode = 'standard' then
    if v_program.equipment_mode <> 'standard' then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '40001';
    end if;
    return v_program_id;
  end if;

  perform public.validate_free_weight_choice_completeness_v1(
    v_program_id,
    v_choices
  );

  if v_program.equipment_mode = 'free_weight' then
    if v_program.free_weight_policy_version_id
        is distinct from p_free_weight_policy_version_id
      or v_program.free_weight_choices_hash is distinct from v_choices_hash then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '40001';
    end if;
    return v_program_id;
  end if;
  if v_program.free_weight_policy_version_id is not null
    or v_program.free_weight_choices_hash is not null
    or exists (
      select 1
      from public.program_equipment_mode_choices
      where program_instance_id = v_program_id
        and user_id = v_user_id
    ) then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '40001';
  end if;

  update public.program_instances
  set
    equipment_mode = 'free_weight',
    free_weight_policy_version_id = p_free_weight_policy_version_id,
    free_weight_choices_hash = v_choices_hash
  where id = v_program_id
    and user_id = v_user_id;

  perform public.insert_program_equipment_mode_choices_v1(
    v_user_id,
    v_program_id,
    v_choices
  );
  return v_program_id;
end;
$$;

create function public.set_program_equipment_mode_v1(
  p_program_id uuid,
  p_target_mode text,
  p_expected_state_version integer,
  p_free_weight_policy_version_id uuid,
  p_free_weight_policy_checksum text,
  p_free_weight_choices jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_program public.program_instances%rowtype;
  v_policy_version_id uuid;
  v_policy_checksum text;
  v_choices jsonb;
  v_choices_hash text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_program_id is null
    or p_target_mode not in ('standard', 'free_weight')
    or p_expected_state_version is null
    or p_expected_state_version < 0 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select *
  into v_program
  from public.program_instances
  where id = p_program_id
    and user_id = v_user_id
    and status = 'active'
  for update;
  if not found then
    raise exception 'PROGRAM_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.workout_sessions
    where user_id = v_user_id
      and status = 'in_progress'
  ) then
    raise exception 'WORKOUT_IN_PROGRESS' using errcode = 'P0001';
  end if;

  if p_target_mode = 'standard' then
    if v_program.equipment_mode = 'standard' then
      return jsonb_build_object(
        'programId', p_program_id,
        'equipmentMode', 'standard',
        'stateVersion', v_program.state_version,
        'changed', false
      );
    end if;
    if v_program.state_version <> p_expected_state_version then
      raise exception 'CONFLICT' using errcode = '40001';
    end if;

    update public.program_instances
    set
      equipment_mode = 'standard',
      state_version = state_version + 1
    where id = p_program_id
      and user_id = v_user_id
    returning * into v_program;

    return jsonb_build_object(
      'programId', p_program_id,
      'equipmentMode', 'standard',
      'stateVersion', v_program.state_version,
      'changed', true
    );
  end if;

  v_policy_version_id := coalesce(
    p_free_weight_policy_version_id,
    v_program.free_weight_policy_version_id
  );
  if p_free_weight_policy_checksum is not null then
    v_policy_checksum := p_free_weight_policy_checksum;
  else
    select definition_checksum
    into v_policy_checksum
    from public.equipment_mode_policy_versions
    where id = v_policy_version_id;
  end if;
  v_choices := public.normalize_free_weight_choices_v1(
    v_policy_version_id,
    v_policy_checksum,
    coalesce(p_free_weight_choices, '[]'::jsonb)
  );
  v_choices_hash := md5(v_choices::text);
  perform public.validate_free_weight_choice_completeness_v1(
    p_program_id,
    v_choices
  );

  if v_program.equipment_mode = 'free_weight'
    and v_program.free_weight_policy_version_id = v_policy_version_id
    and v_program.free_weight_choices_hash = v_choices_hash then
    return jsonb_build_object(
      'programId', p_program_id,
      'equipmentMode', 'free_weight',
      'stateVersion', v_program.state_version,
      'changed', false
    );
  end if;
  if v_program.state_version <> p_expected_state_version then
    raise exception 'CONFLICT' using errcode = '40001';
  end if;

  delete from public.program_equipment_mode_choices
  where program_instance_id = p_program_id
    and user_id = v_user_id;
  perform public.insert_program_equipment_mode_choices_v1(
    v_user_id,
    p_program_id,
    v_choices
  );

  update public.program_instances
  set
    equipment_mode = 'free_weight',
    free_weight_policy_version_id = v_policy_version_id,
    free_weight_choices_hash = v_choices_hash,
    state_version = state_version + 1
  where id = p_program_id
    and user_id = v_user_id
  returning * into v_program;

  return jsonb_build_object(
    'programId', p_program_id,
    'equipmentMode', 'free_weight',
    'stateVersion', v_program.state_version,
    'changed', true
  );
end;
$$;

create function public.validate_program_equipment_snapshot_v1(
  p_program_instance_id uuid,
  p_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program public.program_instances%rowtype;
  v_choice public.program_equipment_mode_choices%rowtype;
  v_movement jsonb;
  v_target_movement_id text;
  v_expected_source_movement_id text;
  v_source_movement_id text;
  v_template_session_id text;
  v_slot_id text;
  v_phase_key text;
begin
  if p_program_instance_id is null
    or jsonb_typeof(p_snapshot) is distinct from 'object'
    or jsonb_typeof(p_snapshot->'movements') is distinct from 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  select *
  into v_program
  from public.program_instances
  where id = p_program_instance_id;
  if not found then
    raise exception 'PROGRAM_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  if coalesce(nullif(p_snapshot->>'equipmentMode', ''), 'standard')
      <> v_program.equipment_mode
    or (
      v_program.equipment_mode = 'free_weight'
      and p_snapshot->>'freeWeightPolicyVersionId'
        is distinct from v_program.free_weight_policy_version_id::text
    ) then
    raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
  end if;
  if v_program.equipment_mode <> 'free_weight' then
    return;
  end if;

  v_template_session_id := coalesce(
    nullif(p_snapshot->>'templateSessionId', ''),
    nullif(p_snapshot->>'id', '')
  );
  for v_movement in
    select value from jsonb_array_elements(p_snapshot->'movements')
  loop
    v_slot_id := coalesce(
      nullif(v_movement->>'slotId', ''),
      nullif(v_movement->>'id', '')
    );
    v_phase_key := nullif(v_movement->>'phaseKey', '');
    if v_slot_id is null
      or v_phase_key is null
      or v_movement->>'role' not in (
        'main', 'variation', 'accessory', 'warmup', 'event'
      ) then
      raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
    end if;

    v_target_movement_id := coalesce(
      nullif(v_movement->>'performedMovementId', ''),
      nullif(v_movement->>'movementId', '')
    );
    perform 1
    from public.movements
    where id = v_target_movement_id
      and status = 'active'
      and resistance_mode in (
        'barbell', 'dumbbell', 'specialty_bar', 'bodyweight'
      );
    if not found then
      raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
    end if;

    v_expected_source_movement_id :=
      public.resolve_program_equipment_source_v1(
        p_program_instance_id,
        v_template_session_id,
        v_slot_id,
        v_phase_key,
        v_movement->>'role',
        false
      );

    -- A newly added accessory has no current-effective durable programme
    -- source. Session-only additions remain local; phase-slot additions are
    -- persisted for the next week by add_session_accessory_v2 but must also be
    -- valid in the live session that created them. In both cases, the snapshot
    -- identity itself must already be strict free weight.
    if v_expected_source_movement_id is null then
      if coalesce((v_movement->>'isAdded')::boolean, false) is not true
        or v_movement->>'addedScope' not in ('session', 'phase_slot')
        or v_movement ? 'modeAdaptation'
        or not exists (
          select 1
          from public.movements
          where id = v_movement->>'movementId'
            and status = 'active'
            and resistance_mode in (
              'barbell', 'dumbbell', 'specialty_bar', 'bodyweight'
            )
        ) then
        raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
      end if;
      continue;
    end if;

    perform 1
    from public.movements
    where id = v_expected_source_movement_id
      and status = 'active'
      and resistance_mode in (
        'barbell', 'dumbbell', 'specialty_bar', 'bodyweight'
      );
    if found then
      if v_movement ? 'modeAdaptation'
        or v_movement->>'movementId'
          is distinct from v_expected_source_movement_id then
        raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
      end if;
      continue;
    end if;

    select *
    into v_choice
    from public.program_equipment_mode_choices as choice
    where choice.program_instance_id = p_program_instance_id
      and choice.user_id = v_program.user_id
      and choice.equipment_mode = 'free_weight'
      and choice.template_session_id = v_template_session_id
      and choice.slot_id = v_slot_id
      and choice.phase_key = v_phase_key
      and choice.role = v_movement->>'role'
      and choice.source_movement_id = v_expected_source_movement_id;
    if not found then
      raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
    end if;

    v_source_movement_id :=
      v_movement #>> '{modeAdaptation,sourceMovementId}';
    if jsonb_typeof(v_movement->'modeAdaptation') is distinct from 'object'
      or v_movement #>> '{modeAdaptation,mode}' <> 'free_weight'
      or v_movement #>> '{modeAdaptation,loadReset}' <> 'true'
      or v_source_movement_id is distinct from v_expected_source_movement_id
      or v_movement #>> '{modeAdaptation,policyRuleId}'
        is distinct from v_choice.policy_rule_id
      or v_movement->>'movementId'
        is distinct from v_choice.replacement_movement_id
      or jsonb_typeof(v_movement->'sets') is distinct from 'array'
      or exists (
        select 1
        from jsonb_array_elements(v_movement->'sets') as set_value(value)
        where (
          set_value.value->'targetLoad' is not null
          and jsonb_typeof(set_value.value->'targetLoad') <> 'null'
        )
          or (
            set_value.value->'actualLoad' is not null
            and jsonb_typeof(set_value.value->'actualLoad') <> 'null'
          )
      ) then
      raise exception 'FREE_WEIGHT_CHOICE_STALE' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

create function public.enforce_program_equipment_snapshot_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.program_instance_id is not null then
    perform public.validate_program_equipment_snapshot_v1(
      new.program_instance_id,
      new.prescription_snapshot
    );
  end if;
  return new;
end;
$$;

create trigger enforce_program_equipment_snapshot
before insert or update of program_instance_id, prescription_snapshot
on public.workout_sessions
for each row execute function public.enforce_program_equipment_snapshot_v1();

-- Phase-slot substitutions persist through program_movement_overrides. Added
-- accessories are expanded from program_accessory_additions instead, so an
-- override for an added snapshot slot is permanently unreachable. Reject that
-- mutation at the internal journal boundary before either the override or its
-- rollback journal can be written.
create function public.reject_added_slot_phase_scope_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot_id text;
begin
  if new.entity_type <> 'movement_override' then
    return new;
  end if;

  v_slot_id := new.entity_key::jsonb->>0;
  if v_slot_id is not null and exists (
    select 1
    from public.workout_sessions as session
    cross join lateral jsonb_array_elements(
      coalesce(session.prescription_snapshot->'movements', '[]'::jsonb)
    ) as movement(value)
    where session.id = new.session_id
      and session.user_id = new.user_id
      and coalesce(
        nullif(movement.value->>'slotId', ''),
        movement.value->>'id'
      ) = v_slot_id
      and movement.value->>'isAdded' = 'true'
  ) then
    raise exception 'ADDED_ACCESSORY_PHASE_SCOPE_UNSUPPORTED'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger reject_added_slot_phase_scope
before insert on public.session_program_change_journal
for each row execute function public.reject_added_slot_phase_scope_v1();

revoke all on function public.resolve_program_equipment_source_v1(
  uuid, text, text, text, text, boolean
) from public, anon, authenticated;
revoke all on function public.normalize_free_weight_choices_v1(uuid, text, jsonb)
from public, anon, authenticated;
revoke all on function public.validate_free_weight_choice_completeness_v1(
  uuid, jsonb
) from public, anon, authenticated;
revoke all on function public.insert_program_equipment_mode_choices_v1(uuid, uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.validate_program_equipment_snapshot_v1(uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.enforce_program_equipment_snapshot_v1()
from public, anon, authenticated;
revoke all on function public.reject_added_slot_phase_scope_v1()
from public, anon, authenticated;
revoke all on function public.start_program_v3(
  text, text, uuid, text, text, date, text, numeric, text, jsonb, jsonb,
  jsonb, boolean, text, uuid, text, jsonb
) from public, anon, authenticated;
revoke all on function public.set_program_equipment_mode_v1(
  uuid, text, integer, uuid, text, jsonb
) from public, anon, authenticated;

grant execute on function public.start_program_v3(
  text, text, uuid, text, text, date, text, numeric, text, jsonb, jsonb,
  jsonb, boolean, text, uuid, text, jsonb
) to authenticated;
grant execute on function public.set_program_equipment_mode_v1(
  uuid, text, integer, uuid, text, jsonb
) to authenticated;

-- Repeat the lifecycle table boundary with ALL privileges so Supabase's local
-- default REFERENCES/TRIGGER/TRUNCATE grants cannot survive a deployment.
revoke all on table
  public.program_templates,
  public.program_template_versions,
  public.program_instances,
  public.program_state_values,
  public.program_movement_overrides,
  public.program_accessory_additions,
  public.program_equipment_mode_choices,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs,
  public.substitution_logs,
  public.progression_decisions,
  public.session_program_change_journal
from public, anon, authenticated;

grant select on table
  public.program_templates,
  public.program_template_versions,
  public.program_instances,
  public.program_state_values,
  public.program_movement_overrides,
  public.program_accessory_additions,
  public.program_equipment_mode_choices,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs,
  public.substitution_logs,
  public.progression_decisions,
  public.session_program_change_journal
to authenticated;
