create function public.validate_return_decisions_v1(p_session_id uuid,p_decisions jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.workout_sessions%rowtype; v_program public.program_instances%rowtype;
  v_context jsonb; v_decision jsonb; v_entry record; v_binding jsonb; v_target jsonb;
  v_exercise public.exercise_logs%rowtype; v_set public.set_logs%rowtype; v_top public.set_logs%rowtype;
  v_current numeric; v_cap numeric; v_rule text; v_next numeric; v_increment numeric;
  v_definition jsonb; v_all_reps boolean; v_all_effort boolean; v_count integer; v_seen text[] := '{}';
begin
  select * into strict v_session from public.workout_sessions where id = p_session_id;
  v_context := v_session.prescription_snapshot->'returnContext';
  if v_context is null then return; end if;
  select * into strict v_program from public.program_instances where id = v_session.program_instance_id;
  select definition into strict v_definition from public.program_template_versions where id = v_program.template_version_id;
  for v_decision in select value from jsonb_array_elements(coalesce(p_decisions,'[]'::jsonb)) loop
    if jsonb_typeof(v_decision->'previousValue') is distinct from 'number' or jsonb_typeof(v_decision->'recommendedValue') is distinct from 'number'
      or v_decision->>'stateKey' = any(v_seen) then raise exception 'RETURN_PROGRESSION_INVALID'; end if;
    v_seen := array_append(v_seen,v_decision->>'stateKey');
    select count(*) into v_count from jsonb_each(v_context->'slots') where value #>> '{binding,stateKey}' = v_decision->>'stateKey' and value->>'movementId' = v_decision->>'movementId';
    if v_count <> 1 then raise exception 'RETURN_PROGRESSION_SOURCE_INVALID'; end if;
    select * into v_entry from jsonb_each(v_context->'slots') where value #>> '{binding,stateKey}' = v_decision->>'stateKey' and value->>'movementId' = v_decision->>'movementId';
    v_binding := v_entry.value->'binding'; v_rule := v_entry.value->>'progressionRuleId';
    select value into v_current from public.program_state_values where program_instance_id = v_program.id and key = v_binding->>'stateKey';
    if v_current is distinct from (v_binding->>'value')::numeric or v_current is distinct from (v_decision->>'previousValue')::numeric
      or v_decision->>'stateType' is distinct from v_binding->>'stateType' then raise exception 'RETURN_PROGRESSION_SOURCE_STALE'; end if;
    select * into v_exercise from public.exercise_logs where session_id = p_session_id and slot_id = v_entry.key;
    if not found or v_exercise.performed_movement_id is distinct from v_entry.value->>'movementId' then raise exception 'RETURN_PROGRESSION_MOVEMENT_CHANGED'; end if;
    if (select count(*) from public.set_logs where exercise_log_id = v_exercise.id) <> jsonb_array_length(v_entry.value->'targets') then raise exception 'RETURN_PROGRESSION_WORK_CHANGED'; end if;
    v_all_reps := true; v_all_effort := true; v_top := null;
    for v_target in select value from jsonb_array_elements(v_entry.value->'targets') loop
      select * into v_set from public.set_logs where exercise_log_id = v_exercise.id and set_index = (v_target->>'setIndex')::integer;
      if not found or not v_set.completed or v_set.actual_reps is null or v_set.actual_load is null
        or v_target->>'targetLoad' is null or v_set.actual_load is distinct from (v_target->>'targetLoad')::numeric
        or (v_set.actual_rir is null and v_set.actual_rpe is null)
        or public.return_target_v1(jsonb_build_object('setIndex',v_set.set_index,'targetLoad',v_set.target_load,'targetReps',v_set.target_reps,'targetRepMin',v_set.target_rep_min,'targetRepMax',v_set.target_rep_max,'targetRir',v_set.target_rir,'targetRpe',v_set.target_rpe,'isTopSet',v_set.is_top_set,'isAmrap',v_set.is_amrap,'isBackoff',v_set.is_backoff)) <> public.return_target_v1(v_target) then raise exception 'RETURN_PROGRESSION_EVIDENCE_INVALID'; end if;
      v_all_reps := v_all_reps and v_set.actual_reps >= coalesce((v_target->>'targetReps')::integer,(v_target->>'targetRepMin')::integer,1);
      v_all_effort := v_all_effort and coalesce(v_set.actual_rir,10-v_set.actual_rpe) >= coalesce((v_target->>'targetRir')::numeric,(v_context->>'minimumRir')::numeric);
      if v_top.id is null and (v_set.is_top_set or v_set.is_amrap) then v_top := v_set; end if;
    end loop;
    v_next := null;
    if v_rule = 'simple_linear_completion' and v_all_reps and v_all_effort then
      v_increment := coalesce((v_definition #>> array['progressionConfig','simple_linear_completion','increments',v_exercise.planned_movement_id,v_program.units])::numeric,case when v_exercise.planned_movement_id in ('bench_press','overhead_press','barbell_row') then 2.5 else 5 end);
      v_next := greatest(round((v_current+v_increment)/v_program.rounding)*v_program.rounding,v_current+v_program.rounding);
      if v_decision->>'ruleId' <> 'simple_linear_completion' then raise exception 'RETURN_PROGRESSION_RULE_INVALID'; end if;
    elsif v_rule in ('plus_set_wave','bullmastiff_plus_set') and v_top.id is not null then
      v_next := round((v_current + greatest(v_top.actual_reps-coalesce(v_top.target_reps,1),0)*v_current*0.01)/v_program.rounding)*v_program.rounding;
      if v_decision->>'ruleId' <> 'plus_set_wave' then raise exception 'RETURN_PROGRESSION_RULE_INVALID'; end if;
    elsif v_rule in ('training_max_band','healthy_531_tm_band') and v_top.id is not null then
      if v_top.actual_reps < coalesce(v_top.target_reps,0) then v_next := round(v_current*0.9/v_program.rounding)*v_program.rounding; v_rule := 'training_max_reset';
      elsif coalesce(v_top.actual_rir,10-v_top.actual_rpe) <= 1 then v_next := v_current; v_rule := 'training_max_hold';
      elsif v_top.actual_reps >= coalesce(v_top.target_reps,0)+2 and coalesce(v_top.actual_rir,10-v_top.actual_rpe) >= 2 then
        v_next := round((v_current + case when v_exercise.planned_movement_id in ('bench_press','overhead_press') then 5 else 7.5 end)/v_program.rounding)*v_program.rounding; v_rule := 'training_max_double';
      else v_next := round((v_current + case when v_exercise.planned_movement_id in ('bench_press','overhead_press') then 2.5 else 5 end)/v_program.rounding)*v_program.rounding; v_rule := 'training_max_standard'; end if;
      if v_decision->>'ruleId' <> v_rule then raise exception 'RETURN_PROGRESSION_RULE_INVALID'; end if;
    end if;
    if v_next is null then raise exception 'RETURN_PROGRESSION_RULE_UNSUPPORTED'; end if;
    if v_next > v_current then
      if not v_all_reps or not v_all_effort then raise exception 'RETURN_INCREASE_NOT_EARNED'; end if;
      v_cap := coalesce((v_context #>> array['caps',v_binding->>'stateKey'])::numeric,(v_context->>'defaultCap')::numeric);
      v_next := v_current + floor(least(v_next-v_current,v_cap)/v_program.rounding)*v_program.rounding;
    end if;
    if (v_decision->>'recommendedValue')::numeric <> v_next then raise exception 'RETURN_PROGRESSION_CAP_INVALID'; end if;
  end loop;
end;
$$;

alter function public.finish_session_v2(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer) rename to finish_session_before_return;
create function public.finish_session_v2(p_session_id uuid,p_request_id text,p_notes text,p_session_rpe integer,p_reflection_win text,p_reflection_improve text,p_prs jsonb,p_decisions jsonb,p_expected_program_version integer,p_expected_session_version integer)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.workout_sessions where id = p_session_id and user_id = auth.uid() and prescription_snapshot ? 'returnContext') then raise exception 'RETURN_CLIENT_UPDATE_REQUIRED: update the app to finish this workout'; end if;
  return public.finish_session_before_return(p_session_id,p_request_id,p_notes,p_session_rpe,p_reflection_win,p_reflection_improve,p_prs,p_decisions,p_expected_program_version,p_expected_session_version);
end;
$$;
create function public.finish_session_v3(p_session_id uuid,p_request_id text,p_notes text,p_session_rpe integer,p_reflection_win text,p_reflection_improve text,p_prs jsonb,p_decisions jsonb,p_expected_program_version integer,p_expected_session_version integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_session public.workout_sessions%rowtype; v_id uuid; v_context jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  select * into v_session from public.workout_sessions where id = p_session_id and user_id = auth.uid() for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'completed' then perform public.validate_return_decisions_v1(p_session_id,p_decisions); end if;
  v_id := public.finish_session_before_return(p_session_id,p_request_id,p_notes,p_session_rpe,p_reflection_win,p_reflection_improve,p_prs,p_decisions,p_expected_program_version,p_expected_session_version);
  v_context := v_session.prescription_snapshot->'returnContext';
  if v_session.status <> 'completed' and v_context is not null and exists(
    select 1 from public.exercise_logs exercise join public.set_logs performed on performed.exercise_log_id = exercise.id
    join lateral jsonb_each(v_context->'slots') frozen on frozen.key = exercise.slot_id
    where exercise.session_id = p_session_id and performed.completed
      and frozen.value->'retainedSourceIndices' @> jsonb_build_array(performed.set_index)
  ) then
    update public.program_return_periods set completed_workouts = completed_workouts+1,
      status = case when completed_workouts+1 >= (select sum((value->>'workouts')::integer) from jsonb_array_elements(settings->'stages')) then 'review' else 'active' end
    where id = (v_context->>'periodId')::uuid and program_instance_id = v_session.program_instance_id and status in ('active','review');
  end if;
  return v_id;
end;
$$;
revoke all on function public.validate_return_decisions_v1(uuid,jsonb),public.finish_session_before_return(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer) from public,anon,authenticated;
revoke all on function public.finish_session_v2(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer),public.finish_session_v3(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer) from public,anon,authenticated;
grant execute on function public.finish_session_v2(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer),public.finish_session_v3(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer) to authenticated;
