-- Canonical target projection: metadata and logger actuals cannot change a prescription.
create function public.return_target_v1(p_set jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'setIndex',p_set->'setIndex','targetLoad',p_set->'targetLoad','targetReps',p_set->'targetReps',
    'targetRepMin',p_set->'targetRepMin','targetRepMax',p_set->'targetRepMax',
    'targetRir',p_set->'targetRir','targetRpe',p_set->'targetRpe',
    'isTopSet',coalesce(p_set->'isTopSet','false'::jsonb),
    'isAmrap',coalesce(p_set->'isAmrap','false'::jsonb),'isBackoff',coalesce(p_set->'isBackoff','false'::jsonb))
$$;

-- Re-expand from the pinned DSL and current instance choices at the database
-- boundary. The client never supplies the source of truth for return targets.
create function public.program_return_targets_v1(p_program_id uuid, p_stage jsonb, p_minimum_rir numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_program public.program_instances%rowtype; v_definition jsonb; v_week jsonb; v_session jsonb;
  v_week_index integer; v_entry record; v_source jsonb; v_set jsonb; v_load jsonb;
  v_sets jsonb; v_targets jsonb; v_result jsonb := '{}'::jsonb; v_binding jsonb; v_set_binding jsonb;
  v_slot_id text; v_planned text; v_source_movement text; v_movement text; v_key text;
  v_value numeric; v_target numeric; v_state_type text; v_percent numeric; v_rir numeric; v_rpe numeric;
  v_index integer; v_original integer; v_requested integer; v_remaining integer; v_pass boolean;
  v_kept boolean[]; v_protected boolean[]; v_previous_source jsonb; v_signature jsonb; v_indices jsonb;
  v_adapted boolean; v_rule text; v_selector jsonb;
begin
  select * into strict v_program from public.program_instances where id = p_program_id;
  select definition into strict v_definition from public.program_template_versions where id = v_program.template_version_id;
  v_week_index := (v_program.current_week_index / (v_definition->>'daysPerWeek')::integer) % (v_definition->>'durationWeeks')::integer;
  v_week := v_definition->'weeks'->v_week_index;
  v_session := v_definition->'sessions'->(v_program.current_week_index % (v_definition->>'daysPerWeek')::integer);
  for v_entry in
    select value as slot, null::jsonb as addition from jsonb_array_elements(v_session->'slots')
    union all
    select null::jsonb, to_jsonb(addition) from public.program_accessory_additions as addition
    where program_instance_id = p_program_id and session_id = v_session->>'id'
      and phase_key in ('*',v_week->>'phaseKey') and effective_from_week_index <= v_program.current_week_index
  loop
    v_slot_id := 'slot-' || (v_session->>'id') || '-' || coalesce(v_entry.slot->>'id',v_entry.addition->>'slot_id');
    v_planned := case when v_entry.slot is null then v_entry.addition->>'movement_id'
      when jsonb_typeof(v_entry.slot->'movementId') = 'string' then v_entry.slot->>'movementId'
      else coalesce(v_entry.slot #>> array['movementId','byPhase',v_week->>'phaseKey'],v_entry.slot #>> '{movementId,default}') end;
    v_source_movement := public.resolve_program_equipment_source_v1(p_program_id,v_session->>'id',v_slot_id,v_week->>'phaseKey',coalesce(v_entry.slot->>'role','accessory'),false);
    v_movement := v_source_movement; v_adapted := false;
    if v_program.equipment_mode = 'free_weight' and not exists(select 1 from public.movements where id = v_movement and resistance_mode in ('barbell','dumbbell','specialty_bar','bodyweight')) then
      select replacement_movement_id into v_movement from public.program_equipment_mode_choices where program_instance_id = p_program_id and template_session_id = v_session->>'id' and slot_id = v_slot_id and phase_key = v_week->>'phaseKey';
      if v_movement is null then raise exception 'FREE_WEIGHT_CHOICE_STALE'; end if;
      v_adapted := true;
    end if;
    v_source := v_week #> array['prescriptions',coalesce(v_entry.slot->>'prescriptionId',v_entry.addition->>'prescription_id')];
    v_sets := case when jsonb_array_length(coalesce(v_entry.addition->'sets','[]'::jsonb)) > 0 then v_entry.addition->'sets' else v_source->'sets' end;
    v_rule := case when v_entry.slot is not null then v_source->>'progressionRuleId'
      when v_entry.addition->>'progression_method' = 'double_progression' then 'accessory_double_progression' else null end;
    v_original := jsonb_array_length(v_sets); v_requested := v_original;
    if p_stage is not null then v_requested := greatest(1,coalesce((p_stage #>> array['setCounts',v_slot_id])::integer,ceil(v_original * (p_stage->>'setFraction')::numeric)::integer)); end if;
    v_kept := array_fill(true,array[v_original]); v_protected := array_fill(false,array[v_original]);
    v_previous_source := null;
    for v_index in 1..v_original loop
      v_set := v_sets->(v_index - 1);
      v_signature := jsonb_build_array(v_set->'targetLoad',v_set->'targetReps',v_set->'targetRepMin',v_set->'targetRepMax',v_set->'targetRir',v_set->'targetRpe',coalesce(v_set->'isTopSet','false'::jsonb),coalesce(v_set->'isAmrap','false'::jsonb),coalesce(v_set->'isBackoff','false'::jsonb),v_set->'label');
      v_protected[v_index] := coalesce(v_entry.slot->>'role','accessory') = 'warmup' or coalesce((v_set->>'isTopSet')::boolean,false) or coalesce((v_set->>'isAmrap')::boolean,false) or v_index = 1 or v_signature is distinct from v_previous_source;
      v_previous_source := v_signature;
    end loop;
    v_remaining := v_original;
    foreach v_pass in array array[true,false] loop
      for v_index in reverse v_original..1 loop
        if v_remaining > v_requested and not v_protected[v_index] and coalesce((v_sets->(v_index-1)->>'isBackoff')::boolean,false) = v_pass then
          v_kept[v_index] := false; v_remaining := v_remaining - 1;
        end if;
      end loop;
    end loop;
    v_targets := '[]'::jsonb; v_indices := '[]'::jsonb; v_binding := null;
    for v_index in 1..v_original loop
      if not v_kept[v_index] then continue; end if;
      v_set := v_sets->(v_index - 1); v_load := v_set->'targetLoad'; v_target := null; v_set_binding := null;
      if jsonb_typeof(v_load) = 'number' then v_target := v_load::numeric;
      elsif v_load->>'kind' = 'fixed' then
        v_selector := jsonb_build_object('templateSessionId',v_session->>'id','slotId',v_slot_id,'weekIndex',v_week_index,'movementId',v_source_movement,'setIndex',v_index);
        select value into v_target from public.program_load_overrides where program_instance_id = p_program_id and selector = v_selector;
        v_target := coalesce(v_target,case when v_program.units = 'kg' then (v_load->>'kg')::numeric else coalesce((v_load->>'lb')::numeric,round((v_load->>'kg')::numeric * 2.2046226218 / 5) * 5) end);
      elsif v_load->>'kind' in ('state','percent_of_state') and coalesce(v_load->>'default','') <> 'blank' then
        v_key := coalesce(v_load->>'stateKey',(case when v_load->>'kind' = 'state' then v_source_movement else coalesce(v_entry.slot->>'anchorMovementId',v_planned) end) || '_' || (v_load->>'stateType'));
        select value,state_type into v_value,v_state_type from public.program_state_values where program_instance_id = p_program_id and key = v_key;
        if v_value is null then raise exception 'RETURN_SOURCE_MISSING'; end if;
        v_set_binding := jsonb_build_object('stateKey',v_key,'stateType',v_state_type,'value',v_value);
        v_target := v_value;
        if v_load->>'kind' = 'percent_of_state' then
          v_percent := case when v_load->>'default' = 'high' then coalesce((v_load->>'percentMax')::numeric,(v_load->>'percent')::numeric) else (v_load->>'percent')::numeric end;
          v_target := round(v_value * v_percent / v_program.rounding) * v_program.rounding;
        end if;
      end if;
      if v_adapted then v_target := null; v_set_binding := null; end if;
      if jsonb_array_length(v_targets) = 0 then v_binding := v_set_binding;
      elsif v_binding is distinct from v_set_binding then v_binding := 'null'::jsonb; end if;
      v_rir := (v_set->>'targetRir')::numeric; v_rpe := (v_set->>'targetRpe')::numeric;
      if p_stage is not null then
        v_rir := greatest(p_minimum_rir,coalesce(v_rir,0),coalesce(10-v_rpe,0));
        if v_rpe is not null then v_rpe := least(v_rpe,10-p_minimum_rir); end if;
      end if;
      v_set := public.return_target_v1(v_set || jsonb_build_object('setIndex',coalesce((v_set->>'setIndex')::integer,v_index),'targetLoad',v_target,'targetRir',v_rir,'targetRpe',v_rpe));
      v_targets := v_targets || jsonb_build_array(v_set); v_indices := v_indices || jsonb_build_array(v_set->'setIndex');
    end loop;
    v_result := v_result || jsonb_build_object(v_slot_id,jsonb_build_object('movementId',v_movement,'role',coalesce(v_entry.slot->>'role','accessory'),'progressionRuleId',v_rule,'originalCount',v_original,'retainedSourceIndices',v_indices,'targets',v_targets,'binding',v_binding));
  end loop;
  return v_result;
end;
$$;

create function public.validate_return_start_v1(p_program_id uuid,p_snapshot jsonb) returns void
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
    for v_stage_index in 0..v_count-1 loop
      v_stage := v_period.settings->'stages'->v_stage_index;
      exit when v_remaining < (v_stage->>'workouts')::integer or v_stage_index = v_count-1;
      v_remaining := v_remaining - (v_stage->>'workouts')::integer;
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

-- Keep v2 callable for unaffected programmes, while v3 owns the return handshake.
alter function public.start_session_v2(text,uuid,text,date,jsonb,integer,uuid) rename to start_session_before_return;
create function public.start_session_v2(p_client_mutation_id text,p_program_instance_id uuid,p_planned_session_id text,p_scheduled_date date,p_prescription_snapshot jsonb,p_expected_program_version integer,p_source_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.program_return_periods where program_instance_id = p_program_instance_id and status in ('active','review')) or exists(select 1 from public.program_load_overrides where program_instance_id = p_program_instance_id) then raise exception 'RETURN_CLIENT_UPDATE_REQUIRED: update the app to start this workout'; end if;
  return public.start_session_before_return(p_client_mutation_id,p_program_instance_id,p_planned_session_id,p_scheduled_date,p_prescription_snapshot,p_expected_program_version,p_source_session_id);
end;
$$;
create function public.start_session_v3(p_client_mutation_id text,p_program_instance_id uuid,p_planned_session_id text,p_scheduled_date date,p_prescription_snapshot jsonb,p_expected_program_version integer,p_source_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_existing uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  if not exists(select 1 from public.program_instances where id = p_program_instance_id and user_id = auth.uid()) then raise exception 'PROGRAM_NOT_ACTIVE'; end if;
  select id into v_existing from public.workout_sessions where user_id = auth.uid() and client_mutation_id = p_client_mutation_id;
  if v_existing is not null then return v_existing; end if;
  if p_planned_session_id is distinct from p_prescription_snapshot->>'id' then raise exception 'RETURN_TARGETS_INVALID'; end if;
  perform public.validate_return_start_v1(p_program_instance_id,p_prescription_snapshot);
  return public.start_session_before_return(p_client_mutation_id,p_program_instance_id,p_planned_session_id,p_scheduled_date,p_prescription_snapshot,p_expected_program_version,p_source_session_id);
end;
$$;

-- Structural edits may remove/replace work, but cannot rewrite the frozen return
-- evidence. New accessories are current choices and are never reduced again.
create function public.protect_return_context_v1() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.prescription_snapshot->'returnContext' is distinct from new.prescription_snapshot->'returnContext' then raise exception 'RETURN_CONTEXT_IMMUTABLE'; end if;
  return new;
end;
$$;
create trigger protect_return_context before update of prescription_snapshot on public.workout_sessions for each row execute function public.protect_return_context_v1();

revoke all on function public.return_target_v1(jsonb),public.program_return_targets_v1(uuid,jsonb,numeric),public.validate_return_start_v1(uuid,jsonb),public.protect_return_context_v1(),public.start_session_before_return(text,uuid,text,date,jsonb,integer,uuid) from public,anon,authenticated;
revoke all on function public.start_session_v2(text,uuid,text,date,jsonb,integer,uuid),public.start_session_v3(text,uuid,text,date,jsonb,integer,uuid) from public,anon,authenticated;
grant execute on function public.start_session_v2(text,uuid,text,date,jsonb,integer,uuid),public.start_session_v3(text,uuid,text,date,jsonb,integer,uuid) to authenticated;
