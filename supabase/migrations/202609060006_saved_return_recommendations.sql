-- Preserve finish-time explanations independently of later Apply/Keep decisions.
alter table public.workout_sessions add column return_recommendations jsonb check (return_recommendations is null or jsonb_typeof(return_recommendations) = 'array');

create or replace function public.finish_session_v3(p_session_id uuid,p_request_id text,p_notes text,p_session_rpe integer,p_reflection_win text,p_reflection_improve text,p_prs jsonb,p_decisions jsonb,p_expected_program_version integer,p_expected_session_version integer)
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
  if v_session.status <> 'completed' and v_context is not null then
    update public.workout_sessions set return_recommendations = coalesce(p_decisions,'[]'::jsonb) where id = p_session_id;
  end if;
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
