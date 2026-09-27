-- Pin both calls to the account captured by the client before async work begins.
-- The older implementation remains private so receipt recovery stays unchanged.
revoke all on function public.start_program_v4(text,jsonb) from public, anon, authenticated;
revoke all on function public.get_program_start_review_v1() from public, anon, authenticated;

create function public.start_program_v4(p_request_id text, p_intent jsonb, p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_expected_user_id is distinct from auth.uid() then
    raise exception 'PROGRAM_START_ACCOUNT_CHANGED' using errcode = '42501';
  end if;
  return public.start_program_v4(p_request_id, p_intent);
end;
$$;

create function public.get_program_start_review_v1(p_expected_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_expected_user_id is distinct from auth.uid() then
    raise exception 'PROGRAM_START_ACCOUNT_CHANGED' using errcode = '42501';
  end if;
  return public.get_program_start_review_v1();
end;
$$;
revoke all on function public.start_program_v4(text,jsonb,uuid) from public, anon;
revoke all on function public.get_program_start_review_v1(uuid) from public, anon;
grant execute on function public.start_program_v4(text,jsonb,uuid) to authenticated;
grant execute on function public.get_program_start_review_v1(uuid) to authenticated;
