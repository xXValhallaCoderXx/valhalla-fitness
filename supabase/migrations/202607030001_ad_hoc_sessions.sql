-- Ad-hoc workouts: sessions that exist outside any programme.
-- Ad-hoc = program_instance_id IS NULL (planned_session_id must be null with it);
-- prescription_snapshot stays required and carries the synthesized session shape.
alter table public.workout_sessions alter column program_instance_id drop not null;
alter table public.workout_sessions alter column planned_session_id drop not null;

alter table public.workout_sessions add constraint workout_sessions_ad_hoc_shape
  check ((program_instance_id is null) = (planned_session_id is null));

-- Favourite = a completed ad-hoc session the user flagged to restart later.
alter table public.workout_sessions add column is_favorite boolean not null default false;
