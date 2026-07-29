-- Keep the fixture writer on the minimum direct-table surface it exercises.
-- User deletion is handled by GoTrue and cascades from auth.users, so this role
-- does not need direct DELETE access to any of these tables.
revoke delete on table
  public.profiles,
  public.program_instances,
  public.program_state_values,
  public.program_accessory_additions,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs,
  public.substitution_logs,
  public.progression_decisions
from service_role;

revoke update on table
  public.program_instances,
  public.program_state_values,
  public.program_accessory_additions,
  public.workout_sessions,
  public.exercise_logs,
  public.set_logs,
  public.substitution_logs,
  public.progression_decisions
from service_role;

revoke select on table
  public.program_state_values,
  public.program_accessory_additions,
  public.substitution_logs,
  public.progression_decisions
from service_role;
