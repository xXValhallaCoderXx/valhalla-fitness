-- All insert paths, including legacy/ad-hoc wrappers and privileged importers,
-- must respect the instance policy. No fabricated return provenance is accepted.
create function public.enforce_return_snapshot_v1() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.program_instance_id is not null then
    perform public.validate_return_start_v1(new.program_instance_id,new.prescription_snapshot);
  elsif new.prescription_snapshot ? 'returnContext' then
    raise exception 'RETURN_CONTEXT_INVALID_FOR_AD_HOC';
  end if;
  return new;
end;
$$;
create trigger enforce_return_snapshot before insert on public.workout_sessions for each row execute function public.enforce_return_snapshot_v1();
revoke all on function public.enforce_return_snapshot_v1() from public,anon,authenticated;

create function public.protect_load_adjustment_ledger_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'LOAD_ADJUSTMENT_LEDGER_IMMUTABLE';
end;
$$;
create trigger protect_load_adjustment_ledger before update on public.program_load_adjustments for each row execute function public.protect_load_adjustment_ledger_v1();
revoke all on function public.protect_load_adjustment_ledger_v1() from public,anon,authenticated;
