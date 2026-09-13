-- New finishes record exact decision provenance; older rows deliberately stay unlinked.
alter table public.workout_sessions
  add column progression_receipt_recorded boolean not null default false;
alter table public.progression_decisions
  add column session_id uuid,
  add constraint progression_decisions_session_owner_fkey
    foreign key (session_id, user_id) references public.workout_sessions(id, user_id)
    on delete set null (session_id);
create index progression_decisions_session_receipt_idx
  on public.progression_decisions(user_id, session_id, created_at, id)
  where session_id is not null;

-- Both public finish versions call this private implementation. Preserve their return
-- validation, saved recommendations, counters, and idempotent replay wrappers unchanged.
create or replace function public.finish_session_before_return(
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
    progression_receipt_recorded = true,
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
        session_id,
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
        p_session_id,
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

revoke all on function public.finish_session_before_return(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer)
  from public, anon, authenticated;
