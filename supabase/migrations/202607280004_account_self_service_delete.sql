-- Self-service account deletion for the authenticated account only.
--
-- Deleting auth.users cascades through profiles and every user-owned training
-- table. Custom templates need explicit cleanup because their created_by
-- foreign key is ON DELETE SET NULL, so capture them before deleting the user.
create or replace function public.delete_own_account(p_confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_template_ids text[];
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_confirmation is distinct from 'DELETE MY ACCOUNT' then
    raise exception 'Account deletion confirmation did not match.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select email
  into v_user_email
  from auth.users
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Authenticated account was not found.' using errcode = 'P0001';
  end if;

  -- Block user-owned inserts that depend on the profile while the deletion
  -- captures custom templates. Their foreign-key key-share lock conflicts
  -- with this row lock, so nothing can become ownerless between capture and
  -- the auth/profile cascade.
  perform 1
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Authenticated profile was not found.' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(id order by id), array[]::text[])
  into v_template_ids
  from public.program_templates
  where created_by = v_user_id;

  delete from auth.users
  where id = v_user_id;

  if not found then
    raise exception 'Account could not be deleted.' using errcode = 'P0001';
  end if;

  delete from public.program_templates
  where id = any(v_template_ids);

  -- An allowlist entry is personal account data and should not survive the
  -- account that used it. It is safe to remove only the exact authenticated
  -- address captured from auth.users above.
  if v_user_email is not null then
    delete from public.allowed_emails
    where lower(email) = lower(v_user_email);
  end if;
end;
$$;

revoke all on function public.delete_own_account(text)
  from public, anon, authenticated;
grant execute on function public.delete_own_account(text)
  to authenticated;
