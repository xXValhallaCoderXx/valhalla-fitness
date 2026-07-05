-- Bodyweight log: powers the DOTS / relative-strength insights on the history
-- dashboard. Weights are stored canonically in kg; profiles.units drives the
-- display conversion. profiles.sex is nullable and is used ONLY to pick DOTS
-- coefficients — leaving it unset simply gates the relative-strength insight.
create table if not exists public.bodyweight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorded_on date not null,
  weight_kg numeric not null check (weight_kg > 20 and weight_kg < 500),
  created_at timestamptz not null default now(),
  unique (user_id, recorded_on)
);

create index if not exists bodyweight_entries_user_recorded_on_idx
  on public.bodyweight_entries (user_id, recorded_on desc);

alter table public.bodyweight_entries enable row level security;

create policy "bodyweight entries are self owned" on public.bodyweight_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.bodyweight_entries to authenticated;
-- Bodyweight is personal data; drop the blanket anon SELECT that
-- 202606210003_grant_table_permissions.sql hands out by default.
revoke all on public.bodyweight_entries from anon;
-- The demo seeder writes with the service-role key; new public tables are not
-- auto-granted to service_role in this project.
grant select, insert, update, delete on public.bodyweight_entries to service_role;

alter table public.profiles add column if not exists sex text check (sex in ('male', 'female'));
