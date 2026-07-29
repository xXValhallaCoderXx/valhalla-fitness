-- Movement substitution is exposed to the authenticated role, so every value
-- that changes durable workout history must be derived or authorized here.
-- In particular, never trust a caller-provided previous-comparable snapshot,
-- phase key, or replacement movement.

create function public.derive_previous_comparable_v2(
  p_user_id uuid,
  p_target_snapshot jsonb,
  p_target_scheduled_date date,
  p_slot_id text,
  p_planned_movement_id text,
  p_performed_movement_id text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate record;
  v_headline public.set_logs%rowtype;
  v_has_priority_set boolean;
  v_target_units text;
  v_source_units text;
  v_conversion numeric := 1;
  v_load numeric;
  v_estimated_max numeric;
  v_sets jsonb;
  v_time_zone text;
  v_load_text text;
  v_e1rm_text text;
  v_rir_text text;
  v_label text;
  v_set_type text;
begin
  if p_user_id is null
    or p_target_snapshot is null
    or jsonb_typeof(p_target_snapshot) <> 'object'
    or p_target_scheduled_date is null
    or nullif(p_slot_id, '') is null
    or nullif(p_planned_movement_id, '') is null
    or nullif(p_performed_movement_id, '') is null
    or p_role not in ('main', 'variation', 'accessory') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_target_units := case
    when p_target_snapshot->>'units' in ('kg', 'lb')
      then p_target_snapshot->>'units'
    else 'kg'
  end;

  select
    exercise.id as exercise_id,
    exercise.slot_id,
    exercise.planned_movement_id,
    exercise.role,
    session.completed_at,
    session.scheduled_date,
    session.prescription_snapshot
  into v_candidate
  from public.exercise_logs as exercise
  join public.workout_sessions as session
    on session.id = exercise.session_id
    and session.user_id = exercise.user_id
  where exercise.user_id = p_user_id
    and exercise.performed_movement_id = p_performed_movement_id
    and session.status = 'completed'
    and session.scheduled_date <= p_target_scheduled_date
    and exists (
      select 1
      from public.set_logs as completed_set
      where completed_set.user_id = p_user_id
        and completed_set.exercise_log_id = exercise.id
        and completed_set.completed
        and completed_set.actual_reps is not null
    )
  order by
    (
      case when exercise.planned_movement_id = p_planned_movement_id then 80 else 0 end
      + case when exercise.role = p_role then 20 else 0 end
      + case
          when coalesce(session.prescription_snapshot->>'templateId', '')
            = coalesce(p_target_snapshot->>'templateId', '')
          then 8
          else 0
        end
      + case when exercise.slot_id = p_slot_id then 12 else 0 end
    ) desc,
    session.scheduled_date desc,
    session.completed_at desc nulls last,
    exercise.id desc
  limit 1;

  if not found then
    return null;
  end if;

  v_source_units := case
    when v_candidate.prescription_snapshot->>'units' in ('kg', 'lb')
      then v_candidate.prescription_snapshot->>'units'
    else v_target_units
  end;
  if v_source_units = 'kg' and v_target_units = 'lb' then
    v_conversion := 2.20462262185;
  elsif v_source_units = 'lb' and v_target_units = 'kg' then
    v_conversion := 1 / 2.20462262185;
  end if;

  v_time_zone := nullif(v_candidate.prescription_snapshot->>'timeZone', '');
  if v_time_zone is not null and not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = v_time_zone
  ) then
    v_time_zone := null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'setIndex', completed_set.set_index,
        'load', case
          when completed_set.actual_load is null or completed_set.actual_load <= 0 then null
          else completed_set.actual_load * v_conversion
        end,
        'reps', completed_set.actual_reps,
        'rir', completed_set.actual_rir
      )
      order by completed_set.set_index, completed_set.id
    ),
    '[]'::jsonb
  )
  into v_sets
  from public.set_logs as completed_set
  where completed_set.user_id = p_user_id
    and completed_set.exercise_log_id = v_candidate.exercise_id
    and completed_set.completed
    and completed_set.actual_reps is not null;

  select exists (
    select 1
    from public.set_logs as priority_set
    where priority_set.user_id = p_user_id
      and priority_set.exercise_log_id = v_candidate.exercise_id
      and priority_set.completed
      and priority_set.actual_reps is not null
      and (priority_set.is_top_set or priority_set.is_amrap)
  )
  into v_has_priority_set;

  select completed_set.*
  into v_headline
  from public.set_logs as completed_set
  where completed_set.user_id = p_user_id
    and completed_set.exercise_log_id = v_candidate.exercise_id
    and completed_set.completed
    and completed_set.actual_reps is not null
    and (
      p_role <> 'main'
      or not v_has_priority_set
      or completed_set.is_top_set
      or completed_set.is_amrap
    )
  order by
    case
      when completed_set.actual_load is null or completed_set.actual_load <= 0
        then completed_set.actual_reps
      else completed_set.actual_load * (
        1 + (
          completed_set.actual_reps
          + greatest(coalesce(completed_set.actual_rir, 0), 0)
        ) / 30
      )
    end desc,
    completed_set.set_index,
    completed_set.id
  limit 1;

  if not found then
    return null;
  end if;

  v_load := case
    when v_headline.actual_load is null or v_headline.actual_load <= 0 then null
    else v_headline.actual_load * v_conversion
  end;
  v_estimated_max := case
    when v_load is null then null
    else round(
      (
        v_load * (
          1 + (
            v_headline.actual_reps
            + greatest(coalesce(v_headline.actual_rir, 0), 0)
          ) / 30
        )
      ) / 0.5
    ) * 0.5
  end;

  v_load_text := case
    when v_load is null then 'bodyweight'
    when trunc(v_load) = v_load then trunc(v_load)::text || ' ' || v_target_units
    else trim(trailing '.' from trim(trailing '0' from round(v_load, 1)::text))
      || ' ' || v_target_units
  end;
  v_e1rm_text := case
    when v_estimated_max is null or v_estimated_max = 0 then ''
    when trunc(v_estimated_max) = v_estimated_max
      then ' · e1RM ' || trunc(v_estimated_max)::text || ' ' || v_target_units
    else ' · e1RM '
      || trim(trailing '.' from trim(trailing '0' from round(v_estimated_max, 1)::text))
      || ' ' || v_target_units
  end;
  v_rir_text := case
    when v_headline.actual_rir is null then ''
    else ' @ RIR '
      || trim(trailing '.' from trim(trailing '0' from v_headline.actual_rir::text))
  end;
  v_label := 'Previous comparable: '
    || v_load_text
    || ' × '
    || v_headline.actual_reps::text
    || case when v_headline.is_amrap then '+' else '' end
    || v_rir_text
    || v_e1rm_text
    || ' · '
    || to_char(v_candidate.scheduled_date, 'Mon FMDD');
  v_set_type := case
    when v_headline.is_amrap then 'amrap'
    when v_headline.is_top_set then 'top_set'
    when v_headline.is_backoff then 'backoff'
    when p_role = 'accessory' then 'accessory'
    else 'best_set'
  end;

  return jsonb_build_object(
    'movementId', p_performed_movement_id,
    'label', v_label,
    'load', v_load,
    'reps', v_headline.actual_reps,
    'rir', v_headline.actual_rir,
    'performedAt', case
      when v_candidate.completed_at is null then v_candidate.scheduled_date::text
      else rtrim(
        rtrim(
          to_char(
            v_candidate.completed_at at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.US'
          ),
          '0'
        ),
        '.'
      ) || '+00:00'
    end,
    'workoutDate', v_candidate.scheduled_date::text,
    'timeZone', v_time_zone,
    'e1rm', v_estimated_max,
    'setType', v_set_type,
    'sets', v_sets
  );
end;
$$;

create or replace function public.substitute_session_movement_v2(
  p_session_id uuid,
  p_request_id text,
  p_expected_state_version integer,
  p_intent jsonb,
  p_exercise_log_id uuid,
  p_performed_movement_id text,
  p_reason text,
  p_note text,
  p_scope text,
  p_phase_key text,
  p_previous jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_payload_hash text;
  v_replay_version integer;
  v_session public.workout_sessions%rowtype;
  v_exercise public.exercise_logs%rowtype;
  v_source_movement public.movements%rowtype;
  v_replacement_movement public.movements%rowtype;
  v_snapshot jsonb;
  v_snapshot_movement jsonb;
  v_snapshot_movements jsonb;
  v_snapshot_match_count integer;
  v_expected_phase_key text;
  v_previous jsonb;
  v_allowed boolean := false;
begin
  if p_intent is null
    or jsonb_typeof(p_intent) <> 'object'
    or octet_length(p_intent::text) > 50000
    or nullif(p_intent->>'exerciseLogId', '') is null
    or (p_intent->>'exerciseLogId')::uuid <> p_exercise_log_id
    or p_intent->>'performedMovementId' is distinct from p_performed_movement_id
    or p_intent->>'reason' is distinct from p_reason
    or p_intent->>'scope' is distinct from p_scope
    or (p_intent->>'note') is distinct from p_note
    or nullif(trim(p_performed_movement_id), '') is null
    or char_length(p_performed_movement_id) > 200
    or p_reason not in ('equipment_missing', 'crowded_gym', 'preference', 'fatigue', 'other')
    or char_length(coalesce(p_note, '')) > 2000
    or p_scope not in ('session', 'phase_slot')
    or (p_previous is not null and octet_length(p_previous::text) > 50000) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(p_intent::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_request_id,
    'substitute_session_movement',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
  for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select *
  into v_exercise
  from public.exercise_logs
  where id = p_exercise_log_id
    and session_id = p_session_id
    and user_id = v_user_id
  for update;
  if not found then
    raise exception 'EXERCISE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_exercise.role = 'main' then
    raise exception 'MOVEMENT_SWAP_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.set_logs
    where exercise_log_id = p_exercise_log_id
      and user_id = v_user_id
      and completed
  ) then
    raise exception 'MOVEMENT_SWAP_AFTER_LOGGING' using errcode = 'P0001';
  end if;
  if v_exercise.performed_movement_id = p_performed_movement_id then
    raise exception 'MOVEMENT_ALREADY_SELECTED' using errcode = 'P0001';
  end if;

  select *
  into v_source_movement
  from public.movements
  where id = v_exercise.planned_movement_id;
  if not found then
    raise exception 'MOVEMENT_INVALID' using errcode = 'P0001';
  end if;

  select *
  into v_replacement_movement
  from public.movements
  where id = p_performed_movement_id;
  if not found then
    raise exception 'MOVEMENT_INVALID' using errcode = 'P0001';
  end if;
  if p_scope = 'phase_slot' and v_session.program_instance_id is null then
    raise exception 'SESSION_KIND_MISMATCH' using errcode = 'P0001';
  end if;

  v_snapshot := v_session.prescription_snapshot;
  select count(*)
  into v_snapshot_match_count
  from jsonb_array_elements(v_snapshot->'movements') as snapshot_movement(movement)
  where coalesce(nullif(movement->>'slotId', ''), movement->>'id') = v_exercise.slot_id;
  if v_snapshot_match_count <> 1 then
    raise exception 'SNAPSHOT_STALE' using errcode = 'P0001';
  end if;
  select movement
  into v_snapshot_movement
  from jsonb_array_elements(v_snapshot->'movements') as snapshot_movement(movement)
  where coalesce(nullif(movement->>'slotId', ''), movement->>'id') = v_exercise.slot_id;

  v_expected_phase_key := nullif(v_snapshot_movement->>'phaseKey', '');
  if v_expected_phase_key is null then
    select nullif(movement->>'phaseKey', '')
    into v_expected_phase_key
    from jsonb_array_elements(v_snapshot->'movements')
      with ordinality as snapshot_movement(movement, movement_order)
    where nullif(movement->>'phaseKey', '') is not null
    order by movement_order
    limit 1;
  end if;
  if v_expected_phase_key is null then
    v_expected_phase_key := case
      when v_snapshot->>'templateId' in (
        'old_school_wave_powerbuilding',
        'bromley-bullmastiff'
      ) then case
        when lower(coalesce(v_snapshot->>'weekLabel', '')) like 'peak%' then 'peak'
        else 'base'
      end
      else 'cycle'
    end;
  end if;
  if p_phase_key is distinct from v_expected_phase_key then
    raise exception 'PHASE_KEY_MISMATCH' using errcode = '22023';
  end if;

  if p_performed_movement_id = v_exercise.planned_movement_id then
    v_allowed := true;
  elsif not v_replacement_movement.is_competition and exists (
    select 1
    from public.movement_replacement_rules as replacement_rule
    where replacement_rule.is_active
      and replacement_rule.source_movement_id = v_exercise.planned_movement_id
      and replacement_rule.replacement_movement_id = p_performed_movement_id
      and replacement_rule.role = v_exercise.role
      and (
        replacement_rule.template_id is null
        or replacement_rule.template_id::text = v_snapshot->>'templateId'
      )
      and (
        replacement_rule.phase_key is null
        or replacement_rule.phase_key = v_expected_phase_key
      )
      and (
        replacement_rule.slot_id is null
        or replacement_rule.slot_id = v_exercise.slot_id
      )
      and case
        when p_scope = 'phase_slot' then replacement_rule.allow_phase_slot_scope
        else replacement_rule.allow_session_scope
      end
  ) then
    v_allowed := true;
  elsif v_exercise.role = 'accessory'
    and p_scope = 'session'
    and not v_replacement_movement.is_competition
    and (
      v_replacement_movement.category = v_source_movement.category
      or v_replacement_movement.variation_of is not distinct from v_source_movement.variation_of
      or v_replacement_movement.variation_of = v_source_movement.id
      or v_source_movement.variation_of = v_replacement_movement.id
    ) then
    v_allowed := true;
  end if;
  if not v_allowed then
    raise exception 'MOVEMENT_SWAP_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  -- Caller-supplied p_previous is intentionally ignored. The canonical value
  -- is reconstructed under the caller's ownership from completed set history.
  v_previous := public.derive_previous_comparable_v2(
    v_user_id,
    v_snapshot,
    v_session.scheduled_date,
    v_exercise.slot_id,
    v_exercise.planned_movement_id,
    p_performed_movement_id,
    v_exercise.role
  );

  select jsonb_agg(
    case
      when coalesce(nullif(movement->>'slotId', ''), movement->>'id') = v_exercise.slot_id
        then movement || jsonb_build_object(
          'performedMovementId', p_performed_movement_id,
          'performedMovementName', v_replacement_movement.name,
          'previous', v_previous
        )
      else movement
    end
    order by movement_order
  )
  into v_snapshot_movements
  from jsonb_array_elements(v_snapshot->'movements')
    with ordinality as snapshot_movement(movement, movement_order);

  v_snapshot := jsonb_set(v_snapshot, '{movements}', v_snapshot_movements, false);
  perform public.validate_session_snapshot_v2(v_snapshot);

  update public.exercise_logs
  set performed_movement_id = p_performed_movement_id
  where id = p_exercise_log_id
    and session_id = p_session_id
    and user_id = v_user_id;

  -- Started sessions pre-seed actual_load from the planned target. Clear that
  -- untouched weighted seed when the replacement is intrinsically bodyweight.
  if v_replacement_movement.equipment = array['bodyweight']::text[] then
    update public.set_logs
    set actual_load = null
    where exercise_log_id = p_exercise_log_id
      and user_id = v_user_id
      and not completed;
  end if;

  insert into public.substitution_logs (
    user_id,
    session_id,
    slot_id,
    planned_movement_id,
    performed_movement_id,
    reason,
    note
  ) values (
    v_user_id,
    p_session_id,
    v_exercise.slot_id,
    v_exercise.planned_movement_id,
    p_performed_movement_id,
    p_reason,
    p_note
  );

  if p_scope = 'phase_slot' then
    perform public.session_set_program_movement_override(
      p_session_id,
      v_exercise.slot_id,
      v_expected_phase_key,
      v_exercise.role,
      v_exercise.planned_movement_id,
      p_performed_movement_id,
      p_exercise_log_id,
      p_performed_movement_id = v_exercise.planned_movement_id
    );
  end if;

  return public.complete_session_mutation_v2(
    p_session_id,
    p_request_id,
    'substitute_session_movement',
    v_payload_hash,
    p_expected_state_version,
    v_snapshot
  );
end;
$$;

revoke all on function public.derive_previous_comparable_v2(
  uuid, jsonb, date, text, text, text, text
) from public, anon, authenticated;

revoke all on function public.substitute_session_movement_v2(
  uuid, text, integer, jsonb, uuid, text, text, text, text, text, jsonb
) from public, anon;

grant execute on function public.substitute_session_movement_v2(
  uuid, text, integer, jsonb, uuid, text, text, text, text, text, jsonb
) to authenticated;

-- Undo the broad fixture privileges from the preceding compatibility migration
-- and leave the local-only seed writer with exactly the verbs it uses.
revoke all on table
  public.profiles,
  public.program_instances,
  public.program_state_values,
  public.program_accessory_additions,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs,
  public.substitution_logs,
  public.progression_decisions,
  public.program_templates,
  public.program_template_versions
from service_role;

grant select on table
  public.program_templates,
  public.program_template_versions
to service_role;

grant select, insert, update on table
  public.profiles
to service_role;

grant select, insert on table
  public.program_instances,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs
to service_role;

grant insert on table
  public.program_state_values,
  public.program_accessory_additions,
  public.substitution_logs,
  public.progression_decisions
to service_role;
