-- Tracks whether the user opted out of the post-workout beta feedback prompt
-- ("Don't ask again" on the session-summary check-in card).
alter table public.profiles
  add column if not exists post_workout_feedback_dismissed boolean not null default false;
