-- Release integrity foundations.
--
-- This migration is deliberately fail-safe. If production already contains
-- duplicate active rows or cross-owner child rows, the constraint/index
-- creation below must stop so the data can be audited explicitly.

alter table public.profiles
  add column if not exists timezone text;

alter table public.program_instances
  add column if not exists client_mutation_id text,
  add column if not exists state_version integer not null default 0;

alter table public.workout_sessions
  add column if not exists finish_request_id text,
  add column if not exists finish_payload_hash text,
  add column if not exists discard_journal_version integer,
  add column if not exists state_version integer not null default 0;

alter table public.progression_decisions
  add column if not exists resolution_request_id text;

alter table public.program_template_versions
  add column if not exists definition_checksum text
  generated always as (md5(definition::text)) stored;

create function public.protect_pinned_template_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changes_pinned_value boolean;
begin
  if tg_op = 'DELETE' then
    v_changes_pinned_value := true;
  else
    v_changes_pinned_value :=
      new.definition is distinct from old.definition or
      new.template_id is distinct from old.template_id or
      new.version is distinct from old.version;
  end if;

  if v_changes_pinned_value then
    if exists (
      select 1
      from public.program_instances
      where template_version_id = old.id
    ) then
      raise exception 'PINNED_TEMPLATE_IMMUTABLE' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_pinned_template_version()
  from public, anon, authenticated;

create trigger protect_pinned_template_version
before update or delete on public.program_template_versions
for each row execute function public.protect_pinned_template_version();

-- Workouts already in progress at deploy time are intentionally left without
-- a journal version. Their pre-migration programme edits cannot be proven
-- restorable, so discard must block. Only the atomic start RPC certifies new
-- programmed sessions by writing version 1 explicitly.
update public.workout_sessions
set discard_journal_version = 1
where discard_journal_version is null
  and (status <> 'in_progress' or program_instance_id is null);

do $$
begin
  if exists (
    select 1
    from public.program_instances
    where status = 'active'
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Integrity audit required: a user has multiple active programmes.';
  end if;

  if exists (
    select 1
    from public.workout_sessions
    where status = 'in_progress'
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Integrity audit required: a user has multiple in-progress workouts.';
  end if;

  if exists (
    select 1
    from public.program_instances as program
    join public.program_templates as template
      on template.id = program.template_id
    where template.created_by is not null
      and program.user_id <> template.created_by
  ) then
    raise exception 'Integrity audit required: a programme pins another account''s custom template.';
  end if;
end;
$$;

create unique index if not exists program_instances_one_active_per_user_idx
  on public.program_instances(user_id)
  where status = 'active';

create unique index if not exists workout_sessions_one_in_progress_per_user_idx
  on public.workout_sessions(user_id)
  where status = 'in_progress';

create unique index if not exists program_instances_user_client_mutation_id_idx
  on public.program_instances(user_id, client_mutation_id)
  where client_mutation_id is not null;

-- Idempotency tokens are scoped to an account. The original schema made
-- workout/set tokens globally unique, allowing an unrelated account to
-- reserve a caller-chosen token.
alter table public.workout_sessions
  drop constraint if exists workout_sessions_client_mutation_id_key;

create unique index if not exists workout_sessions_user_finish_request_id_idx
  on public.workout_sessions(user_id, finish_request_id)
  where finish_request_id is not null;

create unique index if not exists workout_sessions_user_client_mutation_id_idx
  on public.workout_sessions(user_id, client_mutation_id)
  where client_mutation_id is not null;

alter table public.set_logs
  drop constraint if exists set_logs_client_mutation_id_key;

create unique index if not exists set_logs_user_client_mutation_id_idx
  on public.set_logs(user_id, client_mutation_id)
  where client_mutation_id is not null;

create index if not exists workout_sessions_user_status_completed_idx
  on public.workout_sessions(user_id, status, completed_at desc);

create index if not exists workout_sessions_user_scheduled_idx
  on public.workout_sessions(user_id, scheduled_date desc);

create index if not exists exercise_logs_user_movement_session_idx
  on public.exercise_logs(user_id, performed_movement_id, session_id);

create index if not exists set_logs_user_exercise_completed_idx
  on public.set_logs(user_id, exercise_log_id, completed);

create index if not exists progression_decisions_user_program_status_idx
  on public.progression_decisions(user_id, program_instance_id, status);

create index if not exists program_instances_user_template_status_idx
  on public.program_instances(user_id, template_id, status);

alter table public.program_instances
  add constraint program_instances_id_user_id_key unique (id, user_id);

alter table public.workout_sessions
  add constraint workout_sessions_id_user_id_key unique (id, user_id);

-- Durable mutation receipts make retry semantics independent of child-row
-- uniqueness. A token is scoped to an account, bound to exactly one mutation
-- payload, and removed with its workout or account.
create table public.session_mutation_receipts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id text not null,
  session_id uuid not null,
  mutation_kind text not null check (
    mutation_kind in (
      'rename_session',
      'upsert_set',
      'add_session_accessory',
      'reorder_session_accessories',
      'remove_session_accessory',
      'add_ad_hoc_exercise',
      'remove_ad_hoc_exercise',
      'add_session_set',
      'substitute_session_movement'
    )
  ),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{32}$'),
  resulting_state_version integer not null check (resulting_state_version > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, request_id),
  foreign key (session_id, user_id)
    references public.workout_sessions(id, user_id)
    on delete cascade
);

create index session_mutation_receipts_session_idx
  on public.session_mutation_receipts(session_id, user_id);

alter table public.session_mutation_receipts enable row level security;

-- Receipts are an internal integrity ledger. Authenticated clients interact
-- with them only through the guarded SECURITY DEFINER mutation functions.
revoke all on table public.session_mutation_receipts
  from public, anon, authenticated;
grant select on table public.session_mutation_receipts to service_role;

alter table public.exercise_logs
  add constraint exercise_logs_id_user_id_key unique (id, user_id);

alter table public.progression_decisions
  add constraint progression_decisions_id_user_id_key unique (id, user_id);

alter table public.program_template_versions
  add constraint program_template_versions_id_template_id_key unique (id, template_id);

alter table public.program_instances
  add constraint program_instances_template_version_matches_template_fkey
  foreign key (template_version_id, template_id)
  references public.program_template_versions(id, template_id)
  not valid;

alter table public.workout_sessions
  add constraint workout_sessions_program_owner_fkey
  foreign key (program_instance_id, user_id)
  references public.program_instances(id, user_id)
  not valid;

alter table public.workout_sessions
  add constraint workout_sessions_source_owner_fkey
  foreign key (source_session_id, user_id)
  references public.workout_sessions(id, user_id)
  not valid;

alter table public.exercise_logs
  add constraint exercise_logs_session_owner_fkey
  foreign key (session_id, user_id)
  references public.workout_sessions(id, user_id)
  not valid;

alter table public.set_logs
  add constraint set_logs_exercise_owner_fkey
  foreign key (exercise_log_id, user_id)
  references public.exercise_logs(id, user_id)
  not valid;

alter table public.substitution_logs
  add constraint substitution_logs_session_owner_fkey
  foreign key (session_id, user_id)
  references public.workout_sessions(id, user_id)
  not valid;

alter table public.progression_decisions
  add constraint progression_decisions_program_owner_fkey
  foreign key (program_instance_id, user_id)
  references public.program_instances(id, user_id)
  not valid;

alter table public.program_state_values
  add constraint program_state_values_program_owner_fkey
  foreign key (program_instance_id, user_id)
  references public.program_instances(id, user_id)
  not valid;

alter table public.program_movement_overrides
  add constraint program_movement_overrides_program_owner_fkey
  foreign key (program_instance_id, user_id)
  references public.program_instances(id, user_id)
  not valid;

alter table public.program_movement_overrides
  add constraint program_movement_overrides_source_session_owner_fkey
  foreign key (source_session_id, user_id)
  references public.workout_sessions(id, user_id)
  not valid;

alter table public.program_movement_overrides
  add constraint program_movement_overrides_source_exercise_owner_fkey
  foreign key (source_exercise_log_id, user_id)
  references public.exercise_logs(id, user_id)
  not valid;

alter table public.program_accessory_additions
  add constraint program_accessory_additions_program_owner_fkey
  foreign key (program_instance_id, user_id)
  references public.program_instances(id, user_id)
  not valid;

alter table public.session_program_change_journal
  add constraint session_program_change_journal_session_owner_fkey
  foreign key (session_id, user_id)
  references public.workout_sessions(id, user_id)
  not valid;

alter table public.session_program_change_journal
  add constraint session_program_change_journal_program_owner_fkey
  foreign key (program_instance_id, user_id)
  references public.program_instances(id, user_id)
  not valid;

alter table public.feedback_events
  add constraint feedback_events_session_owner_fkey
  foreign key (session_id, user_id)
  references public.workout_sessions(id, user_id)
  not valid;

alter table public.feedback_events
  add constraint feedback_events_decision_owner_fkey
  foreign key (decision_id, user_id)
  references public.progression_decisions(id, user_id)
  not valid;

alter table public.set_logs
  add constraint set_logs_set_index_range_check
  check (set_index between 0 and 1000) not valid,
  add constraint set_logs_actual_load_nonnegative_check
  check (actual_load is null or actual_load between 0 and 100000) not valid,
  add constraint set_logs_actual_reps_nonnegative_check
  check (actual_reps is null or actual_reps between 0 and 1000) not valid,
  add constraint set_logs_actual_rir_range_check
  check (actual_rir is null or actual_rir between 0 and 10) not valid,
  add constraint set_logs_actual_rpe_range_check
  check (actual_rpe is null or actual_rpe between 0 and 10) not valid,
  add constraint set_logs_target_load_range_check
  check (target_load is null or target_load between 0 and 100000) not valid,
  add constraint set_logs_target_reps_range_check
  check (target_reps is null or target_reps between 0 and 1000) not valid,
  add constraint set_logs_target_rep_min_range_check
  check (target_rep_min is null or target_rep_min between 0 and 1000) not valid,
  add constraint set_logs_target_rep_max_range_check
  check (target_rep_max is null or target_rep_max between 0 and 1000) not valid,
  add constraint set_logs_target_rep_order_check
  check (
    target_rep_min is null or
    target_rep_max is null or
    target_rep_min <= target_rep_max
  ) not valid,
  add constraint set_logs_target_rir_range_check
  check (target_rir is null or target_rir between 0 and 10) not valid,
  add constraint set_logs_target_rpe_range_check
  check (target_rpe is null or target_rpe between 0 and 10) not valid;

alter table public.workout_sessions
  add constraint workout_sessions_finish_payload_hash_format_check
  check (
    finish_payload_hash is null
    or finish_payload_hash ~ '^[0-9a-f]{32}$'
  ) not valid,
  add constraint workout_sessions_state_version_nonnegative_check
  check (state_version >= 0) not valid;

alter table public.workout_sessions validate constraint workout_sessions_program_owner_fkey;
alter table public.workout_sessions validate constraint workout_sessions_source_owner_fkey;
alter table public.program_instances validate constraint program_instances_template_version_matches_template_fkey;
alter table public.exercise_logs validate constraint exercise_logs_session_owner_fkey;
alter table public.set_logs validate constraint set_logs_exercise_owner_fkey;
alter table public.substitution_logs validate constraint substitution_logs_session_owner_fkey;
alter table public.progression_decisions validate constraint progression_decisions_program_owner_fkey;
alter table public.program_state_values validate constraint program_state_values_program_owner_fkey;
alter table public.program_movement_overrides validate constraint program_movement_overrides_program_owner_fkey;
alter table public.program_movement_overrides validate constraint program_movement_overrides_source_session_owner_fkey;
alter table public.program_movement_overrides validate constraint program_movement_overrides_source_exercise_owner_fkey;
alter table public.program_accessory_additions validate constraint program_accessory_additions_program_owner_fkey;
alter table public.session_program_change_journal validate constraint session_program_change_journal_session_owner_fkey;
alter table public.session_program_change_journal validate constraint session_program_change_journal_program_owner_fkey;
alter table public.feedback_events validate constraint feedback_events_session_owner_fkey;
alter table public.feedback_events validate constraint feedback_events_decision_owner_fkey;
alter table public.set_logs validate constraint set_logs_set_index_range_check;
alter table public.set_logs validate constraint set_logs_actual_load_nonnegative_check;
alter table public.set_logs validate constraint set_logs_actual_reps_nonnegative_check;
alter table public.set_logs validate constraint set_logs_actual_rir_range_check;
alter table public.set_logs validate constraint set_logs_actual_rpe_range_check;
alter table public.set_logs validate constraint set_logs_target_load_range_check;
alter table public.set_logs validate constraint set_logs_target_reps_range_check;
alter table public.set_logs validate constraint set_logs_target_rep_min_range_check;
alter table public.set_logs validate constraint set_logs_target_rep_max_range_check;
alter table public.set_logs validate constraint set_logs_target_rep_order_check;
alter table public.set_logs validate constraint set_logs_target_rir_range_check;
alter table public.set_logs validate constraint set_logs_target_rpe_range_check;
alter table public.workout_sessions validate constraint workout_sessions_finish_payload_hash_format_check;
alter table public.workout_sessions validate constraint workout_sessions_state_version_nonnegative_check;

-- Preserve the existing public function name for installed clients, but put a
-- restore-safety gate in front of the original implementation.
alter function public.discard_workout_session(uuid)
  rename to discard_workout_session_unsafe_internal;

revoke all on function public.discard_workout_session_unsafe_internal(uuid)
  from public, anon, authenticated;

create function public.discard_workout_session(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
  for update;

  if not found or v_session.status <> 'in_progress' then
    raise exception 'SESSION_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  if v_session.program_instance_id is not null
    and coalesce(v_session.discard_journal_version, 0) < 1 then
    raise exception 'DISCARD_NOT_RESTORE_SAFE' using errcode = 'P0001';
  end if;

  return public.discard_workout_session_unsafe_internal(p_session_id);
end;
$$;

revoke all on function public.discard_workout_session(uuid)
  from public, anon;
grant execute on function public.discard_workout_session(uuid)
  to authenticated;

create function public.upsert_session_set_v2(
  p_session_id uuid,
  p_exercise_log_id uuid,
  p_set_index integer,
  p_actual_load numeric,
  p_actual_reps integer,
  p_actual_rir numeric,
  p_actual_rpe numeric,
  p_completed boolean,
  p_note text,
  p_client_mutation_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_set_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_set_index < 0 or p_set_index > 1000
    or p_actual_load not between 0 and 100000
    or p_actual_reps not between 0 and 1000
    or p_actual_rir not between 0 and 10
    or p_actual_rpe not between 0 and 10
    or char_length(coalesce(p_note, '')) > 2000
    or nullif(trim(p_client_mutation_id), '') is null
    or char_length(p_client_mutation_id) > 200 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  select set_log.id
  into v_set_id
  from public.set_logs as set_log
  join public.exercise_logs as exercise
    on exercise.id = set_log.exercise_log_id
   and exercise.user_id = set_log.user_id
  join public.workout_sessions as workout
    on workout.id = exercise.session_id
   and workout.user_id = exercise.user_id
  where set_log.user_id = v_user_id
    and exercise.id = p_exercise_log_id
    and workout.id = p_session_id
    and set_log.set_index = p_set_index
    and workout.status = 'in_progress'
  for update of workout, set_log;

  if v_set_id is null then
    raise exception 'SET_SESSION_MISMATCH' using errcode = 'P0001';
  end if;

  update public.set_logs
  set
    actual_load = p_actual_load,
    actual_reps = p_actual_reps,
    actual_rir = p_actual_rir,
    actual_rpe = p_actual_rpe,
    completed = coalesce(p_completed, false),
    note = p_note,
    client_mutation_id = p_client_mutation_id
  where id = v_set_id
    and user_id = v_user_id;

  return p_session_id;
end;
$$;

revoke all on function public.upsert_session_set_v2(
  uuid, uuid, integer, numeric, integer, numeric, numeric, boolean, text, text
) from public, anon;

grant execute on function public.upsert_session_set_v2(
  uuid, uuid, integer, numeric, integer, numeric, numeric, boolean, text, text
) to authenticated;
