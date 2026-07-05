-- Beta feedback events: one row per submission from the post-workout micro-prompt
-- ("Did Sheetless explain your next workout clearly?"), the per-decision
-- "Something off?" popover, or the global menu form. "Yes" answers are recorded
-- too — the yes-rate is the trust-loop metric, not just the complaints.
create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('post_workout', 'decision', 'menu')),
  -- Micro-answer to the post-workout clarity question (post_workout only).
  answer text check (answer in ('yes', 'no', 'not_sure')),
  -- Structured reason chip / global category (single-select; free text carries nuance).
  category text check (category in (
    -- post_workout reasons
    'next_weight_wrong', 'explanation_unclear', 'expected_deload',
    'expected_same_weight', 'changed_workout_manually',
    -- decision reasons
    'should_increase', 'should_stay', 'should_decrease', 'reps_sets_wrong', 'rule_unclear',
    -- menu categories
    'bug', 'progression', 'confusing_screen', 'feature_request', 'general',
    -- shared
    'other'
  )),
  message text,
  route text,
  session_id uuid references public.workout_sessions(id) on delete set null,
  decision_id uuid references public.progression_decisions(id) on delete set null,
  -- Decision/session context that makes a "felt wrong" analyzable: ruleId,
  -- movementId, movementName, stateType, scope, previousValue, recommendedValue,
  -- decisionStatus, templateId, weekIndex, programTitle, decisionIds...
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint feedback_events_answer_source check (answer is null or source = 'post_workout')
);

create index if not exists feedback_events_created_at_idx on public.feedback_events (created_at desc);

alter table public.feedback_events enable row level security;

create policy "feedback events are self owned" on public.feedback_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.feedback_events to authenticated;
-- Feedback text should not be even theoretically anon-readable; drop the blanket
-- anon SELECT that 202606210003_grant_table_permissions.sql hands out by default.
revoke all on public.feedback_events from anon;
-- The report CLI (scripts/feedback-report.mjs) reads with the service-role key.
-- New public tables are not auto-granted to service_role in this project.
grant select on public.feedback_events to service_role;
