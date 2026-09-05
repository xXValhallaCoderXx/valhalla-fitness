-- Instance-owned return guides. Templates and completed snapshots are never rewritten.
create table public.program_return_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_instance_id uuid not null,
  policy_version integer not null default 1 check (policy_version = 1),
  status text not null check (status in ('active', 'review', 'completed', 'cancelled')),
  settings jsonb not null,
  completed_workouts integer not null default 0 check (completed_workouts >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  foreign key (program_instance_id, user_id) references public.program_instances(id, user_id) on delete cascade
);
create unique index program_return_one_open on public.program_return_periods(program_instance_id) where status in ('active', 'review');
create table public.program_load_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_instance_id uuid not null,
  key text not null,
  selector jsonb not null,
  value numeric not null check (value >= 0 and value < 100000),
  unique (program_instance_id, key),
  unique (program_instance_id, selector),
  foreign key (program_instance_id, user_id) references public.program_instances(id, user_id) on delete cascade
);
-- One immutable ledger row is also the durable request receipt. Store the complete
-- explicit intent, including unchanged preview values and superseded recommendations.
create table public.program_load_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_instance_id uuid not null,
  request_id text not null check (length(request_id) between 1 and 200),
  action text not null check (action in ('apply', 'update', 'extend', 'end')),
  intent jsonb not null,
  changes jsonb not null,
  superseded_decision_ids uuid[] not null default '{}',
  resulting_version integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, request_id),
  foreign key (program_instance_id, user_id) references public.program_instances(id, user_id) on delete cascade
);

alter table public.program_return_periods enable row level security;
alter table public.program_load_overrides enable row level security;
alter table public.program_load_adjustments enable row level security;
create policy return_period_owner_read on public.program_return_periods for select to authenticated using (auth.uid() = user_id);
create policy load_override_owner_read on public.program_load_overrides for select to authenticated using (auth.uid() = user_id);
create policy load_adjustment_owner_read on public.program_load_adjustments for select to authenticated using (auth.uid() = user_id);
revoke all on public.program_return_periods, public.program_load_overrides, public.program_load_adjustments from public, anon, authenticated;
grant select on public.program_return_periods, public.program_load_overrides, public.program_load_adjustments to authenticated;

create function public.validate_return_settings_v1(p_settings jsonb) returns void
language plpgsql set search_path = '' as $$
declare v_stage jsonb; v_value jsonb;
begin
  if jsonb_typeof(p_settings) is distinct from 'object'
    or jsonb_typeof(p_settings->'stages') is distinct from 'array'
    or jsonb_array_length(p_settings->'stages') not between 1 and 8
    or jsonb_typeof(p_settings->'minimumRir') is distinct from 'number'
    or (p_settings->>'minimumRir')::numeric not between 3 and 10
    or jsonb_typeof(p_settings->'defaultCap') is distinct from 'number'
    or (p_settings->>'defaultCap')::numeric not between 0 and 100
    or jsonb_typeof(p_settings->'caps') is distinct from 'object' then
    raise exception 'RETURN_SETTINGS_INVALID' using errcode = '22023';
  end if;
  for v_stage in select value from jsonb_array_elements(p_settings->'stages') loop
    if jsonb_typeof(v_stage->'workouts') is distinct from 'number'
      or (v_stage->>'workouts')::numeric not between 1 and 100
      or (v_stage->>'workouts')::numeric <> trunc((v_stage->>'workouts')::numeric)
      or jsonb_typeof(v_stage->'setFraction') is distinct from 'number'
      or (v_stage->>'setFraction')::numeric not between 0 and 1
      or jsonb_typeof(v_stage->'setCounts') is distinct from 'object' then
      raise exception 'RETURN_SETTINGS_INVALID' using errcode = '22023';
    end if;
    for v_value in select value from jsonb_each(v_stage->'setCounts') loop
      if jsonb_typeof(v_value) <> 'number' or v_value::numeric not between 1 and 100 or v_value::numeric <> trunc(v_value::numeric) then
        raise exception 'RETURN_SETTINGS_INVALID' using errcode = '22023';
      end if;
    end loop;
  end loop;
  for v_value in select value from jsonb_each(p_settings->'caps') loop
    if jsonb_typeof(v_value) <> 'number' or v_value::numeric not between 0 and 100 then
      raise exception 'RETURN_SETTINGS_INVALID' using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- Authoritative inventory for checking preview provenance and before-values.
create function public.program_return_load_sources_v1(p_program_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_program public.program_instances%rowtype; v_definition jsonb;
  v_week record; v_session jsonb; v_slot jsonb; v_set record;
  v_sources jsonb := '{}'::jsonb; v_load jsonb; v_key text; v_kind text;
  v_planned text; v_movement text; v_slot_id text; v_selector jsonb;
  v_before numeric; v_addition public.program_accessory_additions%rowtype;
begin
  select * into strict v_program from public.program_instances where id = p_program_id;
  select definition into strict v_definition from public.program_template_versions where id = v_program.template_version_id;
  for v_week in select value, ordinality - 1 as idx from jsonb_array_elements(v_definition->'weeks') with ordinality loop
    for v_session in select value from jsonb_array_elements(v_definition->'sessions') loop
      for v_slot in select value from jsonb_array_elements(v_session->'slots') loop
        v_slot_id := 'slot-' || (v_session->>'id') || '-' || (v_slot->>'id');
        v_planned := case when jsonb_typeof(v_slot->'movementId') = 'string' then v_slot->>'movementId'
          else coalesce(v_slot #>> array['movementId','byPhase',v_week.value->>'phaseKey'], v_slot #>> '{movementId,default}') end;
        v_movement := public.resolve_program_equipment_source_v1(p_program_id, v_session->>'id', v_slot_id, v_week.value->>'phaseKey', v_slot->>'role', false);
        for v_set in select value, ordinality as idx from jsonb_array_elements(v_week.value #> array['prescriptions',v_slot->>'prescriptionId','sets']) with ordinality loop
          v_load := v_set.value->'targetLoad'; v_kind := null; v_selector := null; v_before := null;
          if v_load->>'kind' in ('state','percent_of_state') and coalesce(v_load->>'default','') <> 'blank' then
            v_kind := 'state';
            v_key := coalesce(v_load->>'stateKey', (case when v_load->>'kind' = 'state' then v_movement else coalesce(v_slot->>'anchorMovementId',v_planned) end) || '_' || (v_load->>'stateType'));
            select value into v_before from public.program_state_values where program_instance_id = p_program_id and key = v_key;
          elsif v_load->>'kind' = 'fixed' then
            v_kind := 'fixed';
            v_selector := jsonb_build_object('templateSessionId',v_session->>'id','slotId',v_slot_id,'weekIndex',v_week.idx,'movementId',v_movement,'setIndex',v_set.idx);
            v_key := format('[%s,%s,%s,%s,%s]',to_json(v_session->>'id'),to_json(v_slot_id),v_week.idx,to_json(v_movement),v_set.idx);
            select value into v_before from public.program_load_overrides where program_instance_id = p_program_id and selector = v_selector;
            v_before := coalesce(v_before, case when v_program.units = 'kg' then (v_load->>'kg')::numeric else coalesce((v_load->>'lb')::numeric, round((v_load->>'kg')::numeric * 2.2046226218 / 5) * 5) end);
          end if;
          if v_kind is not null and v_before is not null then
            v_sources := v_sources || jsonb_build_object(v_kind || ':' || v_key, jsonb_build_object('key',v_key,'kind',v_kind,'before',v_before,'selector',v_selector));
          end if;
        end loop;
      end loop;
    end loop;
  end loop;
  for v_addition in select * from public.program_accessory_additions where program_instance_id = p_program_id loop
    for v_set in select value from jsonb_array_elements(coalesce(v_addition.sets,'[]'::jsonb)) loop
      if jsonb_typeof(v_set.value->'targetLoad') = 'number' then
        v_key := v_addition.id::text || ':' || (v_set.value->>'setIndex');
        v_sources := v_sources || jsonb_build_object('accessory:' || v_key, jsonb_build_object('key',v_key,'kind','accessory','before',v_set.value->'targetLoad','accessoryId',v_addition.id,'setIndex',v_set.value->'setIndex'));
      end if;
    end loop;
  end loop;
  return v_sources;
end;
$$;

create function public.change_program_return_v1(
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
    if v_receipt.intent <> v_intent then raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '40001'; end if;
    return jsonb_build_object('programId',p_program_id,'stateVersion',v_receipt.resulting_version);
  end if;
  select * into v_program from public.program_instances where id = p_program_id and user_id = v_user and status = 'active' for update;
  if not found then raise exception 'PROGRAM_NOT_ACTIVE'; end if;
  if v_program.state_version <> p_expected_version then raise exception 'CONFLICT: refresh the return preview' using errcode = '40001'; end if;
  if exists(select 1 from public.workout_sessions where user_id = v_user and status = 'in_progress') then raise exception 'Finish or discard the current workout before editing the return guide.'; end if;
  select * into v_period from public.program_return_periods where program_instance_id = p_program_id and status in ('active','review') for update;
  if (p_action = 'apply' and found) or (p_action <> 'apply' and not found) then raise exception 'RETURN_STATUS_CONFLICT' using errcode = '40001'; end if;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into v_pending from public.progression_decisions where program_instance_id = p_program_id and user_id = v_user and status = 'pending';
  if v_pending <> coalesce((select array_agg(id order by id) from unnest(p_pending_decision_ids) as id),'{}'::uuid[]) then raise exception 'CONFLICT: progression decisions changed' using errcode = '40001'; end if;
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

create function public.cancel_return_on_program_replacement_v1() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'active' and new.status <> 'active' then
    update public.program_return_periods set status = 'cancelled', ended_at = now() where program_instance_id = old.id and status in ('active','review');
  end if;
  return new;
end;
$$;
create trigger cancel_return_on_program_replacement after update of status on public.program_instances for each row execute function public.cancel_return_on_program_replacement_v1();

revoke all on function public.validate_return_settings_v1(jsonb), public.program_return_load_sources_v1(uuid), public.cancel_return_on_program_replacement_v1() from public, anon, authenticated;
revoke all on function public.change_program_return_v1(uuid,integer,text,text,jsonb,jsonb,uuid[]) from public, anon, authenticated;
grant execute on function public.change_program_return_v1(uuid,integer,text,text,jsonb,jsonb,uuid[]) to authenticated;
