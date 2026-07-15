-- Discarding an in-progress workout must also undo future-program changes made
-- from that workout. Keep the first value touched for each persistent entity so
-- repeated edits still roll back to the state immediately before the workout.
-- Resolve any program workout already active at deploy time first: changes it
-- made before this journal existed cannot be reconstructed reliably.
create table public.session_program_change_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  program_instance_id uuid not null references public.program_instances(id) on delete cascade,
  entity_type text not null check (entity_type in ('movement_override', 'accessory_addition')),
  entity_key text not null,
  entity_id uuid not null,
  before_row jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, entity_type, entity_key)
);

create index session_program_change_journal_program_idx
  on public.session_program_change_journal(program_instance_id, session_id);

alter table public.session_program_change_journal enable row level security;

create policy "session program change journal is self owned"
  on public.session_program_change_journal
  for select
  using (auth.uid() = user_id);

grant select on public.session_program_change_journal to authenticated;
grant select on public.session_program_change_journal to service_role;
revoke all on public.session_program_change_journal from anon;

create or replace function public.refresh_program_customization_summary(
  p_program_instance_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_movement_override_count integer;
  v_accessory_addition_count integer;
begin
  select count(*)::integer
  into v_movement_override_count
  from public.program_movement_overrides
  where program_instance_id = p_program_instance_id
    and user_id = p_user_id;

  select count(*)::integer
  into v_accessory_addition_count
  from public.program_accessory_additions
  where program_instance_id = p_program_instance_id
    and user_id = p_user_id;

  update public.program_instances
  set
    customization_status = case
      when v_movement_override_count > 0 or v_accessory_addition_count > 0 then 'customized'
      else 'default'
    end,
    customization_summary = jsonb_build_object(
      'movementOverrideCount', v_movement_override_count,
      'accessoryAdditionCount', v_accessory_addition_count
    )
  where id = p_program_instance_id
    and user_id = p_user_id;
end;
$$;

revoke all on function public.refresh_program_customization_summary(uuid, uuid) from public, anon, authenticated;

create or replace function public.session_set_program_movement_override(
  p_session_id uuid,
  p_slot_id text,
  p_phase_key text,
  p_role text,
  p_original_movement_id text,
  p_replacement_movement_id text,
  p_source_exercise_log_id uuid,
  p_restore_default boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_program public.program_instances%rowtype;
  v_before jsonb;
  v_entity_id uuid;
  v_entity_key text := jsonb_build_array(p_slot_id, p_phase_key, p_role)::text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_session
  from public.workout_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if not found or v_session.status <> 'in_progress' then
    raise exception 'Only in-progress sessions can be edited.' using errcode = 'P0001';
  end if;
  if v_session.program_instance_id is null then
    raise exception 'Only program sessions can change future movements.' using errcode = 'P0001';
  end if;
  if p_role not in ('variation', 'accessory') then
    raise exception 'Invalid movement role.' using errcode = '22023';
  end if;

  select * into v_program
  from public.program_instances
  where id = v_session.program_instance_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Program not found.' using errcode = 'P0001';
  end if;

  perform 1
  from public.exercise_logs
  where id = p_source_exercise_log_id
    and session_id = p_session_id
    and user_id = v_user_id
    and slot_id = p_slot_id
    and role = p_role
    and planned_movement_id = p_original_movement_id;
  if not found then
    raise exception 'Movement selection is stale. Refresh and try again.' using errcode = 'P0001';
  end if;

  select to_jsonb(program_override), program_override.id
  into v_before, v_entity_id
  from public.program_movement_overrides as program_override
  where program_override.user_id = v_user_id
    and program_override.program_instance_id = v_program.id
    and program_override.slot_id = p_slot_id
    and program_override.phase_key = p_phase_key
    and program_override.role = p_role
  for update;

  v_entity_id := coalesce(v_entity_id, gen_random_uuid());
  insert into public.session_program_change_journal (
    user_id,
    session_id,
    program_instance_id,
    entity_type,
    entity_key,
    entity_id,
    before_row
  ) values (
    v_user_id,
    p_session_id,
    v_program.id,
    'movement_override',
    v_entity_key,
    v_entity_id,
    v_before
  )
  on conflict (session_id, entity_type, entity_key) do nothing;

  -- Reuse the journalled id after a default restore followed by another swap.
  select entity_id into v_entity_id
  from public.session_program_change_journal
  where session_id = p_session_id
    and entity_type = 'movement_override'
    and entity_key = v_entity_key;

  if p_restore_default then
    delete from public.program_movement_overrides
    where user_id = v_user_id
      and program_instance_id = v_program.id
      and slot_id = p_slot_id
      and phase_key = p_phase_key
      and role = p_role;
  else
    insert into public.program_movement_overrides (
      id,
      user_id,
      program_instance_id,
      slot_id,
      phase_key,
      role,
      original_movement_id,
      replacement_movement_id,
      effective_from_week_index,
      source_session_id,
      source_exercise_log_id
    ) values (
      v_entity_id,
      v_user_id,
      v_program.id,
      p_slot_id,
      p_phase_key,
      p_role,
      p_original_movement_id,
      p_replacement_movement_id,
      v_program.current_week_index + 1,
      p_session_id,
      p_source_exercise_log_id
    )
    on conflict (program_instance_id, slot_id, phase_key, role) do update set
      original_movement_id = excluded.original_movement_id,
      replacement_movement_id = excluded.replacement_movement_id,
      effective_from_week_index = excluded.effective_from_week_index,
      source_session_id = excluded.source_session_id,
      source_exercise_log_id = excluded.source_exercise_log_id;
  end if;

  perform public.refresh_program_customization_summary(v_program.id, v_user_id);
end;
$$;

create or replace function public.session_insert_program_accessory_addition(
  p_session_id uuid,
  p_template_session_id text,
  p_slot_id text,
  p_phase_key text,
  p_movement_id text,
  p_prescription_id text,
  p_target_summary text,
  p_sets jsonb,
  p_note text,
  p_progression_method text,
  p_effective_from_week_index integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_entity_id uuid := gen_random_uuid();
  v_order_index integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_session
  from public.workout_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if not found or v_session.status <> 'in_progress' then
    raise exception 'Only in-progress sessions can be edited.' using errcode = 'P0001';
  end if;
  if v_session.program_instance_id is null then
    raise exception 'Only program sessions can add future accessories.' using errcode = 'P0001';
  end if;
  if p_progression_method not in ('history_only', 'double_progression') then
    raise exception 'Invalid accessory progression method.' using errcode = '22023';
  end if;
  if p_effective_from_week_index < 0 then
    raise exception 'Invalid effective week.' using errcode = '22023';
  end if;

  perform 1
  from public.program_instances
  where id = v_session.program_instance_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Program not found.' using errcode = 'P0001';
  end if;

  select coalesce(max(order_index), 0) + 1
  into v_order_index
  from public.program_accessory_additions
  where user_id = v_user_id
    and program_instance_id = v_session.program_instance_id
    and session_id = p_template_session_id;

  insert into public.session_program_change_journal (
    user_id,
    session_id,
    program_instance_id,
    entity_type,
    entity_key,
    entity_id,
    before_row
  ) values (
    v_user_id,
    p_session_id,
    v_session.program_instance_id,
    'accessory_addition',
    v_entity_id::text,
    v_entity_id,
    null
  );

  insert into public.program_accessory_additions (
    id,
    user_id,
    program_instance_id,
    session_id,
    slot_id,
    phase_key,
    movement_id,
    prescription_id,
    source_slot_id,
    target_summary,
    sets,
    note,
    progression_method,
    effective_from_week_index,
    order_index
  ) values (
    v_entity_id,
    v_user_id,
    v_session.program_instance_id,
    p_template_session_id,
    p_slot_id,
    p_phase_key,
    p_movement_id,
    p_prescription_id,
    null,
    p_target_summary,
    coalesce(p_sets, '[]'::jsonb),
    p_note,
    p_progression_method,
    p_effective_from_week_index,
    v_order_index
  );

  perform public.refresh_program_customization_summary(v_session.program_instance_id, v_user_id);
  return v_entity_id;
end;
$$;

create or replace function public.session_reorder_program_accessory_additions(
  p_session_id uuid,
  p_addition_ids uuid[],
  p_order_indexes integer[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_index integer;
  v_addition public.program_accessory_additions%rowtype;
  v_template_session_id text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_addition_ids is null or p_order_indexes is null
    or cardinality(p_addition_ids) <> cardinality(p_order_indexes) then
    raise exception 'Invalid accessory order.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_order_indexes) as order_index where order_index is null or order_index < 1) then
    raise exception 'Invalid accessory order.' using errcode = '22023';
  end if;
  if cardinality(p_addition_ids) <> (
    select count(distinct addition_id) from unnest(p_addition_ids) as addition_id
  ) then
    raise exception 'Accessory order contains duplicate entries.' using errcode = '22023';
  end if;
  if cardinality(p_order_indexes) <> (
    select count(distinct order_index) from unnest(p_order_indexes) as order_index
  ) then
    raise exception 'Accessory order contains duplicate positions.' using errcode = '22023';
  end if;

  select * into v_session
  from public.workout_sessions
  where id = p_session_id and user_id = v_user_id
  for update;
  if not found or v_session.status <> 'in_progress' then
    raise exception 'Only in-progress sessions can be edited.' using errcode = 'P0001';
  end if;
  if v_session.program_instance_id is null then
    raise exception 'Only program sessions can reorder future accessories.' using errcode = 'P0001';
  end if;

  perform 1
  from public.program_instances
  where id = v_session.program_instance_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Program not found.' using errcode = 'P0001';
  end if;

  for v_index in select generate_subscripts(p_addition_ids, 1) loop
    select * into v_addition
    from public.program_accessory_additions
    where id = p_addition_ids[v_index]
      and user_id = v_user_id
      and program_instance_id = v_session.program_instance_id
    for update;
    if not found then
      raise exception 'Future accessory settings are stale. Refresh and try again.' using errcode = 'P0001';
    end if;
    if v_template_session_id is null then
      v_template_session_id := v_addition.session_id;
    elsif v_addition.session_id <> v_template_session_id then
      raise exception 'Future accessory settings are stale. Refresh and try again.' using errcode = 'P0001';
    end if;

    if v_addition.order_index <> p_order_indexes[v_index] then
      insert into public.session_program_change_journal (
        user_id,
        session_id,
        program_instance_id,
        entity_type,
        entity_key,
        entity_id,
        before_row
      ) values (
        v_user_id,
        p_session_id,
        v_session.program_instance_id,
        'accessory_addition',
        v_addition.id::text,
        v_addition.id,
        to_jsonb(v_addition)
      )
      on conflict (session_id, entity_type, entity_key) do nothing;

      update public.program_accessory_additions
      set order_index = p_order_indexes[v_index]
      where id = v_addition.id;
    end if;
  end loop;
end;
$$;

create or replace function public.session_remove_program_accessory_addition(
  p_session_id uuid,
  p_addition_id uuid,
  p_remaining_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_addition public.program_accessory_additions%rowtype;
  v_remaining public.program_accessory_additions%rowtype;
  v_index integer;
  v_expected_remaining_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_remaining_ids is null then
    raise exception 'Invalid accessory order.' using errcode = '22023';
  end if;
  if cardinality(p_remaining_ids) <> (
    select count(distinct addition_id) from unnest(p_remaining_ids) as addition_id
  ) then
    raise exception 'Accessory order contains duplicate entries.' using errcode = '22023';
  end if;

  select * into v_session
  from public.workout_sessions
  where id = p_session_id and user_id = v_user_id
  for update;
  if not found or v_session.status <> 'in_progress' then
    raise exception 'Only in-progress sessions can be edited.' using errcode = 'P0001';
  end if;
  if v_session.program_instance_id is null then
    raise exception 'Only program sessions can remove future accessories.' using errcode = 'P0001';
  end if;

  perform 1
  from public.program_instances
  where id = v_session.program_instance_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Program not found.' using errcode = 'P0001';
  end if;

  select * into v_addition
  from public.program_accessory_additions
  where id = p_addition_id
    and user_id = v_user_id
    and program_instance_id = v_session.program_instance_id
  for update;
  if not found then
    raise exception 'Future accessory settings are stale. Refresh and try again.' using errcode = 'P0001';
  end if;

  select count(*)::integer
  into v_expected_remaining_count
  from public.program_accessory_additions
  where user_id = v_user_id
    and program_instance_id = v_session.program_instance_id
    and session_id = v_addition.session_id
    and id <> v_addition.id;
  if v_expected_remaining_count <> coalesce(cardinality(p_remaining_ids), 0) then
    raise exception 'Future accessory settings are stale. Refresh and try again.' using errcode = 'P0001';
  end if;

  insert into public.session_program_change_journal (
    user_id,
    session_id,
    program_instance_id,
    entity_type,
    entity_key,
    entity_id,
    before_row
  ) values (
    v_user_id,
    p_session_id,
    v_session.program_instance_id,
    'accessory_addition',
    v_addition.id::text,
    v_addition.id,
    to_jsonb(v_addition)
  )
  on conflict (session_id, entity_type, entity_key) do nothing;

  delete from public.program_accessory_additions where id = v_addition.id;

  for v_index in select generate_subscripts(p_remaining_ids, 1) loop
    select * into v_remaining
    from public.program_accessory_additions
    where id = p_remaining_ids[v_index]
      and user_id = v_user_id
      and program_instance_id = v_session.program_instance_id
      and session_id = v_addition.session_id
    for update;
    if not found then
      raise exception 'Future accessory settings are stale. Refresh and try again.' using errcode = 'P0001';
    end if;

    if v_remaining.order_index <> v_index then
      insert into public.session_program_change_journal (
        user_id,
        session_id,
        program_instance_id,
        entity_type,
        entity_key,
        entity_id,
        before_row
      ) values (
        v_user_id,
        p_session_id,
        v_session.program_instance_id,
        'accessory_addition',
        v_remaining.id::text,
        v_remaining.id,
        to_jsonb(v_remaining)
      )
      on conflict (session_id, entity_type, entity_key) do nothing;

      update public.program_accessory_additions
      set order_index = v_index
      where id = v_remaining.id;
    end if;
  end loop;

  perform public.refresh_program_customization_summary(v_session.program_instance_id, v_user_id);
end;
$$;

create or replace function public.discard_workout_session(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_change public.session_program_change_journal%rowtype;
  v_deleted_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_session
  from public.workout_sessions
  where id = p_session_id and user_id = v_user_id
  for update;
  if not found or v_session.status <> 'in_progress' then
    raise exception 'Only in-progress workouts can be discarded.' using errcode = 'P0001';
  end if;

  if v_session.program_instance_id is not null then
    perform 1
    from public.program_instances
    where id = v_session.program_instance_id and user_id = v_user_id
    for update;
    if not found then
      raise exception 'Program not found.' using errcode = 'P0001';
    end if;

    delete from public.program_movement_overrides as program_override
    using public.session_program_change_journal as change
    where change.session_id = p_session_id
      and change.user_id = v_user_id
      and change.entity_type = 'movement_override'
      and program_override.id = change.entity_id;

    delete from public.program_accessory_additions as accessory_addition
    using public.session_program_change_journal as change
    where change.session_id = p_session_id
      and change.user_id = v_user_id
      and change.entity_type = 'accessory_addition'
      and accessory_addition.id = change.entity_id;

    for v_change in
      select *
      from public.session_program_change_journal
      where session_id = p_session_id
        and user_id = v_user_id
        and before_row is not null
      order by created_at, id
    loop
      if v_change.entity_type = 'movement_override' then
        insert into public.program_movement_overrides (
          id,
          user_id,
          program_instance_id,
          slot_id,
          phase_key,
          role,
          original_movement_id,
          replacement_movement_id,
          effective_from_week_index,
          source_session_id,
          source_exercise_log_id,
          created_at,
          updated_at
        ) values (
          (v_change.before_row->>'id')::uuid,
          (v_change.before_row->>'user_id')::uuid,
          (v_change.before_row->>'program_instance_id')::uuid,
          v_change.before_row->>'slot_id',
          v_change.before_row->>'phase_key',
          v_change.before_row->>'role',
          v_change.before_row->>'original_movement_id',
          v_change.before_row->>'replacement_movement_id',
          (v_change.before_row->>'effective_from_week_index')::integer,
          (v_change.before_row->>'source_session_id')::uuid,
          (v_change.before_row->>'source_exercise_log_id')::uuid,
          (v_change.before_row->>'created_at')::timestamptz,
          (v_change.before_row->>'updated_at')::timestamptz
        );
      elsif v_change.entity_type = 'accessory_addition' then
        insert into public.program_accessory_additions (
          id,
          user_id,
          program_instance_id,
          session_id,
          slot_id,
          phase_key,
          movement_id,
          prescription_id,
          source_slot_id,
          target_summary,
          sets,
          note,
          progression_method,
          effective_from_week_index,
          order_index,
          created_at,
          updated_at
        ) values (
          (v_change.before_row->>'id')::uuid,
          (v_change.before_row->>'user_id')::uuid,
          (v_change.before_row->>'program_instance_id')::uuid,
          v_change.before_row->>'session_id',
          v_change.before_row->>'slot_id',
          v_change.before_row->>'phase_key',
          v_change.before_row->>'movement_id',
          v_change.before_row->>'prescription_id',
          v_change.before_row->>'source_slot_id',
          v_change.before_row->>'target_summary',
          coalesce(v_change.before_row->'sets', '[]'::jsonb),
          v_change.before_row->>'note',
          v_change.before_row->>'progression_method',
          (v_change.before_row->>'effective_from_week_index')::integer,
          (v_change.before_row->>'order_index')::integer,
          (v_change.before_row->>'created_at')::timestamptz,
          (v_change.before_row->>'updated_at')::timestamptz
        );
      end if;
    end loop;

    perform public.refresh_program_customization_summary(v_session.program_instance_id, v_user_id);
  end if;

  -- The FK intentionally preserves ordinary feedback when a session is removed.
  -- A discarded workout, however, must leave no session-specific remnants.
  delete from public.feedback_events
  where session_id = p_session_id and user_id = v_user_id;

  delete from public.workout_sessions
  where id = p_session_id and user_id = v_user_id;

  get diagnostics v_deleted_count = row_count;
  if v_deleted_count <> 1 then
    raise exception 'Workout could not be discarded.' using errcode = 'P0001';
  end if;

  return p_session_id;
end;
$$;

revoke all on function public.session_set_program_movement_override(uuid, text, text, text, text, text, uuid, boolean) from public, anon;
revoke all on function public.session_insert_program_accessory_addition(uuid, text, text, text, text, text, text, jsonb, text, text, integer) from public, anon;
revoke all on function public.session_reorder_program_accessory_additions(uuid, uuid[], integer[]) from public, anon;
revoke all on function public.session_remove_program_accessory_addition(uuid, uuid, uuid[]) from public, anon;
revoke all on function public.discard_workout_session(uuid) from public, anon;

grant execute on function public.session_set_program_movement_override(uuid, text, text, text, text, text, uuid, boolean) to authenticated;
grant execute on function public.session_insert_program_accessory_addition(uuid, text, text, text, text, text, text, jsonb, text, text, integer) to authenticated;
grant execute on function public.session_reorder_program_accessory_additions(uuid, uuid[], integer[]) to authenticated;
grant execute on function public.session_remove_program_accessory_addition(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.discard_workout_session(uuid) to authenticated;
