-- Email allowlist for invite-only magic-link auth.
-- Source of truth for who may sign in. Enforcement (Option A) also requires
-- disabling open signup in the hosted project + pre-provisioning these users
-- (see scripts/provision-allowed-users.mjs); the app-layer RPC check below is
-- for UX only.

create extension if not exists citext;

-- citext may live in the public or extensions schema depending on the project;
-- include both so the type resolves during this migration and inside the RPC.
set search_path = public, extensions;

create table if not exists public.allowed_emails (
  email    citext primary key,
  note     text,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now()
);

-- The list must NOT be world-readable. Enable RLS with no policy to block
-- anon/authenticated PostgREST reads, and revoke the blanket anon SELECT that
-- 202606210003_grant_table_permissions.sql hands out via `alter default
-- privileges in schema public grant select on tables to anon`.
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

-- The admin/provisioning script (scripts/provision-allowed-users.mjs) manages the
-- list with the service-role key. New public tables are not auto-granted to
-- service_role in this project, so grant it explicitly (service_role also bypasses RLS).
grant select, insert, update, delete on public.allowed_emails to service_role;

-- Boolean oracle: lets the unauthenticated server client ask "is this one email
-- allowed?" without ever exposing the list. SECURITY DEFINER runs as the owner
-- (bypassing RLS); the pinned search_path prevents search-path hijacking.
create or replace function public.is_email_allowed(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.allowed_emails
    where email = trim(check_email)::citext
  );
$$;

revoke all on function public.is_email_allowed(text) from public;
grant execute on function public.is_email_allowed(text) to anon, authenticated;
