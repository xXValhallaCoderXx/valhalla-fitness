create table if not exists public.movement_replacement_rules (
  id text primary key,
  source_movement_id text not null references public.movements(id),
  replacement_movement_id text not null references public.movements(id),
  role text not null check (role in ('variation', 'accessory')),
  template_id text references public.program_templates(id),
  phase_key text,
  slot_id text,
  relationship_label text not null,
  allow_session_scope boolean not null default true,
  allow_phase_slot_scope boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.program_movement_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_instance_id uuid not null references public.program_instances(id) on delete cascade,
  slot_id text not null,
  phase_key text not null,
  role text not null check (role in ('variation', 'accessory')),
  original_movement_id text not null references public.movements(id),
  replacement_movement_id text not null references public.movements(id),
  effective_from_week_index int not null,
  source_session_id uuid references public.workout_sessions(id) on delete set null,
  source_exercise_log_id uuid references public.exercise_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_instance_id, slot_id, phase_key, role)
);

alter table public.movement_replacement_rules enable row level security;
alter table public.program_movement_overrides enable row level security;

create policy "movement replacement rules are public read" on public.movement_replacement_rules
  for select using (is_active = true);

create policy "program movement overrides are self owned" on public.program_movement_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger program_movement_overrides_touch_updated_at
before update on public.program_movement_overrides
for each row execute function public.touch_updated_at();

grant select on public.movement_replacement_rules to anon, authenticated;
grant select, insert, update, delete on public.program_movement_overrides to authenticated;

insert into public.movements (id, name, category, equipment, variation_of, is_competition) values
  ('seated_cable_row', 'Seated Cable Row', 'upper_back', array['cable', 'machine'], null, false),
  ('machine_row', 'Machine Row', 'upper_back', array['machine'], null, false),
  ('one_arm_cable_row', 'One-Arm Cable Row', 'upper_back', array['cable'], null, false),
  ('pull_up', 'Pull-Up', 'upper_back', array['bodyweight'], null, false),
  ('machine_high_row', 'Machine High Row', 'upper_back', array['machine'], null, false),
  ('hack_squat', 'Hack Squat', 'lower', array['machine'], 'squat', false),
  ('split_squat', 'Split Squat', 'lower', array['dumbbells', 'bodyweight'], 'squat', false),
  ('seated_leg_curl', 'Seated Leg Curl', 'posterior_chain', array['machine'], null, false),
  ('lying_leg_curl', 'Lying Leg Curl', 'posterior_chain', array['machine'], null, false),
  ('reverse_hyperextension', 'Reverse Hyperextension', 'posterior_chain', array['machine'], null, false),
  ('glute_ham_raise', 'Glute-Ham Raise', 'posterior_chain', array['machine', 'bodyweight'], null, false),
  ('hanging_leg_raise', 'Hanging Leg Raise', 'core', array['bodyweight'], null, false),
  ('ab_wheel_rollout', 'Ab Wheel Rollout', 'core', array['bodyweight'], null, false),
  ('dumbbell_bench_press', 'Dumbbell Bench Press', 'upper', array['dumbbells', 'bench'], 'bench_press', false),
  ('push_up', 'Push-Up', 'upper', array['bodyweight'], 'bench_press', false),
  ('overhead_triceps_extension', 'Overhead Triceps Extension', 'upper', array['cable', 'dumbbells'], null, false),
  ('skullcrusher', 'Skullcrusher', 'upper', array['barbell', 'dumbbells', 'bench'], null, false),
  ('rear_delt_fly', 'Rear Delt Fly', 'upper_back', array['dumbbells', 'machine'], null, false),
  ('safety_bar_squat', 'Safety Bar Squat', 'lower', array['specialty_bars', 'rack', 'plates'], 'squat', false),
  ('good_morning', 'Good Morning', 'hinge', array['barbell', 'rack', 'plates'], 'deadlift', false),
  ('seated_dumbbell_press', 'Seated Dumbbell Press', 'upper', array['dumbbells', 'bench'], 'overhead_press', false)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  equipment = excluded.equipment,
  variation_of = excluded.variation_of,
  is_competition = excluded.is_competition;

insert into public.movement_replacement_rules (
  id,
  source_movement_id,
  replacement_movement_id,
  role,
  relationship_label,
  allow_session_scope,
  allow_phase_slot_scope
) values
  ('leg_press-hack_squat-accessory', 'leg_press', 'hack_squat', 'accessory', 'Same squat pattern', true, true),
  ('leg_press-split_squat-accessory', 'leg_press', 'split_squat', 'accessory', 'Unilateral lower-body option', true, true),
  ('hamstring_curl-seated_leg_curl-accessory', 'hamstring_curl', 'seated_leg_curl', 'accessory', 'Same movement pattern', true, true),
  ('hamstring_curl-lying_leg_curl-accessory', 'hamstring_curl', 'lying_leg_curl', 'accessory', 'Same movement pattern', true, true),
  ('back_extension-reverse_hyperextension-accessory', 'back_extension', 'reverse_hyperextension', 'accessory', 'Similar posterior-chain accessory', true, true),
  ('back_extension-glute_ham_raise-accessory', 'back_extension', 'glute_ham_raise', 'accessory', 'Similar posterior-chain accessory', true, true),
  ('cable_crunch-hanging_leg_raise-accessory', 'cable_crunch', 'hanging_leg_raise', 'accessory', 'Core accessory', true, true),
  ('cable_crunch-ab_wheel_rollout-accessory', 'cable_crunch', 'ab_wheel_rollout', 'accessory', 'Core accessory', true, true),
  ('chest_supported_row-seated_cable_row-accessory', 'chest_supported_row', 'seated_cable_row', 'accessory', 'Similar row pattern', true, true),
  ('chest_supported_row-machine_row-accessory', 'chest_supported_row', 'machine_row', 'accessory', 'Similar row pattern', true, true),
  ('lat_pulldown-pull_up-accessory', 'lat_pulldown', 'pull_up', 'accessory', 'Vertical pull', true, true),
  ('lat_pulldown-machine_high_row-accessory', 'lat_pulldown', 'machine_high_row', 'accessory', 'Upper-back pull', true, true),
  ('dumbbell_row-one_arm_cable_row-accessory', 'dumbbell_row', 'one_arm_cable_row', 'accessory', 'Unilateral row', true, true),
  ('dumbbell_row-seated_cable_row-accessory', 'dumbbell_row', 'seated_cable_row', 'accessory', 'Similar row pattern', true, true),
  ('incline_dumbbell_press-dumbbell_bench_press-accessory', 'incline_dumbbell_press', 'dumbbell_bench_press', 'accessory', 'Similar press', true, true),
  ('incline_dumbbell_press-push_up-accessory', 'incline_dumbbell_press', 'push_up', 'accessory', 'Low-equipment press', true, true),
  ('triceps_pressdown-overhead_triceps_extension-accessory', 'triceps_pressdown', 'overhead_triceps_extension', 'accessory', 'Triceps accessory', true, true),
  ('triceps_pressdown-skullcrusher-accessory', 'triceps_pressdown', 'skullcrusher', 'accessory', 'Triceps accessory', true, true),
  ('face_pull-rear_delt_fly-accessory', 'face_pull', 'rear_delt_fly', 'accessory', 'Rear-delt accessory', true, true),
  ('face_pull-machine_high_row-accessory', 'face_pull', 'machine_high_row', 'accessory', 'Upper-back accessory', true, true),
  ('front_squat-pause_squat-variation', 'front_squat', 'pause_squat', 'variation', 'Programmed squat variation', true, true),
  ('front_squat-safety_bar_squat-variation', 'front_squat', 'safety_bar_squat', 'variation', 'Programmed squat variation', true, true),
  ('pause_squat-front_squat-variation', 'pause_squat', 'front_squat', 'variation', 'Programmed squat variation', true, true),
  ('pause_squat-safety_bar_squat-variation', 'pause_squat', 'safety_bar_squat', 'variation', 'Programmed squat variation', true, true),
  ('close_grip_bench_press-board_press-variation', 'close_grip_bench_press', 'board_press', 'variation', 'Programmed bench variation', true, true),
  ('close_grip_bench_press-dumbbell_bench_press-variation', 'close_grip_bench_press', 'dumbbell_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('board_press-close_grip_bench_press-variation', 'board_press', 'close_grip_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('board_press-dumbbell_bench_press-variation', 'board_press', 'dumbbell_bench_press', 'variation', 'Programmed bench variation', true, true),
  ('romanian_deadlift-stiff_leg_deadlift-variation', 'romanian_deadlift', 'stiff_leg_deadlift', 'variation', 'Programmed hinge variation', true, true),
  ('romanian_deadlift-good_morning-variation', 'romanian_deadlift', 'good_morning', 'variation', 'Programmed hinge variation', true, true),
  ('stiff_leg_deadlift-romanian_deadlift-variation', 'stiff_leg_deadlift', 'romanian_deadlift', 'variation', 'Programmed hinge variation', true, true),
  ('stiff_leg_deadlift-good_morning-variation', 'stiff_leg_deadlift', 'good_morning', 'variation', 'Programmed hinge variation', true, true),
  ('low_trap_bar_deadlift-stiff_leg_deadlift-variation', 'low_trap_bar_deadlift', 'stiff_leg_deadlift', 'variation', 'Programmed hinge variation', true, true),
  ('low_trap_bar_deadlift-romanian_deadlift-variation', 'low_trap_bar_deadlift', 'romanian_deadlift', 'variation', 'Programmed hinge variation', true, true),
  ('behind_neck_press-seated_pin_press-variation', 'behind_neck_press', 'seated_pin_press', 'variation', 'Programmed press variation', true, true),
  ('behind_neck_press-seated_dumbbell_press-variation', 'behind_neck_press', 'seated_dumbbell_press', 'variation', 'Programmed press variation', true, true),
  ('seated_pin_press-behind_neck_press-variation', 'seated_pin_press', 'behind_neck_press', 'variation', 'Programmed press variation', true, true),
  ('seated_pin_press-seated_dumbbell_press-variation', 'seated_pin_press', 'seated_dumbbell_press', 'variation', 'Programmed press variation', true, true)
on conflict (id) do update set
  source_movement_id = excluded.source_movement_id,
  replacement_movement_id = excluded.replacement_movement_id,
  role = excluded.role,
  relationship_label = excluded.relationship_label,
  allow_session_scope = excluded.allow_session_scope,
  allow_phase_slot_scope = excluded.allow_phase_slot_scope,
  is_active = true;
