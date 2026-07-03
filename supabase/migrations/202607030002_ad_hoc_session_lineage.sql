-- Repeating an ad-hoc workout creates a new session; source_session_id links it back to the
-- workout it repeats (always flattened to the lineage root at insert time). Favourite state is
-- shared across a lineage, so a repeat of a favourited workout reads — and clears — the same star.
alter table public.workout_sessions
  add column source_session_id uuid references public.workout_sessions(id) on delete set null;
