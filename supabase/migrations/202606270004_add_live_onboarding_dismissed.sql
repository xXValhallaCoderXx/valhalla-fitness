-- Tracks whether the user has dismissed the optional in-session workout onboarding card.
alter table public.profiles
  add column if not exists live_onboarding_dismissed boolean not null default false;
