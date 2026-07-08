-- Post-workout reflection + PR snapshot, captured at finish time.
-- session_rpe: one-tap "How hard was that?" (1 = easy … 10 = max effort). Nullable = skipped.
-- reflection_win / reflection_improve: optional short free-text prompts at finish.
-- prs: personal records broken in this session, computed once at finish and frozen,
-- so the summary page can render them on any later visit without recomputing
-- against a history that has since moved on.
alter table public.workout_sessions
  add column if not exists session_rpe smallint,
  add column if not exists reflection_win text,
  add column if not exists reflection_improve text,
  add column if not exists prs jsonb;

do $$
begin
  alter table public.workout_sessions
    add constraint workout_sessions_session_rpe_check
    check (session_rpe between 1 and 10);
exception
  when duplicate_object then null;
end $$;

comment on column public.workout_sessions.session_rpe is
  'Whole-session perceived exertion 1-10 (beginner UI labels the ends: 1 = easy, 10 = max effort). Nullable = not rated.';
comment on column public.workout_sessions.reflection_win is
  'Optional finish-time reflection: one thing that went well.';
comment on column public.workout_sessions.reflection_improve is
  'Optional finish-time reflection: one thing to work on.';
comment on column public.workout_sessions.prs is
  'SessionPr[] frozen at finish time; null = none broken (or finished before this feature shipped).';
