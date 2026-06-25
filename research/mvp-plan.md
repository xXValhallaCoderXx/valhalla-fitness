# MVP Release Plan

Date: 2026-06-21

## 1. Goal

Ship a mobile-first web MVP that can be tested end-to-end in the gym:

- Sign in with Supabase Auth.
- Start a seeded strength program.
- Enter training maxes, anchors, and basic preferences.
- See today's planned workout.
- Log main lifts, variations, accessories, load, reps, RIR/RPE, notes, and substitutions.
- Finish a session and review auditable progression recommendations.
- See useful program and history views afterward.

The MVP should feel like a real training app, not a prototype shell. The workout loop must be trustworthy before future readiness, injury, and AI modules are added.

## 2. Source Inputs

Use these files as the current product/design source of truth:

- `final-app-spec.md`
- `design-spec.md`
- `references/base-strength-by-bromley.md`
- `references/Ultimate-workout-plan-old.md`
- `dev-assets/sample-pages` reference exports for template library, today, live session, substitutions, program overview, history, account settings, sign in, and session summary.
- Updated Figma screens, assumed to match or supersede the latest `dev-assets` exports.

When there is conflict:

1. This MVP plan controls release sequencing.
2. `final-app-spec.md` controls program facts and progression behavior.
3. `design-spec.md` and Figma/dev-assets control UI structure and interaction patterns.
4. Placeholder names in exports are not product facts.

## 3. MVP Scope

### Must Ship

- Supabase Auth with email/password and magic-link support.
- Supabase Postgres as the canonical database.
- Row-level security on all user-owned data.
- Mobile-first PWA-capable app shell.
- Responsive desktop layout for review, setup, and history.
- Bottom navigation: Today, Program, History, Templates, Settings.
- Program template library.
- Program setup with units, rounding, schedule, training maxes, and anchors.
- Today screen with current workout, last comparable work, accessories, and pending recommendations.
- Live session logging with stable set rows and quick numeric controls.
- Main lift logging with load, reps, RIR/RPE, AMRAP/top-set markers, and back-off work.
- Accessory logging with rep ranges, target RIR/RPE, previous performance, and double progression hints.
- Manual substitutions that preserve planned movement and performed movement separately.
- Finish-session summary with Accept, Later, and Dismiss actions for recommendations.
- Program overview with current block/wave/week, anchors, timeline, recent sessions, and pending decisions.
- History overview with recent sessions, movement history, best sets, e1RM trend where applicable, volume, and substitution labels.
- Settings for account, units, rounding, equipment profile, session preferences, and sync status.
- Local active-session cache so a workout survives refresh and short connectivity drops.

### Program Pack

The MVP should seed these programs:

1. Custom Healthy 5/3/1 FSL.
2. Bromley Bullmastiff.
3. Bromley 70s Powerlifter.
4. Bromley Volume/Intensity.

First stretch template, only if the engine and seed workflow are already stable:

- Bromley Powerbuilder.

This gives enough variety to test training maxes, plus sets, base/peak contrast, whole-body volume/intensity organization, main lift variations, and accessory tracking without making the first release depend on every Bromley template.

### Explicitly Out Of Scope

- AI recommendations.
- Readiness-based adjustments.
- Injury or pain gating.
- Wearable integrations.
- Autonomous workout changes.
- Calendar export.
- Hevy, Strong, CSV, or spreadsheet export.
- Full visual program builder.
- Social features.
- Coaching marketplace.

The data model should leave clean module boundaries for these, but the MVP UI should not expose them as usable features.

## 4. Recommended Stack

- App: Next.js, TypeScript, React.
- Styling: Tailwind CSS or equivalent utility-first setup matching the exported screens.
- Icons: lucide-react.
- Auth: Supabase Auth.
- Database: Supabase Postgres.
- DB migrations: Supabase CLI migrations committed to the repo.
- Client data: RTK Query for app data fetching, mutations, cache invalidation, and optimistic updates.
- Client DB/cache: IndexedDB for active workout drafts and pending mutation queues.
- Local UI state: Redux slices or colocated React state for ephemeral UI state such as active set controls, sheets, and filters.
- Validation: Zod schemas shared between UI and server/database adapters.
- Progression engine: pure TypeScript module with no Supabase dependency.
- Testing: Vitest for engine tests, Playwright for key flows, Supabase local dev for RLS tests.

Use Supabase directly instead of Prisma/Auth.js for MVP. Use Next.js route handlers as the primary API boundary for app data. Route handlers should create cookie-scoped Supabase server clients and rely on RLS, never the service-role key.

Server Actions are allowed only for low-frequency form-style operations where cache coordination is simple, such as profile setup, settings save, or a basic program setup submit. Do not use Server Actions as the primary data layer for the live workout experience.

## 5. App Architecture

### Layers

```text
UI screens
  -> feature hooks
    -> RTK Query API slice
      -> Next.js route handlers
        -> Supabase server client with RLS
    -> local workout draft store
    -> pure progression engine
      -> template seed data
      -> workout logs
      -> anchor state
```

### API And Client Data Strategy

The MVP should use explicit API endpoints plus RTK Query rather than treating Server Actions as the default mutation path.

Recommended route shape:

```text
GET    /api/today
GET    /api/programs/templates
POST   /api/programs/:templateId/start
GET    /api/programs/active

POST   /api/sessions
GET    /api/sessions/:id
PATCH  /api/sessions/:id
POST   /api/sessions/:id/sets/:setId
PATCH  /api/sessions/:id/sets/:setId
POST   /api/sessions/:id/substitute
POST   /api/sessions/:id/finish

POST   /api/progression/evaluate
PATCH  /api/progression/:decisionId

GET    /api/history/recent
GET    /api/movements/:movementId/history
GET    /api/movements/:movementId/previous
```

RTK Query responsibilities:

- Cache Today, active program, templates, session, history, and movement data.
- Patch cache optimistically for set completion, load/reps/RIR edits, notes, substitutions, and recommendation actions.
- Invalidate or refetch related entities after durable mutations.
- Represent loading, saving, failed, and retrying states consistently.
- Keep cross-screen data in sync after finishing a session or accepting a progression decision.

Local draft/offline responsibilities:

- Store the active workout draft in IndexedDB.
- Queue set-level mutations with `client_mutation_id`.
- Replay queued mutations when connectivity returns.
- Keep the live workout usable while RTK Query mutations are pending or retrying.
- Mark conflicts or failed sync clearly without losing the user's local log.

Server Action responsibilities:

- Low-frequency form submissions where optimistic cache behavior is not central.
- Auth-adjacent flows only when they fit Supabase SSR guidance.
- Never the live session set-row mutation loop.

For transactional operations such as finishing a session and creating progression decisions, prefer a route handler that calls a Supabase RPC/Postgres function or performs a carefully validated transaction-like sequence. The client should still treat the operation as an RTK Query mutation so the summary, Today, Program, and History caches update together.

### Principles

- Program templates are data, not hardcoded UI.
- Started workouts snapshot prescriptions so old logs do not change if templates are edited later.
- Movement identity is separate from prescription and log data.
- Recommendations are stored separately from logs and accepted manually.
- All user-owned rows include `user_id`.
- All writes are idempotent where retry is likely.
- The UI should keep logging usable even while sync is pending.
- The live workout screen is local-first and optimistic.
- Server-rendered initial pages should hydrate into RTK Query-managed interactive views.

## 6. Supabase Data Model

### Core Tables

`profiles`

- `id uuid primary key references auth.users(id)`
- `email text`
- `display_name text`
- `units text check in ('kg', 'lb')`
- `rounding numeric`
- `created_at timestamptz`
- `updated_at timestamptz`

`movements`

- `id text primary key`
- `name text`
- `category text`
- `equipment text[]`
- `variation_of text null`
- `default_unit text`
- `is_competition boolean`

Seeded and read-only for normal users.

`program_templates`

- `id text primary key`
- `name text`
- `source text`
- `description text`
- `days_per_week int`
- `progression_label text`
- `complexity text`
- `schema_version text`
- `is_active boolean`
- `created_at timestamptz`

`program_template_versions`

- `id uuid primary key`
- `template_id text references program_templates(id)`
- `version text`
- `definition jsonb`
- `created_at timestamptz`

`program_instances`

- `id uuid primary key`
- `user_id uuid references profiles(id)`
- `template_id text references program_templates(id)`
- `template_version_id uuid references program_template_versions(id)`
- `title text`
- `status text check in ('active', 'paused', 'completed', 'archived')`
- `start_date date`
- `units text`
- `rounding numeric`
- `current_block_id text`
- `current_week_index int`
- `created_at timestamptz`
- `updated_at timestamptz`

`program_anchors`

- `id uuid primary key`
- `user_id uuid references profiles(id)`
- `program_instance_id uuid references program_instances(id)`
- `movement_id text references movements(id)`
- `anchor_type text`
- `value numeric`
- `source jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

`workout_sessions`

- `id uuid primary key`
- `user_id uuid references profiles(id)`
- `program_instance_id uuid references program_instances(id)`
- `planned_session_id text`
- `status text check in ('planned', 'in_progress', 'completed', 'skipped')`
- `scheduled_date date`
- `started_at timestamptz null`
- `completed_at timestamptz null`
- `prescription_snapshot jsonb`
- `notes text`
- `client_mutation_id text unique`
- `created_at timestamptz`
- `updated_at timestamptz`

`exercise_logs`

- `id uuid primary key`
- `user_id uuid references profiles(id)`
- `session_id uuid references workout_sessions(id)`
- `slot_id text`
- `planned_movement_id text references movements(id)`
- `performed_movement_id text references movements(id)`
- `role text check in ('main', 'variation', 'accessory', 'warmup', 'event')`
- `order_index int`
- `target_summary text`
- `notes text`
- `created_at timestamptz`
- `updated_at timestamptz`

`set_logs`

- `id uuid primary key`
- `user_id uuid references profiles(id)`
- `exercise_log_id uuid references exercise_logs(id)`
- `set_index int`
- `target_load numeric null`
- `target_reps int null`
- `target_rep_min int null`
- `target_rep_max int null`
- `target_rpe numeric null`
- `target_rir numeric null`
- `actual_load numeric null`
- `actual_reps int null`
- `actual_rpe numeric null`
- `actual_rir numeric null`
- `completed boolean`
- `is_top_set boolean`
- `is_amrap boolean`
- `is_backoff boolean`
- `note text`
- `client_mutation_id text unique`
- `created_at timestamptz`
- `updated_at timestamptz`

`substitution_logs`

- `id uuid primary key`
- `user_id uuid references profiles(id)`
- `session_id uuid references workout_sessions(id)`
- `slot_id text`
- `planned_movement_id text references movements(id)`
- `performed_movement_id text references movements(id)`
- `reason text check in ('equipment_missing', 'crowded_gym', 'preference', 'fatigue', 'other')`
- `note text`
- `created_at timestamptz`

`progression_decisions`

- `id uuid primary key`
- `user_id uuid references profiles(id)`
- `program_instance_id uuid references program_instances(id)`
- `movement_id text references movements(id)`
- `rule_id text`
- `scope text check in ('session', 'week', 'wave', 'cycle', 'block')`
- `status text check in ('pending', 'accepted', 'dismissed', 'superseded')`
- `input_summary text`
- `recommendation text`
- `previous_anchor numeric null`
- `recommended_anchor numeric null`
- `created_at timestamptz`
- `resolved_at timestamptz null`

### RLS Rules

- Public template reads can be allowed for `program_templates`, `program_template_versions`, and `movements`.
- All user-owned tables require `auth.uid() = user_id`.
- `profiles.id` must equal `auth.uid()`.
- Users cannot insert, update, or delete seeded templates or seeded movements.
- Progression decisions can only be updated by their owner.
- Service-role access is reserved for migrations and seed scripts, not client code.

### Environment Variables

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for seed/migration scripts only.

Never expose the service-role key to client bundles.

## 7. Progression Engine Scope

Build a pure TypeScript engine with golden tests before connecting it deeply to UI.

### Required Functions

- `mround(value, increment)`
- `e1rm(weight, reps, rir?)`
- `resolveAnchor(anchorDefinition, anchorState)`
- `expandProgramWeek(template, instance, weekIndex)`
- `expandSession(template, instance, plannedSessionId)`
- `compute531FslSets(anchor, week, rounding)`
- `evaluate531TmBand(cycleTopSets, currentTm, rounding)`
- `evaluateBullmastiffPlusSet(setLog, baselineReps, anchor, rounding)`
- `evaluateAccessoryDoubleProgression(history, rule, rounding)`
- `computePreviousComparable(movementId, role, history)`
- `summarizeProgressionDecision(decision)`

### Required Rules

Healthy 5/3/1 FSL:

- Four-week cycle: 5s, 3s, 5/3/1, deload.
- Training-max anchor.
- FSL back-off work.
- Plus sets capped by user-entered RIR/RPE.
- TM recommendations: reset, hold, standard, double.

Bullmastiff:

- Plus-set baseline.
- Extra reps determine next-load recommendation.
- Recommendation is pending until accepted.
- Variations and accessories progress separately.

70s Powerlifter:

- Base and peak contrast.
- Main lift, variation, and accessory layers.
- Step-loaded waves where weight does not drop inside a wave unless explicitly authored.

Volume/Intensity:

- Three-day whole-body split.
- Volume and intensity work represented as separate tracks.
- Alternating waves are explicit in template data.

Accessories:

- Rep range plus target RIR/RPE.
- Add load when all sets hit top of range at target RIR or easier.
- Repeat when minimums are hit but top of range is not complete.
- Reduce or repeat conservatively after misses.

## 8. Screen Implementation Map

### Sign In

Source: sign-in sample-page export.

MVP requirements:

- Email/password sign in.
- Magic-link sign in.
- Create account.
- Forgot password.
- Redirect authenticated users to Today.

### Templates

Source: template-library sample-page export.

MVP requirements:

- Filter chips: All, 5/3/1, Bromley, Base, Peak, High volume, Low volume.
- Canonical source badges.
- Correct days/week and progression labels.
- Start Program action.
- No app-store style browsing or marketing copy.

### Program Setup

Use `design-spec.md` plus template library patterns.

MVP requirements:

- Units and rounding.
- Weekly schedule.
- Training max / anchor entry.
- Recent-set seed option where practical.
- Review before starting.
- Sticky confirm action on mobile.

### Today

Source: daily overview sample-page export.

MVP requirements:

- Active program and current position.
- Session title and hardness label.
- Start or Resume primary action.
- Main lift preview with previous comparable performance.
- Accessory preview.
- Pending progression decision, if any.
- Upcoming session preview.

### Live Session

Source: live-session sample-page export.

MVP requirements:

- Session header, progress, and finish.
- Movement rail/list.
- Current movement expanded.
- Stable set rows.
- Target values stay visible after actual values are entered.
- Load/reps steppers and quick chips.
- RIR/RPE selector.
- Notes.
- History and swap actions.
- Sync state indicator.

### Substitution Sheet

Source: substitution-sheet sample-page export.

MVP requirements:

- Planned movement summary.
- Search and filters.
- Alternatives grouped by category/equipment.
- Reason selector limited to equipment missing, crowded gym, preference, fatigue, other.
- Planned/performed preview before confirmation.
- Store both movement IDs.

### Program Overview

Source: program-overview sample-page export.

MVP requirements:

- Current program header.
- Block/wave/week timeline.
- Current anchors.
- Session progress.
- Recent sessions.
- Pending progression decisions with Accept, Later, Dismiss.

### History

Source: history-overview sample-page export.

MVP requirements:

- Recent, Movements, Bests, Volume tabs.
- Movement detail with recent logs and best sets.
- Main lift and accessory history.
- Planned/performed substitution labels.
- Simple e1RM/volume charts where data exists.

### Settings

Source: account-settings sample-page export.

MVP requirements:

- Account.
- Units and rounding.
- Equipment profile.
- Sync status.
- Future modules shown only as unavailable/future, if shown at all.

### Finish Session Summary

Source: session-summary sample-page export.

MVP requirements:

- Completed work summary.
- Main lift top sets.
- Accessory outcomes.
- Progression recommendations.
- Session notes.
- Accept, Later, Dismiss.
- Done/Finish action.

## 9. Release Milestones

### Milestone 0: Project Foundation

Outcome: app can run locally and deploy as an empty authenticated shell.

Tasks:

- Scaffold Next.js + TypeScript app.
- Add Tailwind/design tokens matching dark mobile direction.
- Add lucide icons.
- Add base routes: auth, Today, Program, History, Templates, Settings.
- Add responsive app shell and bottom navigation.
- Add Supabase client/server helpers.
- Add Redux Toolkit store and RTK Query base API setup.
- Add shared API error/result types.
- Add environment variable validation.
- Add basic CI checks: typecheck, lint, test.

Acceptance:

- App runs locally.
- Empty shell works at mobile and desktop widths.
- RTK Query provider is wired into the app shell.
- Auth route can load without Supabase write flows implemented.

### Milestone 1: Supabase Foundation

Outcome: user accounts and user-scoped storage are working.

Tasks:

- Create Supabase migrations for core tables.
- Add RLS policies.
- Add seed scripts for movements and initial program template metadata.
- Implement profile creation after first auth.
- Add settings persistence for units and rounding.
- Implement initial route handlers for profile/settings/template reads.
- Connect profile/settings/template reads through RTK Query.
- Add two-user RLS tests.

Acceptance:

- User can sign up, sign in, sign out, and return.
- User profile is created automatically.
- User A cannot access User B data.
- Template metadata is readable but not user-editable.
- RTK Query can read authenticated profile data through route handlers.

### Milestone 2: Program Engine And Seeds

Outcome: templates can generate planned workouts deterministically.

Tasks:

- Build pure progression engine.
- Add golden tests for 5/3/1 FSL.
- Add golden tests for Bullmastiff plus-set logic.
- Add accessory double progression tests.
- Encode Healthy 5/3/1 FSL template.
- Encode Bullmastiff template.
- Encode 70s Powerlifter template.
- Encode Volume/Intensity template.
- Add template validation that catches missing anchors, invalid percentages, and malformed set targets.

Acceptance:

- Tests prove generated 5/3/1 working weights and FSL rows.
- Bullmastiff plus-set recommendation is correct and rounded.
- Accessory progression hints are deterministic.
- Seeded templates show correct names, badges, days/week, and progression labels.

### Milestone 3: Onboarding And Program Start

Outcome: a real user can pick a program and land on Today.

Tasks:

- Implement template library.
- Implement program setup flow.
- Add RTK Query endpoints for template list, start program, active program, and Today.
- Support units, rounding, schedule, and anchor entry.
- Create `program_instances` and `program_anchors`.
- Generate or resolve the next planned session.
- Implement Today screen for a newly started program.

Acceptance:

- User can start Healthy 5/3/1 FSL.
- User can start each MVP Bromley template.
- Today shows the correct first session.
- Starting a program invalidates/refetches active program and Today caches.
- Template facts match `final-app-spec.md`.

### Milestone 4: Live Workout Loop

Outcome: the core gym flow is usable.

Tasks:

- Create workout session from Today.
- Snapshot prescription on start.
- Add RTK Query endpoints for session create, session read, set upsert/update, and session patch.
- Render main, variation, and accessory movements.
- Implement set logging with load, reps, RIR/RPE, complete flag, and notes.
- Implement optimistic RTK Query cache patches for set edits and completed-state changes.
- Implement rollback or sync-failed state when a set mutation is rejected.
- Add quick increments for load and reps.
- Defer rest timer controls until a real timer feature is implemented.
- Add previous comparable performance lookup.
- Add local active-session draft cache.
- Add pending mutation queue in IndexedDB for offline or failed set mutations.
- Add idempotent set writes using `client_mutation_id`.
- Implement Resume state.

Acceptance:

- User can start, partially log, refresh, and resume a workout.
- Main lift and accessory rows both save correctly.
- Set rows update immediately before the network round trip completes.
- Previous comparable work appears before logging.
- Duplicate set rows are not created on retry.
- Offline/pending set changes remain visible and sync later.
- Layout is usable at 375px mobile width.

### Milestone 5: Substitutions And Finish Flow

Outcome: workouts can be completed and produce reviewable recommendations.

Tasks:

- Implement substitution sheet.
- Add RTK Query endpoints/mutations for substitutions, finish-session, and progression decisions.
- Store planned and performed movements separately.
- Apply optimistic cache updates for substitutions and recommendation actions where safe.
- Implement finish-session confirmation.
- Evaluate 5/3/1, Bullmastiff, and accessory recommendations.
- Store progression decisions as pending.
- Implement Accept, Later, and Dismiss.
- Update anchors only when accepted.
- Build session summary screen.

Acceptance:

- Substitution history is explicit.
- Pain/injury is not a V1 substitution reason.
- Finish flow catches incomplete main sets but does not block valid completion.
- Recommendations are correct, visible, and auditable.
- Anchors do not change silently.
- Finish-session invalidates or updates Today, Program, History, and active session caches.

### Milestone 6: Program, History, Settings Polish

Outcome: the app is testable beyond a single workout.

Tasks:

- Build Program overview.
- Build recent session history.
- Build movement history detail.
- Build simple best-set and volume summaries.
- Build settings sections.
- Add RTK Query cache tags for Program, Session, History, Movement, Settings, and Progression entities.
- Add sync status indicators.
- Add loading, empty, offline, and failure states.
- Complete light theme pass.
- Fix responsive desktop layouts.

Acceptance:

- User can inspect current program position.
- User can see main lift and accessory history.
- Substituted sessions remain readable.
- Settings persist.
- No bottom-nav/content overlap on mobile.

### Milestone 7: MVP Hardening

Outcome: release candidate for personal testing.

Tasks:

- Run engine golden tests.
- Run Supabase RLS tests.
- Run route-handler tests for authenticated API access and validation failures.
- Run RTK Query optimistic-update tests for set edits, substitutions, and recommendation actions.
- Run Playwright smoke tests for auth, start program, live session, substitution, finish, history.
- Test mobile dark mode at 375px and 430px widths.
- Test desktop at 1280px and 1440px widths.
- Test refresh/resume during active workout.
- Test brief offline logging and resync.
- Test failed mutation rollback/sync-failed UI.
- Review template metadata against final spec.
- Remove or hide unfinished future-module UI.

Acceptance:

- A signed-in user can complete at least one full Healthy 5/3/1 workout.
- A signed-in user can start and log at least one Bullmastiff workout.
- All MVP program templates can be started without malformed prescriptions.
- No known RLS data leak.
- No critical mobile layout bug blocks gym use.

## 10. Testing Plan

### Unit Tests

- 5/3/1 week generation.
- 5/3/1 TM recommendation bands.
- Bullmastiff plus-set recommendation.
- Accessory double progression.
- Rounding in kg and lb.
- Previous comparable performance selection.
- Template validation.

### Integration Tests

- Start program creates instance and anchors.
- Start workout snapshots prescriptions.
- Set writes are idempotent.
- RTK Query set mutations optimistically update cached session data.
- Rejected set mutations roll back or mark the affected local row as sync failed.
- Offline queued set mutations replay without duplicating rows.
- Finish session stores progression decisions.
- Accepting a recommendation updates the correct anchor.
- Accepting or dismissing a recommendation updates progression, Today, Program, and History caches.
- Substitution stores planned and performed movement IDs.
- Substitution mutations update the live session cache immediately and reconcile with the server response.

### RLS Tests

- User cannot read another user's program instances.
- User cannot read another user's sessions, exercise logs, set logs, substitutions, or progression decisions.
- User cannot mutate seeded templates or seeded movements.
- Authenticated users can read active templates.
- Route handlers use cookie-scoped Supabase clients and honor RLS.

### Playwright Smoke Tests

- Sign up/sign in.
- Choose program.
- Enter anchors.
- Start workout.
- Log main lift.
- Log accessory.
- Confirm logged set appears immediately before network completion.
- Substitute movement.
- Finish workout.
- Accept one recommendation.
- Review history.

### Manual Mobile QA

- 375px mobile portrait.
- 430px mobile portrait.
- Mobile landscape sanity pass.
- Desktop 1280px and 1440px.
- Dark theme primary.
- Light theme secondary.
- Poor connectivity / offline draft behavior.
- Failed mutation and retry behavior.

## 11. MVP Acceptance Criteria

The MVP is releasable for testing when:

- Auth works through Supabase.
- Supabase DB is the canonical store.
- RLS is enabled and tested for user-owned tables.
- User can start Healthy 5/3/1 FSL.
- User can start Bullmastiff, 70s Powerlifter, and Volume/Intensity.
- User can enter and edit training maxes and anchors.
- Today clearly shows the current workout and primary action.
- Core app reads and writes go through explicit route handlers plus RTK Query.
- Server Actions are limited to low-frequency form-style operations, not live workout set logging.
- Main lifts can be logged with load, reps, RIR/RPE, top-set/AMRAP, and back-off work.
- Accessories can be logged with rep ranges, RIR/RPE, history, and progression hints.
- Set edits, completed states, substitutions, and recommendation actions feel immediate through optimistic updates.
- Manual substitutions preserve planned and performed movement history.
- Session summary creates reviewable progression decisions.
- Recommendations support Accept, Later, and Dismiss.
- Active workout survives refresh and short offline periods.
- Pending mutations are idempotent and recoverable.
- History shows main lifts, accessories, and substitutions.
- The app works well on mobile and remains usable on desktop.
- Future modules are not required for the workout loop.

## 12. Scope Guards

Use these guards when the build starts to sprawl:

- Prefer fewer correct templates over many loose templates.
- Ship Bullmastiff before other Bromley plans because it proves plus-set recommendations.
- Ship Healthy 5/3/1 before everything else because it proves training maxes and the core workout loop.
- Keep AI/readiness/injury concepts out of actions and decisions until those modules exist.
- Do not implement a full program builder for MVP.
- Do not auto-accept progression changes.
- Do not make accessories unstructured notes.
- Do not copy long explanatory program prose into seed data; store structured prescriptions and concise metadata.

## 13. Future Module Boundaries

### Readiness

Future module consuming sleep, HRV, soreness, motivation, and recent fatigue. It should recommend adjustments, not mutate workouts silently.

### Injury / Pain Gating

Future module for pain-specific movement constraints, substitution rules, and progression regressions. V1 can store normal notes, but it should not classify pain or change sessions from pain data.

### AI Recommendations

Future module that consumes structured program, movement, equipment, and history data. It should return proposed substitutions or recommendations for user confirmation.

### Export

Future module for CSV, spreadsheet, Hevy, Strong, and calendar export. V1 schema should make export possible later, but export is not required for the first test release.

## 14. First Test Build Definition

The first build worth putting on a phone should include:

- Supabase sign-in.
- Template library.
- Healthy 5/3/1 FSL setup.
- Today.
- Live session logging.
- Finish summary.
- 5/3/1 progression recommendation.
- Basic history.

Then add Bullmastiff and the remaining MVP Bromley templates against the same engine before calling it the MVP release candidate.
