-- Explicit structured-block policy; weekly and unknown/custom routines keep repeating.
create function public.program_cycle_policy_v1(p_template_id text) returns text
language sql immutable set search_path = '' as $$
  select case when p_template_id in ('healthy-531-fsl','training_max_wave_pump_5day',
    'bromley-volume-intensity','bromley-bullmastiff','bromley-70s-powerlifter')
    then 'review_at_end' else 'auto_repeat' end;
$$;
alter table public.program_instances add column cycle_end_policy text not null default 'auto_repeat'
  check (cycle_end_policy in ('auto_repeat','review_at_end'));
update public.program_instances set cycle_end_policy = public.program_cycle_policy_v1(template_id);
create function public.set_program_cycle_policy_v1() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.cycle_end_policy := public.program_cycle_policy_v1(new.template_id);
  return new;
end;
$$;
create trigger set_program_cycle_policy before insert on public.program_instances
  for each row execute function public.set_program_cycle_policy_v1();

create table public.program_cycle_boundaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_instance_id uuid not null,
  session_id uuid not null unique,
  template_version_id uuid not null references public.program_template_versions(id),
  cycle_number integer not null check (cycle_number > 0),
  next_session_index integer not null check (next_session_index > 0),
  completed_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','repeated','replaced','ended')),
  resolved_at timestamptz,
  unique (program_instance_id, cycle_number),
  unique (id, user_id),
  foreign key (program_instance_id, user_id) references public.program_instances(id, user_id) on delete cascade,
  foreign key (session_id, user_id) references public.workout_sessions(id, user_id) on delete cascade,
  check ((status = 'pending') = (resolved_at is null))
);
create unique index program_one_pending_cycle on public.program_cycle_boundaries(program_instance_id) where status = 'pending';
create table public.program_cycle_repeat_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (length(request_id) between 1 and 200),
  boundary_id uuid not null,
  intent jsonb not null,
  receipt jsonb not null,
  reviewed_weights jsonb not null,
  primary key (user_id, request_id),
  foreign key (boundary_id, user_id) references public.program_cycle_boundaries(id, user_id) on delete cascade
);
alter table public.program_cycle_boundaries enable row level security;
alter table public.program_cycle_repeat_receipts enable row level security;
create policy cycle_boundary_owner_read on public.program_cycle_boundaries for select to authenticated using (auth.uid() = user_id);
create policy cycle_repeat_owner_read on public.program_cycle_repeat_receipts for select to authenticated using (auth.uid() = user_id);
revoke all on public.program_cycle_boundaries, public.program_cycle_repeat_receipts from public, anon, authenticated;
grant select on public.program_cycle_boundaries, public.program_cycle_repeat_receipts to authenticated;

-- Runs inside every Finish version, before the existing cursor increment. No historical backfill.
create function public.record_program_cycle_boundary_v1() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_program public.program_instances%rowtype; v_definition jsonb; v_length integer; v_index integer;
begin
  if old.status <> 'in_progress' or new.status <> 'completed' or new.program_instance_id is null then return new; end if;
  select * into v_program from public.program_instances where id = new.program_instance_id and user_id = new.user_id for update;
  if v_program.cycle_end_policy <> 'review_at_end' or v_program.status <> 'active' then return new; end if;
  select definition into v_definition from public.program_template_versions where id = v_program.template_version_id;
  v_length := (v_definition->>'durationWeeks')::integer * (v_definition->>'daysPerWeek')::integer;
  if v_length is null or v_length <= 0 or coalesce(new.prescription_snapshot->>'weekIndex','') !~ '^[0-9]+$' then return new; end if;
  v_index := (new.prescription_snapshot->>'weekIndex')::integer;
  if v_index <> v_program.current_week_index or (v_index + 1) % v_length <> 0 then return new; end if;
  insert into public.program_cycle_boundaries(user_id,program_instance_id,session_id,template_version_id,cycle_number,next_session_index,completed_at)
    values(new.user_id,new.program_instance_id,new.id,v_program.template_version_id,(v_index+1)/v_length,v_index+1,new.completed_at);
  return new;
end;
$$;
create trigger record_program_cycle_boundary after update of status on public.workout_sessions
  for each row execute function public.record_program_cycle_boundary_v1();

create function public.guard_program_cycle_transition_v1() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_boundary public.program_cycle_boundaries%rowtype;
begin
  select * into v_boundary from public.program_cycle_boundaries where program_instance_id = old.id and status = 'pending';
  if not found then return new; end if;
  if new.current_week_index <> old.current_week_index
    and not (old.current_week_index = v_boundary.next_session_index - 1 and new.current_week_index = v_boundary.next_session_index) then
    raise exception 'CYCLE_REVIEW_REQUIRED: resolve the completed cycle in Today or Plan' using errcode = 'PT409';
  end if;
  if new.status <> old.status then
    if new.status not in ('archived','completed') then raise exception 'CYCLE_REVIEW_REQUIRED' using errcode = 'PT409'; end if;
    if exists(select 1 from public.progression_decisions where program_instance_id = old.id and status = 'pending') then
      raise exception 'CYCLE_PENDING_PROGRESSION' using errcode = 'PT409';
    end if;
    update public.program_cycle_boundaries set status = case when new.end_reason = 'manual' then 'ended' else 'replaced' end,
      resolved_at = now() where id = v_boundary.id;
  end if;
  return new;
end;
$$;
create trigger guard_program_cycle_transition before update on public.program_instances
  for each row execute function public.guard_program_cycle_transition_v1();

-- Shared inner start covers planned, blank, favourites, and old RPC versions.
alter function public.start_session_before_return(text,uuid,text,date,jsonb,integer,uuid) rename to start_session_before_cycle;
create function public.start_session_before_return(p_client_mutation_id text,p_program_instance_id uuid,p_planned_session_id text,
  p_scheduled_date date,p_prescription_snapshot jsonb,p_expected_program_version integer,p_source_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_existing uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  select id into v_existing from public.workout_sessions where user_id = auth.uid() and client_mutation_id = p_client_mutation_id;
  if v_existing is not null then return v_existing; end if;
  select id into v_existing from public.workout_sessions where user_id = auth.uid() and status = 'in_progress';
  if v_existing is not null then return v_existing; end if;
  if exists(select 1 from public.program_cycle_boundaries boundary join public.program_instances program on program.id = boundary.program_instance_id
    where boundary.user_id = auth.uid() and boundary.status = 'pending' and program.status = 'active') then
    raise exception 'CYCLE_REVIEW_REQUIRED: Your cycle is complete. Open Today or Plan to repeat, replace or end it. Update the app if these choices are unavailable.' using errcode = 'PT409';
  end if;
  return public.start_session_before_cycle(p_client_mutation_id,p_program_instance_id,p_planned_session_id,p_scheduled_date,
    p_prescription_snapshot,p_expected_program_version,p_source_session_id);
end;
$$;
revoke all on function public.start_session_before_return(text,uuid,text,date,jsonb,integer,uuid),
  public.start_session_before_cycle(text,uuid,text,date,jsonb,integer,uuid) from public,anon,authenticated;

create function public.repeat_program_cycle_v1(p_program_id uuid,p_boundary_id uuid,p_expected_version integer,p_request_id text,p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_program public.program_instances%rowtype; v_boundary public.program_cycle_boundaries%rowtype;
  v_prior public.program_cycle_repeat_receipts%rowtype; v_intent jsonb; v_receipt jsonb; v_weights jsonb; v_time timestamptz := now();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_expected_user_id is distinct from v_user then raise exception 'ACCOUNT_CHANGED' using errcode = '42501'; end if;
  if p_program_id is null or p_boundary_id is null or p_expected_version is null or p_expected_version < 0
    or p_request_id is null or nullif(btrim(p_request_id),'') is null or length(p_request_id) > 200 then
    raise exception 'CYCLE_INPUT_INVALID' using errcode = '22023';
  end if;
  v_intent := jsonb_build_object('programId',p_program_id,'boundaryId',p_boundary_id,'expectedVersion',p_expected_version);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,0));
  select * into v_prior from public.program_cycle_repeat_receipts where user_id = v_user and request_id = p_request_id;
  if found then
    if v_prior.intent is distinct from v_intent then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'PT409'; end if;
    return v_prior.receipt;
  end if;
  select * into v_program from public.program_instances where id = p_program_id and user_id = v_user for update;
  select * into v_boundary from public.program_cycle_boundaries where id = p_boundary_id and program_instance_id = p_program_id and user_id = v_user for update;
  if v_program.id is null or v_program.status <> 'active' or v_boundary.id is null or v_boundary.status <> 'pending'
    or v_program.current_week_index <> v_boundary.next_session_index then raise exception 'CYCLE_NO_LONGER_PENDING' using errcode = 'PT409'; end if;
  if v_program.state_version <> p_expected_version then raise exception 'CYCLE_VERSION_CONFLICT' using errcode = 'PT409'; end if;
  if exists(select 1 from public.workout_sessions where user_id = v_user and status = 'in_progress') then
    raise exception 'CYCLE_ACTIVE_WORKOUT' using errcode = 'PT409'; end if;
  if exists(select 1 from public.progression_decisions where program_instance_id = p_program_id and user_id = v_user and status = 'pending') then
    raise exception 'CYCLE_PENDING_PROGRESSION' using errcode = 'PT409'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('key',key,'type',state_type,'value',value,'unit',unit) order by key),'[]')
    into v_weights from public.program_state_values where program_instance_id = p_program_id and user_id = v_user;
  update public.program_cycle_boundaries set status = 'repeated',resolved_at = v_time where id = p_boundary_id;
  update public.program_instances set state_version = state_version+1,updated_at = v_time where id = p_program_id;
  v_receipt := jsonb_build_object('programId',p_program_id,'boundaryId',p_boundary_id,'stateVersion',p_expected_version+1,
    'nextSessionIndex',v_boundary.next_session_index,'repeatedAt',v_time);
  insert into public.program_cycle_repeat_receipts(user_id,request_id,boundary_id,intent,receipt,reviewed_weights)
    values(v_user,p_request_id,p_boundary_id,v_intent,v_receipt,v_weights);
  return v_receipt;
end;
$$;
revoke all on function public.repeat_program_cycle_v1(uuid,uuid,integer,text,uuid) from public,anon;
grant execute on function public.repeat_program_cycle_v1(uuid,uuid,integer,text,uuid) to authenticated;
revoke all on function public.program_cycle_policy_v1(text),public.set_program_cycle_policy_v1(),
  public.record_program_cycle_boundary_v1(),public.guard_program_cycle_transition_v1() from public,anon,authenticated;
