-- Correct nested JSON operator precedence without rewriting the applied additive boundary.
create or replace function public.start_program_v4(p_request_id text, p_intent jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_receipt public.program_start_receipts%rowtype;
  v_active public.program_instances%rowtype;
  v_template public.program_template_versions%rowtype;
  v_policy public.equipment_mode_policy_versions%rowtype;
  v_program_id uuid;
  v_expected_id uuid;
  v_expected_version integer;
  v_started_at timestamptz;
  v_result jsonb;
  v_value jsonb;
  v_required jsonb;
  v_name text;
  v_date date;
  v_template_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_request_id is null or length(p_request_id) > 200 or nullif(btrim(p_request_id), '') is null
    or p_intent is null or jsonb_typeof(p_intent) <> 'object' or octet_length(p_intent::text) > 1000000 then
    raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
  end if;
  -- The same account lock is used by start/finish/discard/progression/equipment/end.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  select * into v_receipt from public.program_start_receipts where user_id = v_user and request_id = p_request_id;
  if found then
    if v_receipt.intent is distinct from p_intent then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'PT409';
    end if;
    return v_receipt.receipt;
  end if;
  if exists(select 1 from public.program_instances where user_id = v_user and client_mutation_id = p_request_id) then
    raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'PT409';
  end if;

  if not (p_intent ?& array['version','templateId','templateVersionId','definitionChecksum','title','startDate',
      'units','rounding','currentBlockId','stateValues','movementOverrides','accessoryAdditions','equipmentMode',
      'freeWeightPolicyVersionId','freeWeightPolicyChecksum','freeWeightChoices','expectedActiveProgram'])
    or (p_intent - array['version','templateId','templateVersionId','definitionChecksum','title','startDate',
      'units','rounding','currentBlockId','stateValues','movementOverrides','accessoryAdditions','equipmentMode',
      'freeWeightPolicyVersionId','freeWeightPolicyChecksum','freeWeightChoices','expectedActiveProgram']) <> '{}'::jsonb
    or p_intent->'version' <> '1'::jsonb
    or p_intent->>'units' not in ('kg','lb')
    or p_intent->>'equipmentMode' not in ('standard','free_weight')
    or jsonb_typeof(p_intent->'rounding') <> 'number'
    or (p_intent->>'rounding')::numeric <= 0 or (p_intent->>'rounding')::numeric > 1000
    or coalesce(p_intent->>'definitionChecksum','') !~ '^[0-9a-f]{32}$' then
    raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
  end if;
  foreach v_name in array array['templateId','templateVersionId','definitionChecksum','title','startDate','units','equipmentMode'] loop
    if jsonb_typeof(p_intent->v_name) <> 'string' or length(p_intent->>v_name) > 200
      or nullif(btrim(p_intent->>v_name), '') is null then
      raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
    end if;
  end loop;
  if p_intent->>'templateId' !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]*$'
    or (jsonb_typeof(p_intent->'currentBlockId') <> 'null' and
      (jsonb_typeof(p_intent->'currentBlockId') <> 'string' or length(p_intent->>'currentBlockId') not between 1 and 200)) then
    raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
  end if;
  begin
    v_template_id := (p_intent->>'templateVersionId')::uuid;
    v_date := (p_intent->>'startDate')::date;
    if to_char(v_date, 'YYYY-MM-DD') <> p_intent->>'startDate' then raise invalid_datetime_format; end if;
    if p_intent->'expectedActiveProgram' <> 'null'::jsonb then
      if jsonb_typeof(p_intent->'expectedActiveProgram') <> 'object'
        or not ((p_intent->'expectedActiveProgram') ?& array['id','stateVersion'])
        or ((p_intent->'expectedActiveProgram') - array['id','stateVersion']) <> '{}'::jsonb
        or jsonb_typeof(p_intent#>'{expectedActiveProgram,stateVersion}') <> 'number' then
        raise invalid_parameter_value;
      end if;
      v_expected_id := (p_intent#>>'{expectedActiveProgram,id}')::uuid;
      v_expected_version := (p_intent#>>'{expectedActiveProgram,stateVersion}')::integer;
      if v_expected_id is null or v_expected_version < 0
        or v_expected_version::numeric <> (p_intent#>>'{expectedActiveProgram,stateVersion}')::numeric then
        raise invalid_parameter_value;
      end if;
    end if;
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or invalid_parameter_value or numeric_value_out_of_range then
    raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
  end;
  foreach v_name in array array['stateValues','movementOverrides','accessoryAdditions','freeWeightChoices'] loop
    if jsonb_typeof(p_intent->v_name) <> 'array' then
      raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
    end if;
    if jsonb_array_length(p_intent->v_name) > (case when v_name = 'freeWeightChoices' then 1000 else 500 end) then
      raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
    end if;
  end loop;

  select * into v_active from public.program_instances
    where user_id = v_user and status = 'active' order by created_at desc, id desc limit 1 for update;
  if v_active.id is distinct from v_expected_id
    or (v_active.id is not null and v_active.state_version is distinct from v_expected_version) then
    raise exception 'PROGRAM_START_REVIEW_STALE' using errcode = 'PT409';
  end if;
  if exists(select 1 from public.workout_sessions where user_id = v_user and status = 'in_progress') then
    raise exception 'PROGRAM_START_ACTIVE_WORKOUT' using errcode = 'PT409';
  end if;
  if exists(select 1 from public.progression_decisions where user_id = v_user and status = 'pending') then
    raise exception 'PROGRAM_START_PENDING_REVIEW' using errcode = 'PT409';
  end if;

  select version.* into v_template from public.program_template_versions version
    join public.program_templates template on template.id = version.template_id
    where template.id = p_intent->>'templateId' and template.is_active
      and (template.created_by is null or template.created_by = v_user)
    order by version.created_at desc, version.id desc limit 1 for share of template, version;
  if not found or v_template.id <> v_template_id or v_template.definition_checksum <> p_intent->>'definitionChecksum'
    or (v_template.definition#>>'{weeks,0,phaseKey}') is distinct from p_intent->>'currentBlockId' then
    raise exception 'PROGRAM_START_TEMPLATE_STALE' using errcode = 'PT409';
  end if;
  -- Every required state is supplied once in the selected units and refers to its actual movement/type.
  if jsonb_array_length(p_intent->'stateValues') <> jsonb_array_length(v_template.definition->'requiredState')
    or exists(select 1 from jsonb_array_elements(p_intent->'stateValues') value
      group by value->>'key' having count(*) > 1) then
    raise exception 'PROGRAM_START_STATE_INVALID' using errcode = '22023';
  end if;
  for v_required in select value from jsonb_array_elements(v_template.definition->'requiredState') loop
    select value into v_value from jsonb_array_elements(p_intent->'stateValues') value where value->>'key' = v_required->>'key';
    if not found or jsonb_typeof(v_value) <> 'object' or jsonb_typeof(v_value->'value') <> 'number'
      or (v_value->>'value')::numeric <= 0 or (v_value->>'movementId') is distinct from v_required->>'movementId'
      or (v_value->>'type') is distinct from v_required->>'type' or (v_value->>'unit') is distinct from p_intent->>'units'
      or (v_value - array['key','movementId','type','label','value','unit']) <> '{}'::jsonb then
      raise exception 'PROGRAM_START_STATE_INVALID' using errcode = '22023';
    end if;
  end loop;
  for v_value in select value from jsonb_array_elements(p_intent->'movementOverrides') loop
    if jsonb_typeof(v_value) <> 'object' or not (v_value ?& array['slotId','phaseKey','role','originalMovementId','replacementMovementId','effectiveFromWeekIndex'])
      or v_value->>'role' not in ('variation','accessory') or v_value->'effectiveFromWeekIndex' <> '0'::jsonb then
      raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
    end if;
  end loop;
  for v_value in select value from jsonb_array_elements(p_intent->'accessoryAdditions') loop
    if jsonb_typeof(v_value) <> 'object' or not (v_value ?& array['sessionId','slotId','phaseKey','movementId','prescriptionId','sourceSlotId','effectiveFromWeekIndex','orderIndex'])
      or v_value->'effectiveFromWeekIndex' <> '0'::jsonb or jsonb_typeof(v_value->'orderIndex') <> 'number'
      or (v_value->>'orderIndex')::numeric < 1 or (v_value->>'orderIndex')::numeric <> trunc((v_value->>'orderIndex')::numeric) then
      raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
    end if;
  end loop;
  if p_intent->>'equipmentMode' = 'free_weight' then
    select * into v_policy from public.equipment_mode_policy_versions where mode = 'free_weight'
      order by created_at desc, id desc limit 1 for share;
    if not found or v_policy.id::text is distinct from p_intent->>'freeWeightPolicyVersionId'
      or v_policy.definition_checksum is distinct from p_intent->>'freeWeightPolicyChecksum' then
      raise exception 'FREE_WEIGHT_POLICY_STALE' using errcode = 'PT409';
    end if;
  elsif p_intent->'freeWeightPolicyVersionId' <> 'null'::jsonb or p_intent->'freeWeightPolicyChecksum' <> 'null'::jsonb
    or p_intent->'freeWeightChoices' <> '[]'::jsonb then
    raise exception 'PROGRAM_START_INPUT_INVALID' using errcode = '22023';
  end if;

  -- v3's destructive branches have no rows to act on under the same account lock.
  v_program_id := public.start_program_v3(p_request_id, p_intent->>'templateId', v_template_id,
    p_intent->>'definitionChecksum', p_intent->>'title', v_date, p_intent->>'units', (p_intent->>'rounding')::numeric,
    p_intent->>'currentBlockId', p_intent->'stateValues', p_intent->'movementOverrides', p_intent->'accessoryAdditions',
    v_expected_id is not null, p_intent->>'equipmentMode', (p_intent->>'freeWeightPolicyVersionId')::uuid,
    p_intent->>'freeWeightPolicyChecksum', p_intent->'freeWeightChoices');
  select created_at into v_started_at from public.program_instances where id = v_program_id and user_id = v_user;
  v_result := jsonb_build_object('requestId', p_request_id, 'programId', v_program_id, 'templateId', p_intent->>'templateId',
    'templateVersionId', v_template_id, 'startedAt', v_started_at);
  insert into public.program_start_receipts(user_id, program_instance_id, request_id, intent, receipt)
    values(v_user, v_program_id, p_request_id, p_intent, v_result);
  return v_result;
end;
$$;
