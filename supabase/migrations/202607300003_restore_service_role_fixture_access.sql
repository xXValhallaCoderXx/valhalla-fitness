-- Browser clients mutate programme/session data through guarded RPCs, but trusted
-- local tooling (notably scripts/demo-data.mjs) still needs direct table access.
-- The lifecycle write-boundary migration revoked PUBLIC's inherited privileges;
-- service_role therefore needs its administrative privileges granted explicitly.
grant select on table
  public.program_templates,
  public.program_template_versions
to service_role;

grant select, insert, update, delete on table
  public.profiles,
  public.program_instances,
  public.program_state_values,
  public.program_accessory_additions,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs,
  public.substitution_logs,
  public.progression_decisions
to service_role;
