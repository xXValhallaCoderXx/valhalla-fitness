-- Tracks whether the user has seen the first-run onboarding (tour + getting-started checklist).
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;
