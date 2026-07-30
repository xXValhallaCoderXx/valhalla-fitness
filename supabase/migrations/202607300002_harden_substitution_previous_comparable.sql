-- The substitution RPC is callable by authenticated clients even though the
-- application generates p_previous on the trusted server. Validate the whole
-- generated read-model shape so malformed direct RPC payloads cannot be
-- persisted into prescription snapshots.

create function public.validate_previous_comparable_v2(
  p_previous jsonb,
  p_performed_movement_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_set jsonb;
  v_set_index integer;
  v_set_indexes integer[] := array[]::integer[];
  v_workout_date date;
  v_has_headline_set boolean := false;
begin
  if p_previous is null
    or jsonb_typeof(p_previous) <> 'object'
    or octet_length(p_previous::text) > 50000
    or not (
      p_previous ?& array[
        'movementId',
        'label',
        'load',
        'reps',
        'rir',
        'workoutDate',
        'timeZone',
        'performedAt',
        'e1rm',
        'setType',
        'sets'
      ]
    )
    or p_previous - array[
      'movementId',
      'label',
      'load',
      'reps',
      'rir',
      'workoutDate',
      'timeZone',
      'performedAt',
      'e1rm',
      'setType',
      'sets'
    ] <> '{}'::jsonb
    or jsonb_typeof(p_previous->'movementId') <> 'string'
    or nullif(trim(p_previous->>'movementId'), '') is null
    or char_length(p_previous->>'movementId') > 200
    or p_previous->>'movementId' is distinct from p_performed_movement_id
    or jsonb_typeof(p_previous->'label') <> 'string'
    or nullif(trim(p_previous->>'label'), '') is null
    or char_length(p_previous->>'label') > 4000
    or jsonb_typeof(p_previous->'workoutDate') <> 'string'
    or (p_previous->>'workoutDate') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or jsonb_typeof(p_previous->'performedAt') <> 'string'
    or char_length(p_previous->>'performedAt') not between 10 and 64
    or (p_previous->>'performedAt') !~
      '^[0-9]{4}-[0-9]{2}-[0-9]{2}([Tt ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?([Zz]|[+-][0-9]{2}(:?[0-9]{2})?))?$'
    or jsonb_typeof(p_previous->'setType') <> 'string'
    or p_previous->>'setType' not in (
      'top_set',
      'amrap',
      'backoff',
      'best_set',
      'accessory'
    )
    or jsonb_typeof(p_previous->'sets') <> 'array'
    or jsonb_array_length(p_previous->'sets') not between 1 and 100 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  if (case
      when p_previous->'load' = 'null'::jsonb then false
      when jsonb_typeof(p_previous->'load') <> 'number' then true
      else (p_previous->>'load')::numeric not between 0 and 100000
    end)
    or (case
      when p_previous->'reps' = 'null'::jsonb then false
      when jsonb_typeof(p_previous->'reps') <> 'number' then true
      else (p_previous->>'reps')::numeric <> trunc((p_previous->>'reps')::numeric)
        or (p_previous->>'reps')::integer not between 0 and 1000
    end)
    or (case
      when p_previous->'rir' = 'null'::jsonb then false
      when jsonb_typeof(p_previous->'rir') <> 'number' then true
      else (p_previous->>'rir')::numeric not between 0 and 10
    end)
    or (case
      when p_previous->'e1rm' = 'null'::jsonb then false
      when jsonb_typeof(p_previous->'e1rm') <> 'number' then true
      else (p_previous->>'e1rm')::numeric not between 0 and 10000000
    end)
    or (case
      when p_previous->'timeZone' = 'null'::jsonb then false
      when jsonb_typeof(p_previous->'timeZone') <> 'string' then true
      else nullif(trim(p_previous->>'timeZone'), '') is null
        or char_length(p_previous->>'timeZone') > 200
        or not exists (
          select 1
          from pg_catalog.pg_timezone_names
          where name = p_previous->>'timeZone'
        )
    end) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_workout_date := (p_previous->>'workoutDate')::date;
  if v_workout_date::text <> p_previous->>'workoutDate' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  perform (p_previous->>'performedAt')::timestamptz;

  for v_set in
    select value
    from jsonb_array_elements(p_previous->'sets')
  loop
    if jsonb_typeof(v_set) <> 'object'
      or not (v_set ?& array['setIndex', 'load', 'reps', 'rir'])
      or v_set - array['setIndex', 'load', 'reps', 'rir'] <> '{}'::jsonb
      or jsonb_typeof(v_set->'setIndex') <> 'number'
      or (v_set->>'setIndex')::numeric <> trunc((v_set->>'setIndex')::numeric)
      or (v_set->>'setIndex')::integer not between 0 and 1000
      or (case
        when v_set->'load' = 'null'::jsonb then false
        when jsonb_typeof(v_set->'load') <> 'number' then true
        else (v_set->>'load')::numeric not between 0 and 100000
      end)
      or (case
        when v_set->'reps' = 'null'::jsonb then false
        when jsonb_typeof(v_set->'reps') <> 'number' then true
        else (v_set->>'reps')::numeric <> trunc((v_set->>'reps')::numeric)
          or (v_set->>'reps')::integer not between 0 and 1000
      end)
      or (case
        when v_set->'rir' = 'null'::jsonb then false
        when jsonb_typeof(v_set->'rir') <> 'number' then true
        else (v_set->>'rir')::numeric not between 0 and 10
      end) then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;

    v_set_index := (v_set->>'setIndex')::integer;
    if v_set_index = any(v_set_indexes) then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
    v_set_indexes := array_append(v_set_indexes, v_set_index);

    if v_set->'load' = p_previous->'load'
      and v_set->'reps' = p_previous->'reps'
      and v_set->'rir' = p_previous->'rir' then
      v_has_headline_set := true;
    end if;
  end loop;

  if not v_has_headline_set then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
exception
  when others then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
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
  v_performed_movement_name text;
  v_snapshot jsonb;
  v_snapshot_movements jsonb;
  v_snapshot_match_count integer;
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
    or p_scope not in ('session', 'phase_slot') then
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

  -- Phase and comparable values are derived mutation data, so validate them
  -- only after accepting an exact stable-intent replay.
  if nullif(trim(p_phase_key), '') is null
    or char_length(p_phase_key) > 200 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  if p_previous is not null then
    perform public.validate_previous_comparable_v2(
      p_previous,
      p_performed_movement_id
    );
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

  select name
  into v_performed_movement_name
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

  select jsonb_agg(
    case
      when coalesce(nullif(movement->>'slotId', ''), movement->>'id') = v_exercise.slot_id
        then movement || jsonb_build_object(
          'performedMovementId', p_performed_movement_id,
          'performedMovementName', v_performed_movement_name,
          'previous', p_previous
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
      p_phase_key,
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

revoke all on function public.validate_previous_comparable_v2(jsonb, text)
  from public, anon, authenticated;

revoke all on function public.substitute_session_movement_v2(
  uuid, text, integer, jsonb, uuid, text, text, text, text, text, jsonb
) from public, anon;

grant execute on function public.substitute_session_movement_v2(
  uuid, text, integer, jsonb, uuid, text, text, text, text, text, jsonb
) to authenticated;
