-- Atomic and idempotent programme/session lifecycle operations.

-- Pending recommendations must never outlive the programme they can mutate.
-- Clean up legacy drift before the guarded resolution RPC is installed.
update public.progression_decisions as decision
set
  status = 'superseded',
  resolved_at = coalesce(decision.resolved_at, now())
where decision.status = 'pending'
  and exists (
    select 1
    from public.program_instances as program
    where program.id = decision.program_instance_id
      and program.user_id = decision.user_id
      and program.status in ('archived', 'completed')
  );

create function public.start_session_v2(
  p_client_mutation_id text,
  p_program_instance_id uuid,
  p_planned_session_id text,
  p_scheduled_date date,
  p_prescription_snapshot jsonb,
  p_expected_program_version integer,
  p_source_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_session_id uuid;
  v_exercise jsonb;
  v_set jsonb;
  v_exercise_id uuid;
  v_program_state_version integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if nullif(trim(p_client_mutation_id), '') is null
    or char_length(p_client_mutation_id) > 200
    or char_length(coalesce(p_planned_session_id, '')) > 200
    or p_scheduled_date is null
    or p_prescription_snapshot is null
    or octet_length(p_prescription_snapshot::text) > 1000000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if jsonb_typeof(p_prescription_snapshot->'movements') is distinct from 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if jsonb_array_length(p_prescription_snapshot->'movements') > 100 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select id
  into v_existing_id
  from public.workout_sessions
  where user_id = v_user_id
    and client_mutation_id = p_client_mutation_id
  limit 1;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select id
  into v_existing_id
  from public.workout_sessions
  where user_id = v_user_id
    and status = 'in_progress'
  order by started_at desc nulls last
  limit 1
  for update;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  if p_program_instance_id is not null then
    select state_version
    into v_program_state_version
    from public.program_instances
    where id = p_program_instance_id
      and user_id = v_user_id
      and status = 'active'
    for update;
    if not found then
      raise exception 'PROGRAM_NOT_ACTIVE' using errcode = 'P0001';
    end if;
    if p_expected_program_version is null
      or v_program_state_version <> p_expected_program_version then
      raise exception 'CONFLICT' using errcode = '40001';
    end if;
    if nullif(trim(p_planned_session_id), '') is null then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
    if p_source_session_id is not null
      or jsonb_array_length(p_prescription_snapshot->'movements') = 0 then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
    if exists (
      select 1
      from public.progression_decisions
      where user_id = v_user_id
        and program_instance_id = p_program_instance_id
        and status = 'pending'
    ) then
      raise exception 'PENDING_PROGRESSION_DECISIONS' using errcode = 'P0001';
    end if;
  elsif p_planned_session_id is not null
    or p_expected_program_version is not null then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  if p_source_session_id is not null then
    perform 1
    from public.workout_sessions
    where id = p_source_session_id
      and user_id = v_user_id
      and program_instance_id is null;
    if not found then
      raise exception 'SOURCE_SESSION_INVALID' using errcode = 'P0001';
    end if;
  end if;

  insert into public.workout_sessions (
    user_id,
    program_instance_id,
    planned_session_id,
    source_session_id,
    status,
    scheduled_date,
    started_at,
    prescription_snapshot,
    client_mutation_id,
    discard_journal_version
  ) values (
    v_user_id,
    p_program_instance_id,
    p_planned_session_id,
    p_source_session_id,
    'in_progress',
    p_scheduled_date,
    now(),
    p_prescription_snapshot,
    p_client_mutation_id,
    1
  )
  returning id into v_session_id;

  for v_exercise in
    select value
    from jsonb_array_elements(p_prescription_snapshot->'movements')
  loop
    if jsonb_typeof(v_exercise->'sets') is distinct from 'array' then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
    if jsonb_array_length(v_exercise->'sets') > 100 then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;

    insert into public.exercise_logs (
      user_id,
      session_id,
      slot_id,
      planned_movement_id,
      performed_movement_id,
      role,
      order_index,
      target_summary
    ) values (
      v_user_id,
      v_session_id,
      coalesce(nullif(v_exercise->>'slotId', ''), v_exercise->>'id'),
      v_exercise->>'movementId',
      coalesce(nullif(v_exercise->>'performedMovementId', ''), v_exercise->>'movementId'),
      v_exercise->>'role',
      coalesce((v_exercise->>'orderIndex')::integer, 0),
      coalesce(v_exercise->>'targetSummary', '')
    )
    returning id into v_exercise_id;

    for v_set in
      select value
      from jsonb_array_elements(v_exercise->'sets')
    loop
      insert into public.set_logs (
        user_id,
        exercise_log_id,
        set_index,
        target_load,
        target_reps,
        target_rep_min,
        target_rep_max,
        target_rpe,
        target_rir,
        actual_load,
        actual_reps,
        actual_rpe,
        actual_rir,
        completed,
        is_top_set,
        is_amrap,
        is_backoff,
        note
      ) values (
        v_user_id,
        v_exercise_id,
        (v_set->>'setIndex')::integer,
        (v_set->>'targetLoad')::numeric,
        (v_set->>'targetReps')::integer,
        (v_set->>'targetRepMin')::integer,
        (v_set->>'targetRepMax')::integer,
        (v_set->>'targetRpe')::numeric,
        (v_set->>'targetRir')::numeric,
        (v_set->>'actualLoad')::numeric,
        (v_set->>'actualReps')::integer,
        (v_set->>'actualRpe')::numeric,
        (v_set->>'actualRir')::numeric,
        coalesce((v_set->>'completed')::boolean, false),
        coalesce((v_set->>'isTopSet')::boolean, false),
        coalesce((v_set->>'isAmrap')::boolean, false),
        coalesce((v_set->>'isBackoff')::boolean, false),
        v_set->>'note'
      );
    end loop;
  end loop;

  return v_session_id;
end;
$$;

create function public.start_ad_hoc_session_v2(
  p_client_mutation_id text,
  p_scheduled_date date,
  p_prescription_snapshot jsonb,
  p_source_session_id uuid default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.start_session_v2(
    p_client_mutation_id,
    null,
    null,
    p_scheduled_date,
    p_prescription_snapshot,
    null,
    p_source_session_id
  );
$$;

create function public.finish_session_v2(
  p_session_id uuid,
  p_request_id text,
  p_notes text,
  p_session_rpe integer,
  p_reflection_win text,
  p_reflection_improve text,
  p_prs jsonb,
  p_decisions jsonb,
  p_expected_program_version integer,
  p_expected_session_version integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_program public.program_instances%rowtype;
  v_decision jsonb;
  v_payload_hash text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if nullif(trim(p_request_id), '') is null
    or char_length(p_request_id) > 200
    or char_length(coalesce(p_notes, '')) > 2000
    or char_length(coalesce(p_reflection_win, '')) > 2000
    or char_length(coalesce(p_reflection_improve, '')) > 2000
    or p_expected_session_version is null
    or p_expected_session_version < 0
    or (p_session_rpe is not null and p_session_rpe not between 1 and 10) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if p_prs is not null and jsonb_typeof(p_prs) <> 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if p_decisions is not null and jsonb_typeof(p_decisions) <> 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_decisions, '[]'::jsonb)) > 500 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_prs, '[]'::jsonb)) > 500
    or octet_length(coalesce(p_prs, '[]'::jsonb)::text) > 1000000
    or octet_length(coalesce(p_decisions, '[]'::jsonb)::text) > 1000000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(jsonb_build_object(
    'notes', p_notes,
    'sessionRpe', p_session_rpe,
    'reflectionWin', p_reflection_win,
    'reflectionImprove', p_reflection_improve
  )::text);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_session.status = 'completed' then
    if v_session.finish_request_id = p_request_id
      and v_session.finish_payload_hash = v_payload_hash then
      return v_session.id;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '40001';
  end if;
  if v_session.status <> 'in_progress' then
    raise exception 'SESSION_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if v_session.state_version <> p_expected_session_version then
    raise exception 'CONFLICT' using errcode = '40001';
  end if;

  if v_session.program_instance_id is not null then
    select *
    into v_program
    from public.program_instances
    where id = v_session.program_instance_id
      and user_id = v_user_id
      and status = 'active'
    for update;
    if not found then
      raise exception 'PROGRAM_NOT_ACTIVE' using errcode = 'P0001';
    end if;
    if p_expected_program_version is null
      or v_program.state_version <> p_expected_program_version then
      raise exception 'CONFLICT' using errcode = '40001';
    end if;
  else
    if p_expected_program_version is not null
      or coalesce(jsonb_array_length(coalesce(p_decisions, '[]'::jsonb)), 0) > 0 then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
  end if;

  update public.workout_sessions
  set
    status = 'completed',
    completed_at = now(),
    notes = p_notes,
    session_rpe = p_session_rpe,
    reflection_win = p_reflection_win,
    reflection_improve = p_reflection_improve,
    prs = case
      when p_prs is null or p_prs = '[]'::jsonb then null
      else p_prs
    end,
    finish_request_id = p_request_id,
    finish_payload_hash = v_payload_hash,
    state_version = state_version + 1
  where id = p_session_id
    and user_id = v_user_id;

  if v_session.program_instance_id is not null then
    update public.program_instances
    set
      current_week_index = current_week_index + 1,
      state_version = state_version + 1
    where id = v_session.program_instance_id
      and user_id = v_user_id;

    for v_decision in
      select value
      from jsonb_array_elements(coalesce(p_decisions, '[]'::jsonb))
    loop
      insert into public.progression_decisions (
        user_id,
        program_instance_id,
        movement_id,
        rule_id,
        scope,
        status,
        input_summary,
        recommendation,
        state_key,
        state_type,
        previous_value,
        recommended_value
      ) values (
        v_user_id,
        v_session.program_instance_id,
        v_decision->>'movementId',
        v_decision->>'ruleId',
        v_decision->>'scope',
        'pending',
        v_decision->>'inputSummary',
        v_decision->>'recommendation',
        v_decision->>'stateKey',
        v_decision->>'stateType',
        (v_decision->>'previousValue')::numeric,
        (v_decision->>'recommendedValue')::numeric
      );
    end loop;
  end if;

  return p_session_id;
end;
$$;

create function public.resolve_progression_decisions_v2(
  p_decision_ids uuid[],
  p_action text,
  p_request_id text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_decision public.progression_decisions%rowtype;
  v_program_id uuid;
  v_count integer := 0;
  v_changed integer := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_action not in ('accepted', 'dismissed')
    or coalesce(array_length(p_decision_ids, 1), 0) = 0
    or coalesce(array_length(p_decision_ids, 1), 0) > 500
    or coalesce(array_length(p_decision_ids, 1), 0) <> (
      select count(distinct requested.decision_id)
      from unnest(p_decision_ids) as requested(decision_id)
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if nullif(trim(p_request_id), '') is null
    or char_length(p_request_id) > 200 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  for v_decision in
    select *
    from public.progression_decisions
    where id = any(p_decision_ids)
      and user_id = v_user_id
    order by id
    for update
  loop
    if v_program_id is null then
      v_program_id := v_decision.program_instance_id;
      perform 1
      from public.program_instances
      where id = v_program_id
        and user_id = v_user_id
        and status = 'active'
      for update;
      if not found then
        raise exception 'PROGRAM_NOT_FOUND' using errcode = 'P0001';
      end if;
    elsif v_decision.program_instance_id <> v_program_id then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;

    if v_decision.status = p_action then
      v_count := v_count + 1;
      continue;
    end if;
    if v_decision.status <> 'pending' then
      raise exception 'CONFLICT' using errcode = '40001';
    end if;

    if p_action = 'accepted'
      and v_decision.recommended_value is not null
      and v_decision.state_key is not null then
      update public.program_state_values
      set value = v_decision.recommended_value
      where user_id = v_user_id
        and program_instance_id = v_decision.program_instance_id
        and key = v_decision.state_key;
      if not found then
        raise exception 'PROGRAM_STATE_NOT_FOUND' using errcode = 'P0001';
      end if;
    end if;

    update public.progression_decisions
    set
      status = p_action,
      resolved_at = now(),
      resolution_request_id = p_request_id
    where id = v_decision.id
      and user_id = v_user_id;
    v_count := v_count + 1;
    v_changed := v_changed + 1;
  end loop;

  if v_count <> coalesce(array_length(p_decision_ids, 1), 0) then
    raise exception 'DECISION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_changed > 0 then
    update public.program_instances
    set state_version = state_version + 1
    where id = v_program_id
      and user_id = v_user_id;
  end if;

  return v_count;
end;
$$;

create function public.start_program_v2(
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
  p_replace_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_program_id uuid;
  v_active_session record;
  v_state jsonb;
  v_override jsonb;
  v_addition jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if nullif(trim(p_request_id), '') is null
    or char_length(p_request_id) > 200
    or nullif(trim(p_title), '') is null
    or char_length(p_title) > 200
    or p_start_date is null
    or p_units is null
    or p_units not in ('kg', 'lb')
    or p_rounding is null
    or p_rounding <= 0
    or p_rounding > 1000
    or char_length(p_template_id) > 200
    or p_definition_checksum !~ '^[0-9a-f]{32}$'
    or char_length(coalesce(p_current_block_id, '')) > 200
    or octet_length(coalesce(p_state_values, '[]'::jsonb)::text) > 1000000
    or octet_length(coalesce(p_movement_overrides, '[]'::jsonb)::text) > 1000000
    or octet_length(coalesce(p_accessory_additions, '[]'::jsonb)::text) > 1000000
    or jsonb_typeof(coalesce(p_state_values, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_movement_overrides, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_accessory_additions, '[]'::jsonb)) <> 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_state_values, '[]'::jsonb)) > 500
    or jsonb_array_length(coalesce(p_movement_overrides, '[]'::jsonb)) > 500
    or jsonb_array_length(coalesce(p_accessory_additions, '[]'::jsonb)) > 500 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select id
  into v_existing_id
  from public.program_instances
  where user_id = v_user_id
    and client_mutation_id = p_request_id
  limit 1;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  perform 1
  from public.program_templates as template
  join public.program_template_versions as version
    on version.template_id = template.id
  where template.id = p_template_id
    and version.id = p_template_version_id
    and version.definition_checksum = p_definition_checksum
    and template.is_active = true
    and (template.created_by is null or template.created_by = v_user_id)
  for share of template, version;
  if not found then
    raise exception 'TEMPLATE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if (
    exists (
      select 1 from public.program_instances
      where user_id = v_user_id and status = 'active'
    )
    or exists (
      select 1 from public.workout_sessions
      where user_id = v_user_id and status = 'in_progress'
    )
  ) and not p_replace_active then
    raise exception 'ACTIVE_PROGRAM_EXISTS' using errcode = 'P0001';
  end if;

  if p_replace_active then
    for v_active_session in
      select id
      from public.workout_sessions
      where user_id = v_user_id
        and status = 'in_progress'
      order by id
      for update
    loop
      perform public.discard_workout_session(v_active_session.id);
    end loop;

    update public.progression_decisions as decision
    set
      status = 'superseded',
      resolved_at = coalesce(decision.resolved_at, now())
    where decision.user_id = v_user_id
      and decision.status = 'pending'
      and exists (
        select 1
        from public.program_instances as program
        where program.id = decision.program_instance_id
          and program.user_id = v_user_id
          and program.status = 'active'
      );

    update public.program_instances
    set status = 'archived'
    where user_id = v_user_id
      and status = 'active';
  end if;

  insert into public.program_instances (
    user_id,
    template_id,
    template_version_id,
    title,
    start_date,
    units,
    rounding,
    current_block_id,
    current_week_index,
    customization_status,
    customization_summary,
    client_mutation_id,
    state_version
  ) values (
    v_user_id,
    p_template_id,
    p_template_version_id,
    p_title,
    p_start_date,
    p_units,
    p_rounding,
    p_current_block_id,
    0,
    case
      when jsonb_array_length(coalesce(p_movement_overrides, '[]'::jsonb)) > 0
        or jsonb_array_length(coalesce(p_accessory_additions, '[]'::jsonb)) > 0
      then 'customized'
      else 'default'
    end,
    jsonb_build_object(
      'movementOverrideCount', jsonb_array_length(coalesce(p_movement_overrides, '[]'::jsonb)),
      'accessoryAdditionCount', jsonb_array_length(coalesce(p_accessory_additions, '[]'::jsonb))
    ),
    p_request_id,
    0
  )
  returning id into v_program_id;

  for v_state in
    select value from jsonb_array_elements(coalesce(p_state_values, '[]'::jsonb))
  loop
    insert into public.program_state_values (
      user_id,
      program_instance_id,
      key,
      movement_id,
      state_type,
      label,
      value,
      unit,
      metadata
    ) values (
      v_user_id,
      v_program_id,
      v_state->>'key',
      v_state->>'movementId',
      v_state->>'type',
      v_state->>'label',
      (v_state->>'value')::numeric,
      coalesce(v_state->>'unit', p_units),
      coalesce(v_state->'metadata', '{"source":"setup"}'::jsonb)
    );
  end loop;

  for v_override in
    select value from jsonb_array_elements(coalesce(p_movement_overrides, '[]'::jsonb))
  loop
    insert into public.program_movement_overrides (
      user_id,
      program_instance_id,
      slot_id,
      phase_key,
      role,
      original_movement_id,
      replacement_movement_id,
      effective_from_week_index
    ) values (
      v_user_id,
      v_program_id,
      v_override->>'slotId',
      v_override->>'phaseKey',
      v_override->>'role',
      v_override->>'originalMovementId',
      v_override->>'replacementMovementId',
      coalesce((v_override->>'effectiveFromWeekIndex')::integer, 0)
    );
  end loop;

  for v_addition in
    select value from jsonb_array_elements(coalesce(p_accessory_additions, '[]'::jsonb))
  loop
    insert into public.program_accessory_additions (
      user_id,
      program_instance_id,
      session_id,
      slot_id,
      phase_key,
      movement_id,
      prescription_id,
      source_slot_id,
      effective_from_week_index,
      order_index
    ) values (
      v_user_id,
      v_program_id,
      v_addition->>'sessionId',
      v_addition->>'slotId',
      v_addition->>'phaseKey',
      v_addition->>'movementId',
      v_addition->>'prescriptionId',
      v_addition->>'sourceSlotId',
      coalesce((v_addition->>'effectiveFromWeekIndex')::integer, 0),
      (v_addition->>'orderIndex')::integer
    );
  end loop;

  return v_program_id;
end;
$$;

revoke all on function public.start_session_v2(text, uuid, text, date, jsonb, integer, uuid)
  from public, anon;
revoke all on function public.start_ad_hoc_session_v2(text, date, jsonb, uuid)
  from public, anon;
revoke all on function public.finish_session_v2(uuid, text, text, integer, text, text, jsonb, jsonb, integer, integer)
  from public, anon;
revoke all on function public.resolve_progression_decisions_v2(uuid[], text, text)
  from public, anon;
revoke all on function public.start_program_v2(text, text, uuid, text, text, date, text, numeric, text, jsonb, jsonb, jsonb, boolean)
  from public, anon;

grant execute on function public.start_session_v2(text, uuid, text, date, jsonb, integer, uuid)
  to authenticated;
grant execute on function public.start_ad_hoc_session_v2(text, date, jsonb, uuid)
  to authenticated;
grant execute on function public.finish_session_v2(uuid, text, text, integer, text, text, jsonb, jsonb, integer, integer)
  to authenticated;
grant execute on function public.resolve_progression_decisions_v2(uuid[], text, text)
  to authenticated;
grant execute on function public.start_program_v2(text, text, uuid, text, text, date, text, numeric, text, jsonb, jsonb, jsonb, boolean)
  to authenticated;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Future
-- migrations must opt functions into client execution explicitly.
alter default privileges in schema public
  revoke execute on functions from public, anon;
