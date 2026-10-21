-- Resume and exact replay take precedence over a stale preview, on every client.
create or replace function public.start_session_v3(p_client_mutation_id text,p_program_instance_id uuid,p_planned_session_id text,p_scheduled_date date,p_prescription_snapshot jsonb,p_expected_program_version integer,p_source_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_existing uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  if not exists(select 1 from public.program_instances where id = p_program_instance_id and user_id = auth.uid()) then raise exception 'PROGRAM_NOT_ACTIVE'; end if;
  select id into v_existing from public.workout_sessions where user_id = auth.uid() and client_mutation_id = p_client_mutation_id;
  if v_existing is not null then return v_existing; end if;
  select id into v_existing from public.workout_sessions where user_id = auth.uid() and status = 'in_progress';
  if v_existing is not null then return v_existing; end if;
  if exists(select 1 from public.program_cycle_boundaries where program_instance_id = p_program_instance_id and user_id = auth.uid() and status = 'pending') then
    raise exception 'CYCLE_REVIEW_REQUIRED: Your cycle is complete. Open Today or Plan to repeat, replace or end it. Update the app if these choices are unavailable.' using errcode = 'PT409';
  end if;
  if p_planned_session_id is distinct from p_prescription_snapshot->>'id' then raise exception 'RETURN_TARGETS_INVALID'; end if;
  if not exists(select 1 from public.program_instances where id = p_program_instance_id and state_version = p_expected_program_version) then raise exception 'CONFLICT: refresh the planned workout' using errcode = 'PT409'; end if;
  perform public.validate_return_start_v1(p_program_instance_id,p_prescription_snapshot);
  return public.start_session_before_return(p_client_mutation_id,p_program_instance_id,p_planned_session_id,p_scheduled_date,p_prescription_snapshot,p_expected_program_version,p_source_session_id);
end;
$$;

-- Legacy replacements must not silently dismiss progression or discard a live workout at a boundary.
alter function public.start_program_v2(text,text,uuid,text,text,date,text,numeric,text,jsonb,jsonb,jsonb,boolean) rename to start_program_before_cycle;
create function public.start_program_v2(p_request_id text,p_template_id text,p_template_version_id uuid,p_definition_checksum text,
  p_title text,p_start_date date,p_units text,p_rounding numeric,p_current_block_id text,p_state_values jsonb,
  p_movement_overrides jsonb,p_accessory_additions jsonb,p_replace_active boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  if not exists(select 1 from public.program_instances where user_id = auth.uid() and client_mutation_id = p_request_id)
    and exists(select 1 from public.program_cycle_boundaries where user_id = auth.uid() and status = 'pending') then
    if exists(select 1 from public.workout_sessions where user_id = auth.uid() and status = 'in_progress') then
      raise exception 'CYCLE_ACTIVE_WORKOUT' using errcode = 'PT409'; end if;
    if exists(select 1 from public.progression_decisions where user_id = auth.uid() and status = 'pending') then
      raise exception 'CYCLE_PENDING_PROGRESSION' using errcode = 'PT409'; end if;
  end if;
  return public.start_program_before_cycle(p_request_id,p_template_id,p_template_version_id,p_definition_checksum,p_title,
    p_start_date,p_units,p_rounding,p_current_block_id,p_state_values,p_movement_overrides,p_accessory_additions,p_replace_active);
end;
$$;
revoke all on function public.start_program_before_cycle(text,text,uuid,text,text,date,text,numeric,text,jsonb,jsonb,jsonb,boolean) from public,anon,authenticated;
revoke all on function public.start_program_v2(text,text,uuid,text,text,date,text,numeric,text,jsonb,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.start_program_v2(text,text,uuid,text,text,date,text,numeric,text,jsonb,jsonb,jsonb,boolean) to authenticated;
