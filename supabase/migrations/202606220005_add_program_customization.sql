alter table public.program_templates
  add column if not exists origin text not null default 'system_default'
    check (origin in ('system_default', 'coach_authored', 'user_created')),
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists parent_template_id text references public.program_templates(id) on delete set null;

update public.program_templates
set origin = case
  when source = 'bromley_base_strength' then 'coach_authored'
  when source = 'custom_import' then 'user_created'
  else 'system_default'
end
where origin = 'system_default';

alter table public.program_instances
  add column if not exists customization_status text not null default 'default'
    check (customization_status in ('default', 'customized')),
  add column if not exists customization_summary jsonb not null default '{"movementOverrideCount":0,"accessoryAdditionCount":0}'::jsonb;

create table if not exists public.program_accessory_additions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_instance_id uuid not null references public.program_instances(id) on delete cascade,
  session_id text not null,
  slot_id text not null,
  phase_key text not null default '*',
  movement_id text not null references public.movements(id),
  prescription_id text not null,
  source_slot_id text,
  target_summary text,
  sets jsonb not null default '[]'::jsonb,
  note text,
  progression_method text not null default 'history_only'
    check (progression_method in ('history_only', 'double_progression')),
  effective_from_week_index int not null default 0,
  order_index int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_instance_id, session_id, slot_id, phase_key)
);

alter table public.program_accessory_additions
  alter column source_slot_id drop not null,
  add column if not exists target_summary text,
  add column if not exists sets jsonb not null default '[]'::jsonb,
  add column if not exists note text,
  add column if not exists progression_method text not null default 'history_only'
    check (progression_method in ('history_only', 'double_progression'));

alter table public.exercise_logs
  add column if not exists client_mutation_id text;

create unique index if not exists exercise_logs_user_client_mutation_id_key
  on public.exercise_logs(user_id, client_mutation_id)
  where client_mutation_id is not null;

alter table public.program_accessory_additions enable row level security;

create policy "program accessory additions are self owned" on public.program_accessory_additions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger program_accessory_additions_touch_updated_at
before update on public.program_accessory_additions
for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.program_accessory_additions to authenticated;

insert into public.movement_replacement_rules (
  id,
  source_movement_id,
  replacement_movement_id,
  role,
  relationship_label,
  allow_session_scope,
  allow_phase_slot_scope
) values
  ('wide_grip_bench_press-pause_bench_press-variation', 'wide_grip_bench_press', 'pause_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('wide_grip_bench_press-close_grip_bench_press-variation', 'wide_grip_bench_press', 'close_grip_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('pause_bench_press-wide_grip_bench_press-variation', 'pause_bench_press', 'wide_grip_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('pause_bench_press-close_grip_bench_press-variation', 'pause_bench_press', 'close_grip_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('incline_bench_press-floor_press-variation', 'incline_bench_press', 'floor_press', 'variation', 'Programmed bench variation', true, true),
  ('incline_bench_press-dumbbell_bench_press-variation', 'incline_bench_press', 'dumbbell_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('floor_press-incline_bench_press-variation', 'floor_press', 'incline_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('floor_press-dumbbell_bench_press-variation', 'floor_press', 'dumbbell_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('wide_stance_squat-pause_squat-variation', 'wide_stance_squat', 'pause_squat', 'variation', 'Programmed squat variation', true, true),
  ('wide_stance_squat-front_squat-variation', 'wide_stance_squat', 'front_squat', 'variation', 'Programmed squat variation', true, true),
  ('high_box_squat-front_squat-variation', 'high_box_squat', 'front_squat', 'variation', 'Programmed squat variation', true, true),
  ('high_box_squat-safety_bar_squat-variation', 'high_box_squat', 'safety_bar_squat', 'variation', 'Programmed squat variation', true, true),
  ('wide_grip_overhead_press-push_press-variation', 'wide_grip_overhead_press', 'push_press', 'variation', 'Programmed press variation', true, true),
  ('wide_grip_overhead_press-behind_neck_press-variation', 'wide_grip_overhead_press', 'behind_neck_press', 'variation', 'Programmed press variation', true, true),
  ('push_press-wide_grip_overhead_press-variation', 'push_press', 'wide_grip_overhead_press', 'variation', 'Programmed press variation', true, true),
  ('push_press-seated_pin_press-variation', 'push_press', 'seated_pin_press', 'variation', 'Programmed press variation', true, true),
  ('standing_pin_press-seated_pin_press-variation', 'standing_pin_press', 'seated_pin_press', 'variation', 'Programmed press variation', true, true),
  ('standing_pin_press-seated_dumbbell_press-variation', 'standing_pin_press', 'seated_dumbbell_press', 'variation', 'Programmed press variation', true, true),
  ('block_deadlift-romanian_deadlift-variation', 'block_deadlift', 'romanian_deadlift', 'variation', 'Programmed hinge variation', true, true),
  ('block_deadlift-sumo_deadlift-variation', 'block_deadlift', 'sumo_deadlift', 'variation', 'Programmed hinge variation', true, true),
  ('sumo_deadlift-block_deadlift-variation', 'sumo_deadlift', 'block_deadlift', 'variation', 'Programmed hinge variation', true, true),
  ('sumo_deadlift-stiff_leg_deadlift-variation', 'sumo_deadlift', 'stiff_leg_deadlift', 'variation', 'Programmed hinge variation', true, true)
on conflict (id) do update set
  source_movement_id = excluded.source_movement_id,
  replacement_movement_id = excluded.replacement_movement_id,
  role = excluded.role,
  relationship_label = excluded.relationship_label,
  allow_session_scope = excluded.allow_session_scope,
  allow_phase_slot_scope = excluded.allow_phase_slot_scope,
  is_active = true;
