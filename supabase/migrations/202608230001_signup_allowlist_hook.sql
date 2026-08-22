-- Signup gating moves into the database. The allowlist was previously enforced
-- only in web application code (sendMagicLinkFn deciding whether to hand the
-- browser a signInWithOtp request), which a second client — the native app
-- calling supabase-js directly — silently bypasses. A before-user-created auth
-- hook closes the gap for every present and future client. The flag ships OFF,
-- matching the current open-signup release posture, so this is a no-op until
-- app_config.auth_allowlist_enabled is set to true.

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
-- No policies and no anon/authenticated grants: only service_role (bypasses
-- RLS) and definer functions owned by postgres can touch it.
revoke all on public.app_config from anon, authenticated;

insert into public.app_config (key, value)
values ('auth_allowlist_enabled', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  allowlist_enabled boolean;
  candidate_email text;
begin
  select coalesce((value #>> '{}')::boolean, false)
    into allowlist_enabled
    from public.app_config
    where key = 'auth_allowlist_enabled';

  if not coalesce(allowlist_enabled, false) then
    return event;
  end if;

  candidate_email := event -> 'user' ->> 'email';
  if candidate_email is null or candidate_email = '' then
    return event;
  end if;

  if public.is_email_allowed(candidate_email) then
    return event;
  end if;

  raise exception 'Signups are currently invite-only.';
end;
$$;

revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
