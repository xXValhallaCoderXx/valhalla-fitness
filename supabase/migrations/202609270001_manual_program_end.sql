-- Explicitly ending a plan preserves training history and its progression decisions.
alter table public.program_instances
  add column ended_at timestamptz,
  add column end_reason text,
  add constraint program_instances_manual_end_check check (
    (ended_at is null and end_reason is null)
    or (ended_at is not null and end_reason is not null and end_reason = 'manual' and status = 'completed')
  );

create table public.program_end_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_instance_id uuid not null,
  request_id text not null check (length(request_id) between 1 and 200),
  intent jsonb not null,
  resulting_version integer not null,
  ended_at timestamptz not null,
  unique (user_id, request_id),
  foreign key (program_instance_id, user_id) references public.program_instances(id, user_id) on delete cascade
);
alter table public.program_end_receipts enable row level security;
create policy program_end_receipt_owner_read on public.program_end_receipts
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.program_end_receipts from public, anon, authenticated;
grant select on public.program_end_receipts to authenticated;

create function public.end_program_v1(p_program_id uuid, p_expected_version integer, p_request_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_program public.program_instances%rowtype;
  v_receipt public.program_end_receipts%rowtype;
  v_intent jsonb;
  v_ended_at timestamptz;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_program_id is null or p_expected_version is null or p_expected_version < 0
    or p_request_id is null or nullif(btrim(p_request_id), '') is null or length(p_request_id) > 200 then
    raise exception 'PROGRAM_END_INPUT_INVALID' using errcode = '22023';
  end if;
  v_intent := jsonb_build_object('programId', p_program_id, 'expectedVersion', p_expected_version);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));
  select * into v_receipt from public.program_end_receipts
    where user_id = v_user_id and request_id = p_request_id;
  if found then
    if v_receipt.intent is distinct from v_intent then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'PT409';
    end if;
    return jsonb_build_object('programId', v_receipt.program_instance_id,
      'stateVersion', v_receipt.resulting_version, 'endedAt', v_receipt.ended_at);
  end if;
  select * into v_program from public.program_instances
    where id = p_program_id and user_id = v_user_id for update;
  if not found or v_program.status <> 'active' then
    raise exception 'PROGRAM_NOT_ACTIVE' using errcode = 'PT409';
  end if;
  if v_program.state_version <> p_expected_version then
    raise exception 'PROGRAM_VERSION_CONFLICT' using errcode = 'PT409';
  end if;
  if exists(select 1 from public.workout_sessions where user_id = v_user_id
    and program_instance_id = p_program_id and status = 'in_progress') then
    raise exception 'PROGRAM_END_ACTIVE_WORKOUT' using errcode = 'PT409';
  end if;
  if exists(select 1 from public.progression_decisions where user_id = v_user_id
    and program_instance_id = p_program_id and status = 'pending') then
    raise exception 'PROGRAM_END_PENDING_REVIEW' using errcode = 'PT409';
  end if;
  v_ended_at := now();
  update public.program_instances set status = 'completed', ended_at = v_ended_at,
    end_reason = 'manual', state_version = state_version + 1, updated_at = v_ended_at
    where id = p_program_id;
  -- The existing status-change trigger cancels an active/review return guide.
  insert into public.program_end_receipts(user_id, program_instance_id, request_id, intent, resulting_version, ended_at)
    values(v_user_id, p_program_id, p_request_id, v_intent, v_program.state_version + 1, v_ended_at);
  return jsonb_build_object('programId', p_program_id, 'stateVersion', v_program.state_version + 1, 'endedAt', v_ended_at);
end;
$$;
revoke all on function public.end_program_v1(uuid, integer, text) from public, anon;
grant execute on function public.end_program_v1(uuid, integer, text) to authenticated;
