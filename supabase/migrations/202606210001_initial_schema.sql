create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  units text not null default 'kg' check (units in ('kg', 'lb')),
  rounding numeric not null default 2.5,
  auto_start_timer boolean not null default true,
  equipment_profile text[] not null default array['barbell', 'plates', 'rack', 'bench', 'dumbbells']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movements (
  id text primary key,
  name text not null,
  category text not null,
  equipment text[] not null default '{}',
  variation_of text references public.movements(id),
  default_unit text not null default 'kg',
  is_competition boolean not null default false
);

create table if not exists public.program_templates (
  id text primary key,
  name text not null,
  source text not null,
  description text not null,
  days_per_week int not null,
  progression_label text not null,
  complexity text not null,
  schema_version text not null,
  is_active boolean not null default true,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.program_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.program_templates(id) on delete cascade,
  version text not null,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table if not exists public.program_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id text not null references public.program_templates(id),
  template_version_id uuid not null references public.program_template_versions(id),
  title text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  start_date date not null default current_date,
  units text not null check (units in ('kg', 'lb')),
  rounding numeric not null,
  current_block_id text,
  current_week_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_instance_id uuid not null references public.program_instances(id) on delete cascade,
  movement_id text not null references public.movements(id),
  anchor_type text not null,
  value numeric not null,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_instance_id, movement_id, anchor_type)
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_instance_id uuid not null references public.program_instances(id) on delete cascade,
  planned_session_id text not null,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  scheduled_date date not null default current_date,
  started_at timestamptz,
  completed_at timestamptz,
  prescription_snapshot jsonb not null,
  notes text,
  client_mutation_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  slot_id text not null,
  planned_movement_id text not null references public.movements(id),
  performed_movement_id text not null references public.movements(id),
  role text not null check (role in ('main', 'variation', 'accessory', 'warmup', 'event')),
  order_index int not null,
  target_summary text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, slot_id)
);

create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_log_id uuid not null references public.exercise_logs(id) on delete cascade,
  set_index int not null,
  target_load numeric,
  target_reps int,
  target_rep_min int,
  target_rep_max int,
  target_rpe numeric,
  target_rir numeric,
  actual_load numeric,
  actual_reps int,
  actual_rpe numeric,
  actual_rir numeric,
  completed boolean not null default false,
  is_top_set boolean not null default false,
  is_amrap boolean not null default false,
  is_backoff boolean not null default false,
  note text,
  client_mutation_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_log_id, set_index)
);

create table if not exists public.substitution_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  slot_id text not null,
  planned_movement_id text not null references public.movements(id),
  performed_movement_id text not null references public.movements(id),
  reason text not null check (reason in ('equipment_missing', 'crowded_gym', 'preference', 'fatigue', 'other')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.progression_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_instance_id uuid not null references public.program_instances(id) on delete cascade,
  movement_id text not null references public.movements(id),
  rule_id text not null,
  scope text not null check (scope in ('session', 'week', 'wave', 'cycle', 'block')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed', 'superseded')),
  input_summary text not null,
  recommendation text not null,
  previous_anchor numeric,
  recommended_anchor numeric,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.movements enable row level security;
alter table public.program_templates enable row level security;
alter table public.program_template_versions enable row level security;
alter table public.program_instances enable row level security;
alter table public.program_anchors enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.set_logs enable row level security;
alter table public.substitution_logs enable row level security;
alter table public.progression_decisions enable row level security;

create policy "profiles are self owned" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "movements are public read" on public.movements
  for select using (true);

create policy "templates are public read" on public.program_templates
  for select using (is_active = true);

create policy "template versions are public read" on public.program_template_versions
  for select using (
    exists (
      select 1 from public.program_templates t
      where t.id = template_id and t.is_active = true
    )
  );

create policy "program instances are self owned" on public.program_instances
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "program anchors are self owned" on public.program_anchors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout sessions are self owned" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exercise logs are self owned" on public.exercise_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "set logs are self owned" on public.set_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "substitution logs are self owned" on public.substitution_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "progression decisions are self owned" on public.progression_decisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger program_instances_touch_updated_at
before update on public.program_instances
for each row execute function public.touch_updated_at();

create trigger program_anchors_touch_updated_at
before update on public.program_anchors
for each row execute function public.touch_updated_at();

create trigger workout_sessions_touch_updated_at
before update on public.workout_sessions
for each row execute function public.touch_updated_at();

create trigger exercise_logs_touch_updated_at
before update on public.exercise_logs
for each row execute function public.touch_updated_at();

create trigger set_logs_touch_updated_at
before update on public.set_logs
for each row execute function public.touch_updated_at();
