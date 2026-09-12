-- Guided / Full reading modes. Guided is the default for everyone; Full is opted into from
-- Settings once the account has enough history (the Today unlock hint fires at 8 completed
-- sessions, ESTABLISHED_MIN_SESSIONS in packages/domain/src/history/insight-state.ts).
-- `show_formulas` is a Full-only sub-preference; `full_mode_hint_dismissed_at` records that the
-- one-time unlock banner was answered so it is never shown again.
-- profiles is already self-owned (RLS) and granted to authenticated, so no grant/policy needed.
alter table public.profiles
  add column if not exists experience_mode text not null default 'guided';

do $$
begin
  alter table public.profiles
    add constraint profiles_experience_mode_check
    check (experience_mode in ('guided', 'full'));
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists show_formulas boolean not null default false;

-- Nullable with no default: null means "not yet answered". pgTAP fixtures insert profiles with
-- only (id, email), so a not-null column without a default would break them.
alter table public.profiles
  add column if not exists full_mode_hint_dismissed_at timestamptz;
