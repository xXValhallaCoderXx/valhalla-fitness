-- Add durable movement metadata and the pinned programme equipment-mode model.
--
-- Existing programmes remain standard. Free-weight programmes pin both the
-- immutable policy used to resolve their choices and a deterministic hash of
-- those normalized choices.

alter table public.movements
  add column status text not null default 'active',
  add column resistance_mode text,
  add column required_equipment text[] not null default '{}'::text[],
  add column pattern text,
  add column primary_muscles text[] not null default '{}'::text[],
  add column secondary_muscles text[] not null default '{}'::text[],
  add column aliases text[] not null default '{}'::text[],
  add column load_convention text,
  add column replaced_by_movement_id text,
  add column canonical_free_weight_movement_id text;

alter table public.movements
  add constraint movements_status_check
    check (status in ('active', 'deprecated')),
  add constraint movements_resistance_mode_check
    check (
      resistance_mode in (
        'barbell',
        'dumbbell',
        'specialty_bar',
        'bodyweight',
        'cable',
        'machine'
      )
      or (status = 'deprecated' and resistance_mode is null)
    ),
  add constraint movements_load_convention_check
    check (
      load_convention in (
        'total_external',
        'implement_weight',
        'added_to_bodyweight',
        'bodyweight_only',
        'device_display',
        'assistance'
      )
      or (status = 'deprecated' and load_convention is null)
    ),
  add constraint movements_replaced_by_movement_id_fkey
    foreign key (replaced_by_movement_id)
    references public.movements(id),
  add constraint movements_canonical_free_weight_movement_id_fkey
    foreign key (canonical_free_weight_movement_id)
    references public.movements(id);

update public.movements
set
  required_equipment = equipment,
  pattern = category,
  resistance_mode = case
    when 'barbell' = any(equipment) then 'barbell'
    when 'specialty_bars' = any(equipment) then 'specialty_bar'
    when 'dumbbells' = any(equipment) then 'dumbbell'
    when 'bodyweight' = any(equipment)
      and not ('cable' = any(equipment) or 'machine' = any(equipment))
      then 'bodyweight'
    when 'cable' = any(equipment) then 'cable'
    else 'machine'
  end,
  load_convention = case
    when equipment = array['bodyweight']::text[] then 'bodyweight_only'
    when 'bodyweight' = any(equipment)
      and not (
        'barbell' = any(equipment)
        or 'specialty_bars' = any(equipment)
        or 'dumbbells' = any(equipment)
        or 'cable' = any(equipment)
        or 'machine' = any(equipment)
      )
      then 'added_to_bodyweight'
    when 'barbell' = any(equipment) or 'specialty_bars' = any(equipment)
      then 'total_external'
    when 'dumbbells' = any(equipment) then 'implement_weight'
    else 'device_display'
  end;

alter table public.movements
  alter column pattern set not null,
  alter column load_convention set not null;

create table public.equipment_mode_policy_versions (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode = 'free_weight'),
  version text not null,
  schema_version text not null,
  definition jsonb not null,
  definition_checksum text generated always as (md5(definition::text)) stored,
  created_at timestamptz not null default now(),
  unique (mode, version)
);

alter table public.program_instances
  add column equipment_mode text not null default 'standard',
  add column free_weight_policy_version_id uuid,
  add column free_weight_choices_hash text,
  add constraint program_instances_equipment_mode_check
    check (equipment_mode in ('standard', 'free_weight')),
  add constraint program_instances_free_weight_pin_pair_check
    check (
      (free_weight_policy_version_id is null) =
      (free_weight_choices_hash is null)
    ),
  add constraint program_instances_free_weight_requires_pin_check
    check (
      equipment_mode <> 'free_weight'
      or (
        free_weight_policy_version_id is not null
        and free_weight_choices_hash is not null
      )
    ),
  add constraint program_instances_free_weight_policy_version_id_fkey
    foreign key (free_weight_policy_version_id)
    references public.equipment_mode_policy_versions(id);

create table public.program_equipment_mode_choices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_instance_id uuid not null references public.program_instances(id) on delete cascade,
  equipment_mode text not null check (equipment_mode = 'free_weight'),
  template_session_id text not null,
  slot_id text not null,
  phase_key text not null,
  role text not null check (role in ('main', 'variation', 'accessory', 'warmup', 'event')),
  source_movement_id text not null references public.movements(id),
  replacement_movement_id text not null references public.movements(id),
  policy_rule_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    program_instance_id,
    equipment_mode,
    template_session_id,
    slot_id,
    phase_key,
    role
  ),
  constraint program_equipment_mode_choices_program_owner_fkey
    foreign key (program_instance_id, user_id)
    references public.program_instances(id, user_id)
    on delete cascade
);

create index program_equipment_mode_choices_user_program_idx
  on public.program_equipment_mode_choices(user_id, program_instance_id);

create trigger program_equipment_mode_choices_touch_updated_at
before update on public.program_equipment_mode_choices
for each row execute function public.touch_updated_at();

create function public.protect_referenced_equipment_mode_policy_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'PINNED_POLICY_VERSION_IMMUTABLE' using errcode = 'P0001';
end;
$$;

create trigger protect_referenced_equipment_mode_policy_version
before update or delete on public.equipment_mode_policy_versions
for each row execute function public.protect_referenced_equipment_mode_policy_version();

alter table public.equipment_mode_policy_versions enable row level security;
alter table public.program_equipment_mode_choices enable row level security;

create policy "equipment mode policy versions are public read"
on public.equipment_mode_policy_versions
for select using (true);

create policy "program equipment mode choices are self owned"
on public.program_equipment_mode_choices
for select using (auth.uid() = user_id);

revoke all on table
  public.equipment_mode_policy_versions,
  public.program_equipment_mode_choices
from public, anon, authenticated, service_role;

grant select on public.equipment_mode_policy_versions to anon, authenticated;
grant select on public.program_equipment_mode_choices to authenticated;
grant select on
  public.equipment_mode_policy_versions,
  public.program_equipment_mode_choices
to service_role;

revoke all on function public.protect_referenced_equipment_mode_policy_version()
from public, anon, authenticated;
