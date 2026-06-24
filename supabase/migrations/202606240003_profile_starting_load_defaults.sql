alter table public.profiles
  add column if not exists program_state_defaults jsonb not null default '{}'::jsonb;
