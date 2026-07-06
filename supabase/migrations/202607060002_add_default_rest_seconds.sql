-- Rest timer: global default duration on the profile. `auto_start_timer` already exists
-- (202606210001_initial_schema.sql, default true) — this adds the paired duration.
-- profiles is already self-owned (RLS) and granted to authenticated, so no grant/policy needed.
alter table public.profiles
  add column if not exists default_rest_seconds integer not null default 120;

do $$
begin
  alter table public.profiles
    add constraint profiles_default_rest_seconds_check
    check (default_rest_seconds between 30 and 600);
exception
  when duplicate_object then null;
end $$;
