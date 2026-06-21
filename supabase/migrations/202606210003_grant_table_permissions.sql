grant usage on schema public to anon, authenticated;

grant select on public.movements to anon, authenticated;
grant select on public.program_templates to anon, authenticated;
grant select on public.program_template_versions to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.program_instances to authenticated;
grant select, insert, update, delete on public.program_anchors to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.exercise_logs to authenticated;
grant select, insert, update, delete on public.set_logs to authenticated;
grant select, insert, update, delete on public.substitution_logs to authenticated;
grant select, insert, update, delete on public.progression_decisions to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select on tables to anon;
