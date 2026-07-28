-- Atomic, versioned, and durably idempotent in-workout mutations.
--
-- Every public RPC in this migration follows the same protocol:
--   1. lock the caller-owned in-progress workout;
--   2. accept an exact receipt replay before checking the stale version;
--   3. reject request-token reuse for a different session/kind/payload;
--   4. apply all child, snapshot, and future-program journal writes;
--   5. increment workout_sessions.state_version exactly once and record it.
--
-- Structural hashes contain only stable caller intent. Generated slots,
-- snapshots, orders, and future-program rows are validated only after claim so
-- a delayed exact replay can succeed even after later state changes.
--
-- The helpers are SECURITY DEFINER only so receipt internals stay private.

create index if not exists exercise_logs_user_created_idx
  on public.exercise_logs(user_id, created_at desc);

create index if not exists substitution_logs_user_session_created_idx
  on public.substitution_logs(user_id, session_id, created_at desc);

create function public.validate_session_snapshot_v2(p_snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movement jsonb;
  v_set jsonb;
begin
  if p_snapshot is null
    or jsonb_typeof(p_snapshot) <> 'object'
    or octet_length(p_snapshot::text) > 1000000
    or jsonb_typeof(p_snapshot->'movements') is distinct from 'array'
    or jsonb_array_length(p_snapshot->'movements') > 100 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  if jsonb_array_length(p_snapshot->'movements') <> (
    select count(distinct coalesce(nullif(value->>'slotId', ''), nullif(value->>'id', '')))
    from jsonb_array_elements(p_snapshot->'movements')
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  for v_movement in
    select value from jsonb_array_elements(p_snapshot->'movements')
  loop
    if jsonb_typeof(v_movement) <> 'object'
      or nullif(coalesce(v_movement->>'slotId', v_movement->>'id'), '') is null
      or char_length(coalesce(v_movement->>'slotId', v_movement->>'id')) > 500
      or nullif(v_movement->>'movementId', '') is null
      or char_length(v_movement->>'movementId') > 200
      or jsonb_typeof(v_movement->'orderIndex') is distinct from 'number'
      or (v_movement->>'orderIndex')::numeric <> trunc((v_movement->>'orderIndex')::numeric)
      or (v_movement->>'orderIndex')::integer not between 0 and 1000
      or jsonb_typeof(v_movement->'sets') is distinct from 'array'
      or jsonb_array_length(v_movement->'sets') > 100 then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;

    if jsonb_array_length(v_movement->'sets') <> (
      select count(distinct (value->>'setIndex')::integer)
      from jsonb_array_elements(v_movement->'sets')
      where jsonb_typeof(value) = 'object'
        and jsonb_typeof(value->'setIndex') = 'number'
    ) then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;

    for v_set in select value from jsonb_array_elements(v_movement->'sets')
    loop
      if jsonb_typeof(v_set) <> 'object'
        or jsonb_typeof(v_set->'setIndex') is distinct from 'number'
        or (v_set->>'setIndex')::numeric <> trunc((v_set->>'setIndex')::numeric)
        or (v_set->>'setIndex')::integer not between 0 and 1000 then
        raise exception 'VALIDATION_FAILED' using errcode = '22023';
      end if;
    end loop;
  end loop;
end;
$$;

create function public.validate_session_sets_v2(p_sets jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_set jsonb;
begin
  if p_sets is null
    or jsonb_typeof(p_sets) <> 'array'
    or jsonb_array_length(p_sets) > 100
    or octet_length(p_sets::text) > 250000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  if jsonb_array_length(p_sets) <> (
    select count(distinct (value->>'setIndex')::integer)
    from jsonb_array_elements(p_sets)
    where jsonb_typeof(value) = 'object'
      and jsonb_typeof(value->'setIndex') = 'number'
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  for v_set in select value from jsonb_array_elements(p_sets)
  loop
    if jsonb_typeof(v_set) <> 'object'
      or jsonb_typeof(v_set->'setIndex') is distinct from 'number'
      or (v_set->>'setIndex')::numeric <> trunc((v_set->>'setIndex')::numeric)
      or (v_set->>'setIndex')::integer not between 0 and 1000
      or (
        v_set ? 'targetLoad'
        and v_set->'targetLoad' <> 'null'::jsonb
        and (
          jsonb_typeof(v_set->'targetLoad') <> 'number'
          or (v_set->>'targetLoad')::numeric not between 0 and 100000
        )
      )
      or (
        v_set ? 'targetReps'
        and v_set->'targetReps' <> 'null'::jsonb
        and (
          jsonb_typeof(v_set->'targetReps') <> 'number'
          or (v_set->>'targetReps')::numeric <> trunc((v_set->>'targetReps')::numeric)
          or (v_set->>'targetReps')::integer not between 0 and 1000
        )
      )
      or (
        v_set ? 'targetRepMin'
        and v_set->'targetRepMin' <> 'null'::jsonb
        and (
          jsonb_typeof(v_set->'targetRepMin') <> 'number'
          or (v_set->>'targetRepMin')::numeric <> trunc((v_set->>'targetRepMin')::numeric)
          or (v_set->>'targetRepMin')::integer not between 0 and 1000
        )
      )
      or (
        v_set ? 'targetRepMax'
        and v_set->'targetRepMax' <> 'null'::jsonb
        and (
          jsonb_typeof(v_set->'targetRepMax') <> 'number'
          or (v_set->>'targetRepMax')::numeric <> trunc((v_set->>'targetRepMax')::numeric)
          or (v_set->>'targetRepMax')::integer not between 0 and 1000
        )
      )
      or (
        v_set ? 'targetRpe'
        and v_set->'targetRpe' <> 'null'::jsonb
        and (
          jsonb_typeof(v_set->'targetRpe') <> 'number'
          or (v_set->>'targetRpe')::numeric not between 0 and 10
        )
      )
      or (
        v_set ? 'targetRir'
        and v_set->'targetRir' <> 'null'::jsonb
        and (
          jsonb_typeof(v_set->'targetRir') <> 'number'
          or (v_set->>'targetRir')::numeric not between 0 and 10
        )
      ) then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create function public.claim_session_mutation_v2(
  p_session_id uuid,
  p_request_id text,
  p_mutation_kind text,
  p_payload_hash text,
  p_expected_state_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state_version integer;
  v_status text;
  v_receipt public.session_mutation_receipts%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_session_id is null
    or nullif(trim(p_request_id), '') is null
    or char_length(p_request_id) > 200
    or p_mutation_kind not in (
      'rename_session',
      'upsert_set',
      'add_session_accessory',
      'reorder_session_accessories',
      'remove_session_accessory',
      'add_ad_hoc_exercise',
      'remove_ad_hoc_exercise',
      'add_session_set',
      'substitute_session_movement'
    )
    or p_payload_hash !~ '^[0-9a-f]{32}$'
    or p_expected_state_version is null
    or p_expected_state_version < 0 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select state_version, status
  into v_state_version, v_status
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
  for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select *
  into v_receipt
  from public.session_mutation_receipts
  where user_id = v_user_id
    and request_id = p_request_id
  for update;

  if found then
    if v_receipt.session_id = p_session_id
      and v_receipt.mutation_kind = p_mutation_kind
      and v_receipt.payload_hash = p_payload_hash then
      return v_receipt.resulting_state_version;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '40001';
  end if;

  if v_status <> 'in_progress' then
    raise exception 'SESSION_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if v_state_version <> p_expected_state_version then
    raise exception 'CONFLICT' using errcode = '40001';
  end if;

  return null;
end;
$$;

create function public.complete_session_mutation_v2(
  p_session_id uuid,
  p_request_id text,
  p_mutation_kind text,
  p_payload_hash text,
  p_expected_state_version integer,
  p_next_snapshot jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_resulting_state_version integer;
begin
  update public.workout_sessions
  set
    prescription_snapshot = coalesce(p_next_snapshot, prescription_snapshot),
    state_version = state_version + 1
  where id = p_session_id
    and user_id = v_user_id
    and status = 'in_progress'
    and state_version = p_expected_state_version
  returning state_version into v_resulting_state_version;
  if not found then
    raise exception 'CONFLICT' using errcode = '40001';
  end if;

  insert into public.session_mutation_receipts (
    user_id,
    request_id,
    session_id,
    mutation_kind,
    payload_hash,
    resulting_state_version
  ) values (
    v_user_id,
    p_request_id,
    p_session_id,
    p_mutation_kind,
    p_payload_hash,
    v_resulting_state_version
  );

  return jsonb_build_object(
    'sessionId', p_session_id,
    'stateVersion', v_resulting_state_version
  );
end;
$$;

create function public.rename_session_v2(
  p_session_id uuid,
  p_title text,
  p_request_id text,
  p_expected_state_version integer
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
  v_snapshot jsonb;
begin
  if nullif(trim(p_title), '') is null or char_length(trim(p_title)) > 60 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(jsonb_build_object('title', trim(p_title))::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_request_id,
    'rename_session',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  select prescription_snapshot
  into v_snapshot
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
    and program_instance_id is null;
  if not found then
    raise exception 'SESSION_KIND_MISMATCH' using errcode = 'P0001';
  end if;

  v_snapshot := jsonb_set(v_snapshot, '{title}', to_jsonb(trim(p_title)), true);
  perform public.validate_session_snapshot_v2(v_snapshot);

  return public.complete_session_mutation_v2(
    p_session_id,
    p_request_id,
    'rename_session',
    v_payload_hash,
    p_expected_state_version,
    v_snapshot
  );
end;
$$;

-- Replace the pre-versioned overload so PostgREST never has to choose between
-- two upsert_session_set_v2 signatures.
revoke all on function public.upsert_session_set_v2(
  uuid, uuid, integer, numeric, integer, numeric, numeric, boolean, text, text
) from public, anon, authenticated;
drop function public.upsert_session_set_v2(
  uuid, uuid, integer, numeric, integer, numeric, numeric, boolean, text, text
);

create function public.upsert_session_set_v2(
  p_session_id uuid,
  p_exercise_log_id uuid,
  p_set_index integer,
  p_actual_load numeric,
  p_actual_reps integer,
  p_actual_rir numeric,
  p_actual_rpe numeric,
  p_completed boolean,
  p_note text,
  p_client_mutation_id text,
  p_expected_state_version integer
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
  v_set_id uuid;
begin
  if p_set_index is null
    or p_set_index not between 0 and 1000
    or (p_actual_load is not null and p_actual_load not between 0 and 100000)
    or (p_actual_reps is not null and p_actual_reps not between 0 and 1000)
    or (p_actual_rir is not null and p_actual_rir not between 0 and 10)
    or (p_actual_rpe is not null and p_actual_rpe not between 0 and 10)
    or char_length(coalesce(p_note, '')) > 2000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(jsonb_build_object(
    'exerciseLogId', p_exercise_log_id,
    'setIndex', p_set_index,
    'actualLoad', p_actual_load,
    'actualReps', p_actual_reps,
    'actualRir', p_actual_rir,
    'actualRpe', p_actual_rpe,
    'completed', coalesce(p_completed, false),
    'note', p_note
  )::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_client_mutation_id,
    'upsert_set',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  select set_log.id
  into v_set_id
  from public.set_logs as set_log
  join public.exercise_logs as exercise
    on exercise.id = set_log.exercise_log_id
   and exercise.user_id = set_log.user_id
  where set_log.user_id = v_user_id
    and exercise.id = p_exercise_log_id
    and exercise.session_id = p_session_id
    and set_log.set_index = p_set_index
  for update of set_log;
  if not found then
    raise exception 'SET_SESSION_MISMATCH' using errcode = 'P0001';
  end if;

  update public.set_logs
  set
    actual_load = p_actual_load,
    actual_reps = p_actual_reps,
    actual_rir = p_actual_rir,
    actual_rpe = p_actual_rpe,
    completed = coalesce(p_completed, false),
    note = p_note,
    client_mutation_id = p_client_mutation_id
  where id = v_set_id
    and user_id = v_user_id;

  return public.complete_session_mutation_v2(
    p_session_id,
    p_client_mutation_id,
    'upsert_set',
    v_payload_hash,
    p_expected_state_version
  );
end;
$$;

create function public.add_session_accessory_v2(
  p_session_id uuid,
  p_request_id text,
  p_expected_state_version integer,
  p_intent jsonb,
  p_exercise jsonb,
  p_sets jsonb,
  p_next_snapshot jsonb,
  p_future_addition jsonb
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
  v_exercise_id uuid;
  v_set jsonb;
  v_slot_id text := p_exercise->>'slotId';
  v_planned_movement_id text := p_exercise->>'plannedMovementId';
  v_performed_movement_id text := p_exercise->>'performedMovementId';
  v_role text := p_exercise->>'role';
  v_order_index integer;
  v_snapshot_movement jsonb;
begin
  if p_intent is null
    or jsonb_typeof(p_intent) <> 'object'
    or octet_length(p_intent::text) > 50000
    or nullif(p_intent->>'movementId', '') is null
    or char_length(p_intent->>'movementId') > 200
    or p_intent->>'progressionMethod' not in ('history_only', 'double_progression')
    or nullif(p_intent->>'repTarget', '') is null
    or char_length(p_intent->>'repTarget') > 20
    or p_intent->>'scope' not in ('session', 'phase_slot')
    or char_length(coalesce(p_intent->>'note', '')) > 2000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(p_intent::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_request_id,
    'add_session_accessory',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  perform public.validate_session_sets_v2(p_sets);
  perform public.validate_session_snapshot_v2(p_next_snapshot);
  if p_exercise is null
    or jsonb_typeof(p_exercise) <> 'object'
    or octet_length(p_exercise::text) > 50000
    or nullif(v_slot_id, '') is null
    or char_length(v_slot_id) > 500
    or nullif(v_planned_movement_id, '') is null
    or char_length(v_planned_movement_id) > 200
    or nullif(v_performed_movement_id, '') is null
    or char_length(v_performed_movement_id) > 200
    or v_role <> 'accessory'
    or jsonb_typeof(p_exercise->'orderIndex') is distinct from 'number'
    or (p_exercise->>'orderIndex')::numeric <> trunc((p_exercise->>'orderIndex')::numeric)
    or (p_exercise->>'orderIndex')::integer not between 0 and 1000
    or char_length(coalesce(p_exercise->>'targetSummary', '')) > 2000
    or char_length(coalesce(p_exercise->>'note', '')) > 2000
    or v_planned_movement_id <> p_intent->>'movementId'
    or (
      p_future_addition is not null
      and (
        jsonb_typeof(p_future_addition) <> 'object'
        or octet_length(p_future_addition::text) > 300000
      )
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  v_order_index := (p_exercise->>'orderIndex')::integer;

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id;

  perform 1 from public.movements
  where id = v_planned_movement_id
    and id = v_performed_movement_id
    and is_competition = false;
  if not found then
    raise exception 'MOVEMENT_INVALID' using errcode = 'P0001';
  end if;

  select value
  into v_snapshot_movement
  from jsonb_array_elements(p_next_snapshot->'movements')
  where coalesce(value->>'slotId', value->>'id') = v_slot_id
  limit 1;
  if not found
    or v_snapshot_movement->>'movementId' <> v_planned_movement_id
    or (v_snapshot_movement->>'orderIndex')::integer <> v_order_index
    or jsonb_array_length(v_snapshot_movement->'sets') <> jsonb_array_length(p_sets)
    or exists (
      select 1
      from jsonb_array_elements(p_sets) as requested_set
      where not exists (
        select 1
        from jsonb_array_elements(v_snapshot_movement->'sets') as snapshot_set
        where (snapshot_set->>'setIndex')::integer = (requested_set->>'setIndex')::integer
      )
    )
    or jsonb_array_length(p_next_snapshot->'movements') <> (
      select count(*) + 1
      from public.exercise_logs
      where session_id = p_session_id and user_id = v_user_id
    ) then
    raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
  end if;

  insert into public.exercise_logs (
    user_id,
    session_id,
    slot_id,
    planned_movement_id,
    performed_movement_id,
    role,
    order_index,
    target_summary,
    notes,
    client_mutation_id
  ) values (
    v_user_id,
    p_session_id,
    v_slot_id,
    v_planned_movement_id,
    v_performed_movement_id,
    v_role,
    v_order_index,
    coalesce(p_exercise->>'targetSummary', ''),
    p_exercise->>'note',
    p_request_id
  )
  returning id into v_exercise_id;

  for v_set in select value from jsonb_array_elements(p_sets)
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
      is_top_set,
      is_amrap,
      is_backoff
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
      coalesce(
        (v_set->>'actualLoad')::numeric,
        (v_set->>'targetLoad')::numeric
      ),
      coalesce(
        (v_set->>'actualReps')::integer,
        (v_set->>'targetReps')::integer,
        (v_set->>'targetRepMin')::integer
      ),
      coalesce((v_set->>'isTopSet')::boolean, false),
      coalesce((v_set->>'isAmrap')::boolean, false),
      coalesce((v_set->>'isBackoff')::boolean, false)
    );
  end loop;

  if p_future_addition is not null then
    if v_session.program_instance_id is null
      or p_intent->>'scope' <> 'phase_slot'
      or p_future_addition->>'movementId' <> p_intent->>'movementId'
      or p_future_addition->>'progressionMethod' <> p_intent->>'progressionMethod'
      or nullif(p_future_addition->>'templateSessionId', '') is null
      or char_length(p_future_addition->>'templateSessionId') > 200
      or nullif(p_future_addition->>'slotId', '') is null
      or char_length(p_future_addition->>'slotId') > 500
      or nullif(p_future_addition->>'phaseKey', '') is null
      or char_length(p_future_addition->>'phaseKey') > 200
      or nullif(p_future_addition->>'prescriptionId', '') is null
      or char_length(p_future_addition->>'prescriptionId') > 200
      or char_length(coalesce(p_future_addition->>'targetSummary', '')) > 2000
      or char_length(coalesce(p_future_addition->>'note', '')) > 2000
      or jsonb_typeof(p_future_addition->'effectiveFromWeekIndex') is distinct from 'number'
      or (p_future_addition->>'effectiveFromWeekIndex')::numeric <>
        trunc((p_future_addition->>'effectiveFromWeekIndex')::numeric)
      or (p_future_addition->>'effectiveFromWeekIndex')::integer not between 0 and 10000 then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
    perform public.validate_session_sets_v2(
      coalesce(p_future_addition->'sets', '[]'::jsonb)
    );
    perform public.session_insert_program_accessory_addition(
      p_session_id,
      p_future_addition->>'templateSessionId',
      p_future_addition->>'slotId',
      p_future_addition->>'phaseKey',
      p_future_addition->>'movementId',
      p_future_addition->>'prescriptionId',
      p_future_addition->>'targetSummary',
      coalesce(p_future_addition->'sets', '[]'::jsonb),
      p_future_addition->>'note',
      p_future_addition->>'progressionMethod',
      (p_future_addition->>'effectiveFromWeekIndex')::integer
    );
  elsif p_intent->>'scope' <> 'session' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  return public.complete_session_mutation_v2(
    p_session_id,
    p_request_id,
    'add_session_accessory',
    v_payload_hash,
    p_expected_state_version,
    p_next_snapshot
  );
end;
$$;

create function public.reorder_session_accessories_v2(
  p_session_id uuid,
  p_request_id text,
  p_expected_state_version integer,
  p_intent jsonb,
  p_next_snapshot jsonb,
  p_exercise_orders jsonb,
  p_future_addition_ids uuid[],
  p_future_order_indexes integer[]
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
  v_order jsonb;
  v_order_slot_id text;
begin
  if p_intent is null
    or jsonb_typeof(p_intent) <> 'object'
    or octet_length(p_intent::text) > 100000
    or jsonb_typeof(p_intent->'orderedSlotIds') is distinct from 'array'
    or jsonb_array_length(p_intent->'orderedSlotIds') > 100
    or jsonb_array_length(p_intent->'orderedSlotIds') <> (
      select count(distinct value #>> '{}')
      from jsonb_array_elements(p_intent->'orderedSlotIds')
      where jsonb_typeof(value) = 'string'
        and nullif(value #>> '{}', '') is not null
        and char_length(value #>> '{}') <= 500
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(p_intent::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_request_id,
    'reorder_session_accessories',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  perform public.validate_session_snapshot_v2(p_next_snapshot);
  if p_exercise_orders is null
    or jsonb_typeof(p_exercise_orders) <> 'array'
    or jsonb_array_length(p_exercise_orders) > 100
    or octet_length(p_exercise_orders::text) > 100000
    or coalesce(cardinality(p_future_addition_ids), 0) > 100
    or coalesce(cardinality(p_future_addition_ids), 0) <> coalesce(cardinality(p_future_order_indexes), 0)
    or coalesce(cardinality(p_future_addition_ids), 0) <> (
      select count(distinct id) from unnest(coalesce(p_future_addition_ids, '{}'::uuid[])) as id
    )
    or coalesce(cardinality(p_future_order_indexes), 0) <> (
      select count(distinct order_index)
      from unnest(coalesce(p_future_order_indexes, '{}'::integer[])) as order_index
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id;
  if v_session.program_instance_id is null
    or jsonb_array_length(p_next_snapshot->'movements') <> (
      select count(*)
      from public.exercise_logs
      where session_id = p_session_id and user_id = v_user_id
    )
    or jsonb_array_length(p_exercise_orders) <> (
      select count(*)
      from jsonb_array_elements(p_next_snapshot->'movements') as movement
      where coalesce((movement->>'isAdded')::boolean, false)
    ) then
    raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
  end if;

  if jsonb_array_length(p_exercise_orders) <> (
    select count(distinct value->>'exerciseLogId')
    from jsonb_array_elements(p_exercise_orders)
  ) or jsonb_array_length(p_exercise_orders) <> (
    select count(distinct (value->>'orderIndex')::integer)
    from jsonb_array_elements(p_exercise_orders)
    where jsonb_typeof(value->'orderIndex') = 'number'
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  for v_order in select value from jsonb_array_elements(p_exercise_orders)
  loop
    if jsonb_typeof(v_order) <> 'object'
      or nullif(v_order->>'exerciseLogId', '') is null
      or jsonb_typeof(v_order->'orderIndex') is distinct from 'number'
      or (v_order->>'orderIndex')::numeric <> trunc((v_order->>'orderIndex')::numeric)
      or (v_order->>'orderIndex')::integer not between 0 and 1000 then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;

    update public.exercise_logs
    set order_index = (v_order->>'orderIndex')::integer
    where id = (v_order->>'exerciseLogId')::uuid
      and session_id = p_session_id
      and user_id = v_user_id
      and role = 'accessory'
    returning slot_id into v_order_slot_id;
    if not found then
      raise exception 'ACCESSORY_ORDER_STALE' using errcode = 'P0001';
    end if;
    if not exists (
      select 1
      from jsonb_array_elements(p_next_snapshot->'movements') as movement
      where coalesce(movement->>'slotId', movement->>'id') = v_order_slot_id
        and coalesce((movement->>'isAdded')::boolean, false)
        and (movement->>'orderIndex')::integer = (v_order->>'orderIndex')::integer
    ) then
      raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
    end if;
  end loop;

  if coalesce(cardinality(p_future_addition_ids), 0) > 0 then
    perform public.session_reorder_program_accessory_additions(
      p_session_id,
      p_future_addition_ids,
      p_future_order_indexes
    );
  end if;

  return public.complete_session_mutation_v2(
    p_session_id,
    p_request_id,
    'reorder_session_accessories',
    v_payload_hash,
    p_expected_state_version,
    p_next_snapshot
  );
end;
$$;

create function public.remove_session_accessory_v2(
  p_session_id uuid,
  p_request_id text,
  p_expected_state_version integer,
  p_intent jsonb,
  p_exercise_log_id uuid,
  p_next_snapshot jsonb,
  p_exercise_orders jsonb,
  p_future_addition_id uuid,
  p_future_remaining_ids uuid[]
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
  v_slot_id text;
  v_order jsonb;
  v_order_slot_id text;
begin
  if p_intent is null
    or jsonb_typeof(p_intent) <> 'object'
    or octet_length(p_intent::text) > 50000
    or nullif(p_intent->>'exerciseLogId', '') is null
    or (p_intent->>'exerciseLogId')::uuid <> p_exercise_log_id
    or p_intent->>'scope' not in ('session', 'phase_slot') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(p_intent::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_request_id,
    'remove_session_accessory',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  perform public.validate_session_snapshot_v2(p_next_snapshot);
  if p_exercise_orders is null
    or jsonb_typeof(p_exercise_orders) <> 'array'
    or jsonb_array_length(p_exercise_orders) > 100
    or octet_length(p_exercise_orders::text) > 100000
    or coalesce(cardinality(p_future_remaining_ids), 0) > 100
    or coalesce(cardinality(p_future_remaining_ids), 0) <> (
      select count(distinct id)
      from unnest(coalesce(p_future_remaining_ids, '{}'::uuid[])) as id
    )
    or jsonb_array_length(p_exercise_orders) <> (
      select count(distinct value->>'exerciseLogId')
      from jsonb_array_elements(p_exercise_orders)
    )
    or jsonb_array_length(p_exercise_orders) <> (
      select count(distinct (value->>'orderIndex')::integer)
      from jsonb_array_elements(p_exercise_orders)
      where jsonb_typeof(value->'orderIndex') = 'number'
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id;
  if v_session.program_instance_id is null then
    raise exception 'SESSION_KIND_MISMATCH' using errcode = 'P0001';
  end if;

  select slot_id
  into v_slot_id
  from public.exercise_logs
  where id = p_exercise_log_id
    and session_id = p_session_id
    and user_id = v_user_id
    and role = 'accessory'
  for update;
  if not found then
    raise exception 'ACCESSORY_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(v_session.prescription_snapshot->'movements') as movement
    where coalesce(movement->>'slotId', movement->>'id') = v_slot_id
      and coalesce((movement->>'isAdded')::boolean, false)
  ) or exists (
    select 1 from jsonb_array_elements(p_next_snapshot->'movements') as movement
    where coalesce(movement->>'slotId', movement->>'id') = v_slot_id
  ) or jsonb_array_length(p_next_snapshot->'movements') <> (
    select count(*) - 1
    from public.exercise_logs
    where session_id = p_session_id and user_id = v_user_id
  ) then
    raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
  end if;

  delete from public.exercise_logs
  where id = p_exercise_log_id
    and session_id = p_session_id
    and user_id = v_user_id;

  for v_order in select value from jsonb_array_elements(p_exercise_orders)
  loop
    if jsonb_typeof(v_order) <> 'object'
      or nullif(v_order->>'exerciseLogId', '') is null
      or jsonb_typeof(v_order->'orderIndex') is distinct from 'number'
      or (v_order->>'orderIndex')::numeric <> trunc((v_order->>'orderIndex')::numeric)
      or (v_order->>'orderIndex')::integer not between 0 and 1000 then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
    update public.exercise_logs
    set order_index = (v_order->>'orderIndex')::integer
    where id = (v_order->>'exerciseLogId')::uuid
      and session_id = p_session_id
      and user_id = v_user_id
    returning slot_id into v_order_slot_id;
    if not found then
      raise exception 'ACCESSORY_ORDER_STALE' using errcode = 'P0001';
    end if;
    if not exists (
      select 1
      from jsonb_array_elements(p_next_snapshot->'movements') as movement
      where coalesce(movement->>'slotId', movement->>'id') = v_order_slot_id
        and (movement->>'orderIndex')::integer = (v_order->>'orderIndex')::integer
    ) then
      raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
    end if;
  end loop;

  if p_future_addition_id is not null then
    if p_intent->>'scope' <> 'phase_slot' then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
    perform public.session_remove_program_accessory_addition(
      p_session_id,
      p_future_addition_id,
      coalesce(p_future_remaining_ids, '{}'::uuid[])
    );
  elsif coalesce(cardinality(p_future_remaining_ids), 0) > 0
    or p_intent->>'scope' <> 'session' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  return public.complete_session_mutation_v2(
    p_session_id,
    p_request_id,
    'remove_session_accessory',
    v_payload_hash,
    p_expected_state_version,
    p_next_snapshot
  );
end;
$$;

create function public.add_ad_hoc_exercise_v2(
  p_session_id uuid,
  p_request_id text,
  p_expected_state_version integer,
  p_intent jsonb,
  p_exercise jsonb,
  p_sets jsonb,
  p_next_snapshot jsonb
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
  v_exercise_id uuid;
  v_set jsonb;
  v_slot_id text := p_exercise->>'slotId';
  v_movement_id text := p_exercise->>'movementId';
  v_role text := p_exercise->>'role';
  v_order_index integer;
  v_snapshot_movement jsonb;
begin
  if p_intent is null
    or jsonb_typeof(p_intent) <> 'object'
    or octet_length(p_intent::text) > 50000
    or nullif(p_intent->>'movementId', '') is null
    or char_length(p_intent->>'movementId') > 200 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(p_intent::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_request_id,
    'add_ad_hoc_exercise',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  perform public.validate_session_sets_v2(p_sets);
  perform public.validate_session_snapshot_v2(p_next_snapshot);
  if p_exercise is null
    or jsonb_typeof(p_exercise) <> 'object'
    or octet_length(p_exercise::text) > 50000
    or nullif(v_slot_id, '') is null
    or char_length(v_slot_id) > 500
    or nullif(v_movement_id, '') is null
    or char_length(v_movement_id) > 200
    or v_role not in ('main', 'variation', 'accessory', 'warmup', 'event')
    or v_movement_id <> p_intent->>'movementId'
    or jsonb_typeof(p_exercise->'orderIndex') is distinct from 'number'
    or (p_exercise->>'orderIndex')::numeric <> trunc((p_exercise->>'orderIndex')::numeric)
    or (p_exercise->>'orderIndex')::integer not between 0 and 1000
    or char_length(coalesce(p_exercise->>'targetSummary', '')) > 2000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  v_order_index := (p_exercise->>'orderIndex')::integer;

  perform 1
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
    and program_instance_id is null;
  if not found then
    raise exception 'SESSION_KIND_MISMATCH' using errcode = 'P0001';
  end if;

  perform 1 from public.movements where id = v_movement_id;
  if not found then
    raise exception 'MOVEMENT_INVALID' using errcode = 'P0001';
  end if;

  select value
  into v_snapshot_movement
  from jsonb_array_elements(p_next_snapshot->'movements')
  where coalesce(value->>'slotId', value->>'id') = v_slot_id
  limit 1;
  if not found
    or v_snapshot_movement->>'movementId' <> v_movement_id
    or (v_snapshot_movement->>'orderIndex')::integer <> v_order_index
    or jsonb_array_length(v_snapshot_movement->'sets') <> jsonb_array_length(p_sets)
    or exists (
      select 1
      from jsonb_array_elements(p_sets) as requested_set
      where not exists (
        select 1
        from jsonb_array_elements(v_snapshot_movement->'sets') as snapshot_set
        where (snapshot_set->>'setIndex')::integer = (requested_set->>'setIndex')::integer
      )
    )
    or jsonb_array_length(p_next_snapshot->'movements') <> (
      select count(*) + 1
      from public.exercise_logs
      where session_id = p_session_id and user_id = v_user_id
    ) then
    raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
  end if;

  insert into public.exercise_logs (
    user_id,
    session_id,
    slot_id,
    planned_movement_id,
    performed_movement_id,
    role,
    order_index,
    target_summary,
    client_mutation_id
  ) values (
    v_user_id,
    p_session_id,
    v_slot_id,
    v_movement_id,
    v_movement_id,
    v_role,
    v_order_index,
    coalesce(p_exercise->>'targetSummary', ''),
    p_request_id
  )
  returning id into v_exercise_id;

  for v_set in select value from jsonb_array_elements(p_sets)
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
      is_top_set,
      is_amrap,
      is_backoff
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
      coalesce(
        (v_set->>'actualLoad')::numeric,
        (v_set->>'targetLoad')::numeric
      ),
      coalesce(
        (v_set->>'actualReps')::integer,
        (v_set->>'targetReps')::integer,
        (v_set->>'targetRepMin')::integer
      ),
      coalesce((v_set->>'isTopSet')::boolean, false),
      coalesce((v_set->>'isAmrap')::boolean, false),
      coalesce((v_set->>'isBackoff')::boolean, false)
    );
  end loop;

  return public.complete_session_mutation_v2(
    p_session_id,
    p_request_id,
    'add_ad_hoc_exercise',
    v_payload_hash,
    p_expected_state_version,
    p_next_snapshot
  );
end;
$$;

create function public.remove_ad_hoc_exercise_v2(
  p_session_id uuid,
  p_request_id text,
  p_expected_state_version integer,
  p_intent jsonb,
  p_exercise_log_id uuid,
  p_next_snapshot jsonb,
  p_exercise_orders jsonb
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
  v_slot_id text;
  v_order jsonb;
  v_order_slot_id text;
begin
  if p_intent is null
    or jsonb_typeof(p_intent) <> 'object'
    or octet_length(p_intent::text) > 50000
    or nullif(p_intent->>'exerciseLogId', '') is null
    or (p_intent->>'exerciseLogId')::uuid <> p_exercise_log_id then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(p_intent::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_request_id,
    'remove_ad_hoc_exercise',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  perform public.validate_session_snapshot_v2(p_next_snapshot);
  if p_exercise_orders is null
    or jsonb_typeof(p_exercise_orders) <> 'array'
    or jsonb_array_length(p_exercise_orders) > 100
    or octet_length(p_exercise_orders::text) > 100000
    or jsonb_array_length(p_exercise_orders) <> (
      select count(distinct value->>'exerciseLogId')
      from jsonb_array_elements(p_exercise_orders)
    )
    or jsonb_array_length(p_exercise_orders) <> (
      select count(distinct (value->>'orderIndex')::integer)
      from jsonb_array_elements(p_exercise_orders)
      where jsonb_typeof(value->'orderIndex') = 'number'
    ) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  perform 1
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
    and program_instance_id is null;
  if not found then
    raise exception 'SESSION_KIND_MISMATCH' using errcode = 'P0001';
  end if;

  select slot_id
  into v_slot_id
  from public.exercise_logs
  where id = p_exercise_log_id
    and session_id = p_session_id
    and user_id = v_user_id
  for update;
  if not found then
    raise exception 'EXERCISE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_next_snapshot->'movements') as movement
    where coalesce(movement->>'slotId', movement->>'id') = v_slot_id
  ) or jsonb_array_length(p_next_snapshot->'movements') <> (
    select count(*) - 1
    from public.exercise_logs
    where session_id = p_session_id and user_id = v_user_id
  ) or jsonb_array_length(p_exercise_orders) <> jsonb_array_length(p_next_snapshot->'movements') then
    raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
  end if;

  delete from public.exercise_logs
  where id = p_exercise_log_id
    and session_id = p_session_id
    and user_id = v_user_id;

  for v_order in select value from jsonb_array_elements(p_exercise_orders)
  loop
    if jsonb_typeof(v_order) <> 'object'
      or nullif(v_order->>'exerciseLogId', '') is null
      or jsonb_typeof(v_order->'orderIndex') is distinct from 'number'
      or (v_order->>'orderIndex')::numeric <> trunc((v_order->>'orderIndex')::numeric)
      or (v_order->>'orderIndex')::integer not between 0 and 1000 then
      raise exception 'VALIDATION_FAILED' using errcode = '22023';
    end if;
    update public.exercise_logs
    set order_index = (v_order->>'orderIndex')::integer
    where id = (v_order->>'exerciseLogId')::uuid
      and session_id = p_session_id
      and user_id = v_user_id
    returning slot_id into v_order_slot_id;
    if not found then
      raise exception 'EXERCISE_ORDER_STALE' using errcode = 'P0001';
    end if;
    if not exists (
      select 1
      from jsonb_array_elements(p_next_snapshot->'movements') as movement
      where coalesce(movement->>'slotId', movement->>'id') = v_order_slot_id
        and (movement->>'orderIndex')::integer = (v_order->>'orderIndex')::integer
    ) then
      raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
    end if;
  end loop;

  return public.complete_session_mutation_v2(
    p_session_id,
    p_request_id,
    'remove_ad_hoc_exercise',
    v_payload_hash,
    p_expected_state_version,
    p_next_snapshot
  );
end;
$$;

create function public.add_session_set_v2(
  p_session_id uuid,
  p_request_id text,
  p_expected_state_version integer,
  p_intent jsonb,
  p_exercise_log_id uuid,
  p_set jsonb,
  p_next_snapshot jsonb
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
  v_exercise public.exercise_logs%rowtype;
  v_program_instance_id uuid;
  v_snapshot_movement jsonb;
begin
  if p_intent is null
    or jsonb_typeof(p_intent) <> 'object'
    or octet_length(p_intent::text) > 50000
    or nullif(p_intent->>'exerciseLogId', '') is null
    or (p_intent->>'exerciseLogId')::uuid <> p_exercise_log_id then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_payload_hash := md5(p_intent::text);
  v_replay_version := public.claim_session_mutation_v2(
    p_session_id,
    p_request_id,
    'add_session_set',
    v_payload_hash,
    p_expected_state_version
  );
  if v_replay_version is not null then
    return jsonb_build_object('sessionId', p_session_id, 'stateVersion', v_replay_version);
  end if;

  perform public.validate_session_sets_v2(jsonb_build_array(p_set));
  perform public.validate_session_snapshot_v2(p_next_snapshot);

  select program_instance_id
  into v_program_instance_id
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id;

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
  if v_program_instance_id is not null and v_exercise.role <> 'accessory' then
    raise exception 'SET_ADD_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.set_logs
    where exercise_log_id = p_exercise_log_id
      and user_id = v_user_id
      and set_index = (p_set->>'setIndex')::integer
  ) then
    raise exception 'SET_INDEX_CONFLICT' using errcode = '40001';
  end if;
  if jsonb_array_length(p_next_snapshot->'movements') <> (
    select count(*)
    from public.exercise_logs
    where session_id = p_session_id and user_id = v_user_id
  ) then
    raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
  end if;

  select value
  into v_snapshot_movement
  from jsonb_array_elements(p_next_snapshot->'movements')
  where coalesce(value->>'slotId', value->>'id') = v_exercise.slot_id
  limit 1;
  if not found
    or not exists (
      select 1
      from jsonb_array_elements(v_snapshot_movement->'sets') as snapshot_set
      where (snapshot_set->>'setIndex')::integer = (p_set->>'setIndex')::integer
    )
    or jsonb_array_length(v_snapshot_movement->'sets') <> (
      select count(*) + 1
      from public.set_logs
      where exercise_log_id = p_exercise_log_id and user_id = v_user_id
    ) then
    raise exception 'SNAPSHOT_MISMATCH' using errcode = '22023';
  end if;

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
    note,
    client_mutation_id
  ) values (
    v_user_id,
    p_exercise_log_id,
    (p_set->>'setIndex')::integer,
    (p_set->>'targetLoad')::numeric,
    (p_set->>'targetReps')::integer,
    (p_set->>'targetRepMin')::integer,
    (p_set->>'targetRepMax')::integer,
    (p_set->>'targetRpe')::numeric,
    (p_set->>'targetRir')::numeric,
    coalesce(
      (p_set->>'actualLoad')::numeric,
      (p_set->>'targetLoad')::numeric
    ),
    coalesce(
      (p_set->>'actualReps')::integer,
      (p_set->>'targetReps')::integer,
      (p_set->>'targetRepMin')::integer
    ),
    (p_set->>'actualRpe')::numeric,
    (p_set->>'actualRir')::numeric,
    coalesce((p_set->>'completed')::boolean, false),
    coalesce((p_set->>'isTopSet')::boolean, false),
    coalesce((p_set->>'isAmrap')::boolean, false),
    coalesce((p_set->>'isBackoff')::boolean, false),
    p_set->>'note',
    p_request_id
  );

  return public.complete_session_mutation_v2(
    p_session_id,
    p_request_id,
    'add_session_set',
    v_payload_hash,
    p_expected_state_version,
    p_next_snapshot
  );
end;
$$;

create function public.substitute_session_movement_v2(
  p_session_id uuid,
  p_request_id text,
  p_expected_state_version integer,
  p_intent jsonb,
  p_exercise_log_id uuid,
  p_performed_movement_id text,
  p_reason text,
  p_note text,
  p_scope text,
  p_phase_key text
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

  if nullif(trim(p_phase_key), '') is null
    or char_length(p_phase_key) > 200 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id;

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

  perform 1 from public.movements where id = p_performed_movement_id;
  if not found then
    raise exception 'MOVEMENT_INVALID' using errcode = 'P0001';
  end if;
  if p_scope = 'phase_slot' and v_session.program_instance_id is null then
    raise exception 'SESSION_KIND_MISMATCH' using errcode = 'P0001';
  end if;

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
    p_expected_state_version
  );
end;
$$;

revoke all on function public.validate_session_snapshot_v2(jsonb)
  from public, anon, authenticated;
revoke all on function public.validate_session_sets_v2(jsonb)
  from public, anon, authenticated;
revoke all on function public.claim_session_mutation_v2(uuid, text, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.complete_session_mutation_v2(uuid, text, text, text, integer, jsonb)
  from public, anon, authenticated;

-- Future-program journal helpers are now implementation details of the atomic
-- wrappers. Leaving their legacy grants in place would bypass workout version
-- checks and durable receipts.
revoke all on function public.session_set_program_movement_override(uuid, text, text, text, text, text, uuid, boolean)
  from authenticated;
revoke all on function public.session_insert_program_accessory_addition(uuid, text, text, text, text, text, text, jsonb, text, text, integer)
  from authenticated;
revoke all on function public.session_reorder_program_accessory_additions(uuid, uuid[], integer[])
  from authenticated;
revoke all on function public.session_remove_program_accessory_addition(uuid, uuid, uuid[])
  from authenticated;

revoke all on function public.rename_session_v2(uuid, text, text, integer)
  from public, anon;
revoke all on function public.upsert_session_set_v2(
  uuid, uuid, integer, numeric, integer, numeric, numeric, boolean, text, text, integer
) from public, anon;
revoke all on function public.add_session_accessory_v2(uuid, text, integer, jsonb, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
revoke all on function public.reorder_session_accessories_v2(uuid, text, integer, jsonb, jsonb, jsonb, uuid[], integer[])
  from public, anon;
revoke all on function public.remove_session_accessory_v2(uuid, text, integer, jsonb, uuid, jsonb, jsonb, uuid, uuid[])
  from public, anon;
revoke all on function public.add_ad_hoc_exercise_v2(uuid, text, integer, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
revoke all on function public.remove_ad_hoc_exercise_v2(uuid, text, integer, jsonb, uuid, jsonb, jsonb)
  from public, anon;
revoke all on function public.add_session_set_v2(uuid, text, integer, jsonb, uuid, jsonb, jsonb)
  from public, anon;
revoke all on function public.substitute_session_movement_v2(uuid, text, integer, jsonb, uuid, text, text, text, text, text)
  from public, anon;

grant execute on function public.rename_session_v2(uuid, text, text, integer)
  to authenticated;
grant execute on function public.upsert_session_set_v2(
  uuid, uuid, integer, numeric, integer, numeric, numeric, boolean, text, text, integer
) to authenticated;
grant execute on function public.add_session_accessory_v2(uuid, text, integer, jsonb, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
grant execute on function public.reorder_session_accessories_v2(uuid, text, integer, jsonb, jsonb, jsonb, uuid[], integer[])
  to authenticated;
grant execute on function public.remove_session_accessory_v2(uuid, text, integer, jsonb, uuid, jsonb, jsonb, uuid, uuid[])
  to authenticated;
grant execute on function public.add_ad_hoc_exercise_v2(uuid, text, integer, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
grant execute on function public.remove_ad_hoc_exercise_v2(uuid, text, integer, jsonb, uuid, jsonb, jsonb)
  to authenticated;
grant execute on function public.add_session_set_v2(uuid, text, integer, jsonb, uuid, jsonb, jsonb)
  to authenticated;
grant execute on function public.substitute_session_movement_v2(uuid, text, integer, jsonb, uuid, text, text, text, text, text)
  to authenticated;
