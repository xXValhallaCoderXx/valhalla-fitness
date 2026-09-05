-- Application revision conflicts use HTTP 409, not a transaction serialization
-- failure that PostgREST may retry. Check old clients under the same account lock.
create or replace function public.change_program_return_v1(
  p_program_id uuid, p_expected_version integer, p_request_id text, p_action text,
  p_settings jsonb, p_changes jsonb, p_pending_decision_ids uuid[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_program public.program_instances%rowtype;
  v_receipt public.program_load_adjustments%rowtype; v_period public.program_return_periods%rowtype;
  v_intent jsonb; v_sources jsonb; v_change jsonb; v_source jsonb; v_pending uuid[]; v_total integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_action is null or p_action not in ('apply','update','extend','end') or length(coalesce(p_request_id,'')) not between 1 and 200
    or p_expected_version is null or p_expected_version < 0
    or jsonb_typeof(p_changes) is distinct from 'array' or octet_length(p_changes::text) > 1000000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;
  perform public.validate_return_settings_v1(p_settings);
  v_intent := jsonb_build_object('programId',p_program_id,'expectedVersion',p_expected_version,'action',p_action,'settings',p_settings,'changes',p_changes,'pending',p_pending_decision_ids);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,0));
  select * into v_receipt from public.program_load_adjustments where user_id = v_user and request_id = p_request_id;
  if found then
    if v_receipt.intent <> v_intent then raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'PT409'; end if;
    return jsonb_build_object('programId',p_program_id,'stateVersion',v_receipt.resulting_version);
  end if;
  select * into v_program from public.program_instances where id = p_program_id and user_id = v_user and status = 'active' for update;
  if not found then raise exception 'PROGRAM_NOT_ACTIVE'; end if;
  if v_program.state_version <> p_expected_version then raise exception 'CONFLICT: refresh the return preview' using errcode = 'PT409'; end if;
  if exists(select 1 from public.workout_sessions where user_id = v_user and status = 'in_progress') then raise exception 'Finish or discard the current workout before editing the return guide.'; end if;
  select * into v_period from public.program_return_periods where program_instance_id = p_program_id and status in ('active','review') for update;
  if (p_action = 'apply' and found) or (p_action <> 'apply' and not found) then raise exception 'RETURN_STATUS_CONFLICT' using errcode = 'PT409'; end if;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into v_pending from public.progression_decisions where program_instance_id = p_program_id and user_id = v_user and status = 'pending';
  if v_pending <> coalesce((select array_agg(id order by id) from unnest(p_pending_decision_ids) as id),'{}'::uuid[]) then raise exception 'CONFLICT: progression decisions changed' using errcode = 'PT409'; end if;
  if p_action <> 'apply' and cardinality(v_pending) > 0 then raise exception 'Resolve progression recommendations before editing or ending the return guide.'; end if;
  v_sources := public.program_return_load_sources_v1(p_program_id);
  if p_action <> 'end' and jsonb_array_length(p_changes) <> (select count(*) from jsonb_each(v_sources)) then raise exception 'RETURN_LOAD_PREVIEW_INCOMPLETE'; end if;
  if p_action = 'end' and p_changes <> '[]'::jsonb then raise exception 'Ending the guide keeps current loads.'; end if;
  if (select count(*) from jsonb_array_elements(p_changes)) <> (select count(distinct (value->>'kind') || ':' || (value->>'key')) from jsonb_array_elements(p_changes)) then raise exception 'RETURN_DUPLICATE_LOAD'; end if;
  for v_change in select value from jsonb_array_elements(p_changes) loop
    v_source := v_sources->((v_change->>'kind') || ':' || (v_change->>'key'));
    if v_source is null or v_source->'before' is distinct from v_change->'before'
      or coalesce(v_source->'selector','null'::jsonb) is distinct from coalesce(v_change->'selector','null'::jsonb)
      or coalesce(v_source->'accessoryId','null'::jsonb) is distinct from coalesce(v_change->'accessoryId','null'::jsonb)
      or coalesce(v_source->'setIndex','null'::jsonb) is distinct from coalesce(v_change->'setIndex','null'::jsonb)
      or jsonb_typeof(v_change->'after') is distinct from 'number'
      or (v_change->>'after')::numeric not between 0 and 99999
      or (v_change->>'kind' = 'state' and (v_change->>'after')::numeric <= 0)
      or ((v_change->>'before')::numeric = 0 and (v_change->>'after')::numeric <> 0) then
      raise exception 'RETURN_LOAD_INVALID: refresh or enter an explicit value' using errcode = '22023';
    end if;
    if v_change->>'kind' = 'state' then
      update public.program_state_values set value = (v_change->>'after')::numeric, updated_at = now() where program_instance_id = p_program_id and key = v_change->>'key';
    elsif v_change->>'kind' = 'fixed' then
      insert into public.program_load_overrides(user_id,program_instance_id,key,selector,value) values(v_user,p_program_id,v_change->>'key',v_change->'selector',(v_change->>'after')::numeric)
      on conflict (program_instance_id,key) do update set value = excluded.value;
    else
      update public.program_accessory_additions set sets = (
        select jsonb_agg(case when value->'setIndex' = v_change->'setIndex' then jsonb_set(value,'{targetLoad}',v_change->'after') else value end order by ordinality)
        from jsonb_array_elements(sets) with ordinality
      ) where program_instance_id = p_program_id and id = (v_change->>'accessoryId')::uuid;
    end if;
  end loop;
  select sum((value->>'workouts')::integer) into v_total from jsonb_array_elements(p_settings->'stages');
  if p_action = 'apply' then
    insert into public.program_return_periods(user_id,program_instance_id,status,settings) values(v_user,p_program_id,'active',p_settings);
    update public.progression_decisions set status = 'superseded', resolved_at = now() where id = any(v_pending);
  elsif p_action = 'end' then
    update public.program_return_periods set status = 'completed', ended_at = now() where id = v_period.id;
  else
    if p_action = 'extend' and v_total <= v_period.completed_workouts then raise exception 'Add qualifying workouts to extend the guide.'; end if;
    update public.program_return_periods set settings = p_settings, status = case when completed_workouts >= v_total then 'review' else 'active' end where id = v_period.id;
  end if;
  update public.program_instances set state_version = state_version + 1 where id = p_program_id;
  insert into public.program_load_adjustments(user_id,program_instance_id,request_id,action,intent,changes,superseded_decision_ids,resulting_version)
    values(v_user,p_program_id,p_request_id,p_action,v_intent,p_changes,v_pending,v_program.state_version + 1);
  return jsonb_build_object('programId',p_program_id,'stateVersion',v_program.state_version + 1);
end;
$$;

create or replace function public.validate_return_start_v1(p_program_id uuid,p_snapshot jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_period public.program_return_periods%rowtype; v_program public.program_instances%rowtype;
  v_context jsonb := p_snapshot->'returnContext'; v_stage jsonb; v_remaining integer; v_stage_index integer := 0;
  v_expected jsonb; v_entry record; v_movement jsonb; v_frozen jsonb; v_targets jsonb;
  v_definition jsonb; v_session jsonb; v_week integer; v_count integer;
begin
  select * into strict v_program from public.program_instances where id = p_program_id;
  select * into v_period from public.program_return_periods where program_instance_id = p_program_id and status in ('active','review');
  if v_period.id is null and not exists(select 1 from public.program_load_overrides where program_instance_id = p_program_id) then
    if v_context is not null then raise exception 'RETURN_CONTEXT_STALE'; end if;
    return;
  end if;
  select definition into strict v_definition from public.program_template_versions where id = v_program.template_version_id;
  v_session := v_definition->'sessions'->(v_program.current_week_index % (v_definition->>'daysPerWeek')::integer);
  v_week := (v_program.current_week_index / (v_definition->>'daysPerWeek')::integer) % (v_definition->>'durationWeeks')::integer;
  if (p_snapshot->>'weekIndex')::integer is distinct from v_program.current_week_index
    or p_snapshot->>'templateSessionId' is distinct from v_session->>'id'
    or p_snapshot->>'id' is distinct from (v_session->>'id') || '-w' || (v_week + 1)::text
    or p_snapshot->>'units' is distinct from v_program.units
    or (p_snapshot->>'rounding')::numeric is distinct from v_program.rounding then raise exception 'RETURN_CONTEXT_STALE'; end if;
  if exists(select 1 from public.program_load_overrides where program_instance_id = p_program_id) and p_snapshot->>'loadOverrideVersion' is distinct from '1' then raise exception 'RETURN_CLIENT_UPDATE_REQUIRED'; end if;
  if v_period.id is not null then
    v_remaining := v_period.completed_workouts;
    v_count := jsonb_array_length(v_period.settings->'stages');
    v_stage_index := 0;
    for v_stage in select value from jsonb_array_elements(v_period.settings->'stages') loop
      exit when v_remaining < (v_stage->>'workouts')::integer or v_stage_index = v_count-1;
      v_remaining := v_remaining - (v_stage->>'workouts')::integer;
      v_stage_index := v_stage_index + 1;
    end loop;
    if v_context->>'policyVersion' is distinct from '1' or v_context->>'periodId' is distinct from v_period.id::text
      or (v_context->>'startedAt')::timestamptz is distinct from v_period.started_at
      or (v_context->>'completedWorkouts')::integer is distinct from v_period.completed_workouts
      or (v_context->>'stageIndex')::integer is distinct from v_stage_index
      or (v_context->>'stageWorkouts')::integer is distinct from (v_stage->>'workouts')::integer
      or (v_context->>'stageWorkout')::integer is distinct from least(v_remaining+1,(v_stage->>'workouts')::integer)
      or (v_context->>'review')::boolean is distinct from (v_period.status = 'review')
      or v_context->'caps' is distinct from v_period.settings->'caps'
      or v_context->'defaultCap' is distinct from v_period.settings->'defaultCap'
      or v_context->'minimumRir' is distinct from v_period.settings->'minimumRir' then raise exception 'RETURN_CLIENT_UPDATE_REQUIRED: refresh the return guide'; end if;
  elsif v_context is not null then raise exception 'RETURN_CONTEXT_STALE'; end if;
  v_expected := public.program_return_targets_v1(p_program_id,v_stage,(v_period.settings->>'minimumRir')::numeric);
  if jsonb_array_length(p_snapshot->'movements') <> (select count(*) from jsonb_each(v_expected)) then raise exception 'RETURN_TARGETS_INVALID'; end if;
  if v_period.id is not null and (jsonb_typeof(v_context->'slots') is distinct from 'object' or (select count(*) from jsonb_each(v_context->'slots')) <> (select count(*) from jsonb_each(v_expected))) then raise exception 'RETURN_TARGETS_INVALID'; end if;
  for v_entry in select * from jsonb_each(v_expected) loop
    if (select count(*) from jsonb_array_elements(p_snapshot->'movements') where coalesce(value->>'slotId',value->>'id') = v_entry.key) <> 1 then raise exception 'RETURN_TARGETS_INVALID'; end if;
    select value into v_movement from jsonb_array_elements(p_snapshot->'movements') where coalesce(value->>'slotId',value->>'id') = v_entry.key;
    select jsonb_agg(public.return_target_v1(value) order by ordinality) into v_targets from jsonb_array_elements(v_movement->'sets') with ordinality;
    if v_targets is distinct from v_entry.value->'targets' or v_movement->'movementId' is distinct from v_entry.value->'movementId'
      or v_movement->'role' is distinct from v_entry.value->'role' or coalesce(v_movement->'progressionRuleId','null'::jsonb) is distinct from v_entry.value->'progressionRuleId' then raise exception 'RETURN_TARGETS_INVALID'; end if;
    if v_period.id is not null then
      v_frozen := v_context #> array['slots',v_entry.key];
      select jsonb_agg(public.return_target_v1(value) order by ordinality) into v_targets from jsonb_array_elements(v_frozen->'targets') with ordinality;
      if v_targets is distinct from v_entry.value->'targets' or (v_frozen - 'targets') is distinct from (v_entry.value - 'targets' - 'role') then raise exception 'RETURN_BINDING_INVALID'; end if;
    end if;
  end loop;
end;
$$;

create or replace function public.start_session_v2(p_client_mutation_id text,p_program_instance_id uuid,p_planned_session_id text,p_scheduled_date date,p_prescription_snapshot jsonb,p_expected_program_version integer,p_source_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  if exists(select 1 from public.program_return_periods where program_instance_id = p_program_instance_id and status in ('active','review')) or exists(select 1 from public.program_load_overrides where program_instance_id = p_program_instance_id) then raise exception 'RETURN_CLIENT_UPDATE_REQUIRED: update the app to start this workout'; end if;
  return public.start_session_before_return(p_client_mutation_id,p_program_instance_id,p_planned_session_id,p_scheduled_date,p_prescription_snapshot,p_expected_program_version,p_source_session_id);
end;
$$;

create or replace function public.start_session_v3(p_client_mutation_id text,p_program_instance_id uuid,p_planned_session_id text,p_scheduled_date date,p_prescription_snapshot jsonb,p_expected_program_version integer,p_source_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_existing uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  if not exists(select 1 from public.program_instances where id = p_program_instance_id and user_id = auth.uid()) then raise exception 'PROGRAM_NOT_ACTIVE'; end if;
  select id into v_existing from public.workout_sessions where user_id = auth.uid() and client_mutation_id = p_client_mutation_id;
  if v_existing is not null then return v_existing; end if;
  if p_planned_session_id is distinct from p_prescription_snapshot->>'id' then raise exception 'RETURN_TARGETS_INVALID'; end if;
  if not exists(select 1 from public.program_instances where id = p_program_instance_id and state_version = p_expected_program_version) then raise exception 'CONFLICT: refresh the planned workout' using errcode = 'PT409'; end if;
  perform public.validate_return_start_v1(p_program_instance_id,p_prescription_snapshot);
  return public.start_session_before_return(p_client_mutation_id,p_program_instance_id,p_planned_session_id,p_scheduled_date,p_prescription_snapshot,p_expected_program_version,p_source_session_id);
end;
$$;
