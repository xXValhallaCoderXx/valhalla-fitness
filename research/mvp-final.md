# MVP Final Implementation Plan

Date: 2026-06-22

## 1. Purpose

This document is the implementation handoff for the final MVP push. It is based on:

- `final-app-spec.md`
- `mvp-plan.md`
- The current TanStack Start implementation in `src/`
- Product feedback after the UX/theme refresh

The app already has a strong UX layer and a usable first training loop. The remaining work should focus on making the training system data-driven, expanding the MVP program pack, fixing history-aware training context, and improving the Program and History pages with real data.

Do not spend this phase redesigning the UX. Keep the existing UX structure and improve the underlying data and UI content.

## 2. Current Product Direction

The MVP should be a mobile-first strength training app that can be trusted in the gym:

- Sign in with Supabase.
- Start a structured program.
- Enter units, rounding, and training anchors.
- See today's planned workout.
- Log main lifts, variations, accessories, loads, reps, RIR/RPE, notes, and manual substitutions.
- Finish a workout and review progression recommendations.
- See meaningful Program and History views after training.

Future modules remain out of scope:

- AI recommendations.
- Readiness automation.
- Injury or pain gating.
- Wearable integrations.
- Exports.
- Social/coaching features.
- Full visual program builder.

## 3. Current Architecture To Preserve

The original MVP plan mentions Next.js, RTK Query, route handlers, and Server Actions. The actual app is now built on:

- TanStack Start.
- TanStack Router.
- React Query.
- TanStack `createServerFn` server functions.
- Supabase Auth and Postgres.
- Mantine plus app CSS tokens.
- Dexie for local workout storage helpers.

Do not migrate the app to Next.js or RTK Query for MVP. Update docs to match the current system instead.

Target documentation updates:

- `mvp-plan.md`
- `final-app-spec.md`, only where it incorrectly describes stack-level implementation details.
- Any local README or deployment docs that imply a different runtime.

The docs should say that the app uses TanStack Start, React Query, server functions, Supabase, and the existing Supabase RLS model.

## 4. Current State Summary

### Already Working

- Supabase auth with password, signup, reset, and magic link.
- Core Supabase schema for profiles, movements, templates, program instances, anchors, sessions, logs, substitutions, and progression decisions.
- Template library and start flow for:
  - Healthy 5/3/1 FSL.
  - Bromley Bullmastiff.
- Today screen with planned, active, resume, and completed states.
- Live workout logging for set load, reps, RIR, RPE, completion, and notes.
- Manual substitutions for non-main movements.
- Finish flow with summary route and progression decisions.
- Program page with timeline, anchors, and pending decisions.
- History page with recent sessions and workout summary modal.
- Unit tests for important pure helpers.

### Main Gaps

- 70s Powerlifter and Volume/Intensity are listed but unavailable.
- Program expansion is still hardcoded in `src/lib/templates.ts`.
- Template definitions exist in `program_template_versions.definition`, but runtime expansion does not yet consume them as the source of truth.
- Previous comparable performance is mostly hardcoded as "no prior log yet".
- Rest timer setting exists but there is no real timer feature.
- Program page needs more data-backed meaning beyond timeline and anchors.
- History page needs more useful training stats and movement history summaries.
- Docs still describe an older intended stack.

## 5. Product Decisions From Feedback

Use these as hard constraints for the next implementation pass.

### Add The Other MVP Programs

Add the remaining MVP programs now:

1. Bromley 70s Powerlifter.
2. Bromley Volume/Intensity.

These should be straightforward if the engine is correct. If adding them requires duplicating another hardcoded `expandXSession` function, treat that as evidence the engine abstraction is wrong and fix the abstraction.

Powerbuilder remains stretch after the engine handles the two missing MVP templates cleanly.

### Move Training Engine Out Of `templates.ts`

The training engine should be driven by the database template DSL, not by TypeScript template-specific branches.

`src/lib/templates.ts` may keep small fallback metadata for local/dev safety, but it must stop being the runtime source of truth for program structure.

### Fix Previous Comparable Performance

Previous comparable performance is a core product feature. It should use completed workout history, not placeholder labels.

It must appear in:

- Today main/accessory previews.
- Live session movement context.
- Session summary main-lift comparison.
- Any movement history surfaces added in this phase.

### Remove Rest Timer For Now

Remove the rest timer preference and visible timer promises until a real timer is implemented.

This means:

- Remove "Auto-start rest timer" from Settings.
- Stop sending `autoStartTimer` through UI forms.
- Leave the DB column alone unless a migration is truly necessary. It is harmless as dormant data.
- Remove or revise docs that list timer controls as MVP requirements.

### Program Setup Is Fine For MVP

The current setup flow is acceptable for MVP because it can start a valid program with:

- Units.
- Rounding.
- Required anchors/training maxes.
- Review/confirmation before replacing an active program.

Do not block MVP on weekly schedule customization or recent-set seeding.

Schedule review and recent seed workflows are useful, but they are not critical to proving the product:

- The app can progress by current program position rather than a full calendar scheduler.
- A user can manually enter anchors instead of deriving them from recent sets.
- Starting a valid program and landing on Today matters more than a perfect onboarding wizard.

Treat schedule and recent-set seeding as post-MVP onboarding improvements unless implementing them becomes necessary for a specific template.

### Improve History Stats

Add more data-backed stats to History, but do not fake analytics. Use only data already available from completed sessions and set logs.

### Deepen Program Overview

The Program page should explain where the user is in the training process and what is coming next, using real program/session data.

### Do Not Spend This Phase Fixing Flaky E2E

The end-to-end test is known to be flaky and will be improved separately by the user. Do not make Playwright stability the central task for this plan.

Still keep unit and type-level coverage strong, and avoid making E2E worse.

## 6. Implementation Priority

### Phase 1: Database DSL Training Engine

Goal: make templates data-driven so new programs are added by seed data plus generic rules, not new hardcoded expanders.

Target files:

- `src/lib/templates.ts`
- `src/lib/progression.ts`
- `src/lib/program-timeline.ts`
- `src/server/api.ts`
- `src/types/training.ts`
- `supabase/migrations/*`
- `tests/*templates*`
- `tests/*progression*`

Current issue:

- `expandPlannedSession()` branches on `program.templateId`.
- Healthy 5/3/1 and Bullmastiff session construction is hardcoded.
- Timeline construction is also template-specific.
- `program_template_versions.definition` is seeded but not meaningfully used by the runtime engine.

Required approach:

1. Define a TypeScript representation of the template DSL that mirrors `program_template_versions.definition`.
2. Validate template definitions at runtime with Zod or a comparable structured validator.
3. Load the active program's template version definition from Supabase when resolving Today/session plans.
4. Replace `expandHealthy531Session()` and `expandBullmastiffSession()` with a generic `expandSessionFromTemplateDefinition()` path.
5. Keep progression calculations in pure TypeScript helpers, but select rules from DSL data.
6. Keep movement substitutions and overrides compatible with slot IDs, phase keys, roles, and replacement rules.
7. Keep started workout snapshots immutable so old workouts do not change when template definitions are updated.

The DSL should support at least:

- Template metadata.
- Schedule/day definitions.
- Blocks, phases, waves, and weeks.
- Session slots.
- Main, variation, accessory, warmup, and event roles.
- Movement IDs and movement families.
- Anchor references.
- Percentage-based loads.
- Training max loads.
- Fixed loads where needed.
- Set counts.
- Target reps.
- Rep ranges.
- RIR/RPE targets.
- AMRAP/top-set/backoff flags.
- Progression rule IDs.
- Hardness labels.
- Estimated duration.
- Human-readable target summaries.

Acceptance criteria:

- Healthy 5/3/1 still produces the same expected sessions.
- Bullmastiff still produces the same expected base/peak sessions.
- 70s Powerlifter and Volume/Intensity can be added without new template-specific expansion functions.
- Template validation catches malformed definitions before a user starts a broken program.
- `templateCatalog` is no longer the authoritative source of availability.
- Tests prove the generic engine handles all MVP templates.

### Phase 2: Add 70s Powerlifter And Volume/Intensity

Goal: complete the MVP program pack from `final-app-spec.md`.

Target sources:

- `final-app-spec.md`
- `references/base-strength-by-bromley.md`
- Existing template seed migrations.

Target files:

- New Supabase migration for template metadata and versions.
- Engine tests for the new template definitions.
- Template library availability logic.
- Program timeline generation.

Programs to add:

1. Bromley 70s Powerlifter.
   - 4-day upper/lower split.
   - One primary lift per day.
   - Main lift, variation, and bodybuilding accessory layers.
   - Base-to-peak contrast.
   - Step-loaded waves where weight does not drop within a wave unless explicitly authored.

2. Bromley Volume/Intensity.
   - 3-day whole-body split.
   - Alternates 3-week volumizing waves and 3-week intensity/top-set waves.
   - Represents volume and intensity as explicit authored tracks.

Implementation notes:

- Do not invent extra coaching logic.
- Do not synthesize random or noisy wavy prescriptions.
- If source material is ambiguous, encode the simplest faithful structured fixture and note any assumption in the seed definition comments or tests.
- Keep template UI labels canonical:
  - Source: Bromley.
  - Correct days per week.
  - Correct progression label.
  - Correct complexity/tags.

Acceptance criteria:

- Both templates appear as available in Templates.
- User can start each template.
- Today shows the correct first session.
- Live session can be started for each template.
- Generated sessions contain main, variation, and accessory work where expected.
- Golden tests cover at least first week, wave transition, and a later block/peak example for each template.

### Phase 3: Previous Comparable Performance

Goal: show useful prior performance at the moment of logging.

Target files:

- `src/server/api.ts`
- `src/lib/progression.ts`
- `src/types/training.ts`
- `src/routes/today.tsx`
- `src/features/workout/components/live-session.tsx`
- `src/routes/sessions.$sessionId.summary.tsx`
- Movement history query helpers.

Current issue:

- Planned movements contain labels such as "Last comparable: no prior log yet" from `src/lib/templates.ts`.
- The app already has `getMovementHistoryFn()`, but session expansion does not use it to populate `PreviousComparable`.

Required behavior:

For each planned movement slot, compute the best previous comparable from completed sessions for the same user.

Matching should prefer:

1. Same performed movement ID.
2. Same planned movement ID when performed movement differs because of substitutions.
3. Same role, if available.
4. Same template/slot when available.
5. Most recent completed comparable if multiple candidates are equivalent.

Returned comparable should include:

- Movement ID.
- Label.
- Load.
- Reps.
- RIR when available.
- Performed date.
- Optionally set type, such as top set, AMRAP, backoff, or accessory best set.

For main lifts:

- Prefer top set or AMRAP set.
- Include load, reps, and RIR.
- Use e1RM as a secondary comparison where useful.

For accessories:

- Prefer best completed set in the target rep range.
- Also show completion quality when useful, such as "3/3 at 15 reps" or "last time 40 kg x 12, 12, 10".

Acceptance criteria:

- A user's second completed session for a movement shows real prior data.
- Substituted movements preserve both planned and performed context.
- No placeholder "no prior log yet" appears when comparable history exists.
- Unit tests cover main lift, accessory, substituted movement, and no-history cases.

### Phase 4: Remove Rest Timer Surface

Goal: stop advertising a feature that is not implemented.

Target files:

- `src/routes/settings.tsx`
- `src/types/training.ts`
- `src/server/api.ts`
- `final-app-spec.md`
- `mvp-plan.md`
- Any design or UI text that promises timer controls.

Implementation guidance:

- Remove the Settings checkbox.
- Remove `autoStartTimer` from front-end form state and mutation input.
- Keep `profiles.auto_start_timer` in the database for now unless removing it is clearly worth a migration.
- If keeping the field in server profile mapping is simpler, it can remain internal, but it should not be user-facing or described as MVP functionality.

Acceptance criteria:

- Settings no longer shows rest timer controls.
- Docs no longer list rest timer as MVP work.
- Typecheck passes.
- Existing settings save still works.

### Phase 5: Improve History With Real Stats

Goal: make History useful without fabricating analytics.

Target files:

- `src/server/api.ts`
- `src/types/training.ts`
- `src/lib/query-options.ts`
- `src/routes/history.tsx`
- Optional new helpers under `src/lib/history.ts`.

Current page:

- Recent sessions.
- Basic counts.
- Workout summary modal.

Add data-backed sections/tabs:

1. Overview.
   - Completed sessions.
   - Logged sets.
   - Total completed volume: sum of `actual_load * actual_reps` where both exist.
   - Number of unique movements trained.
   - Latest training date.

2. Best Sets.
   - Best top sets by movement.
   - Best e1RM for barbell movements where load and reps exist.
   - Best accessory set by load x reps or volume.

3. Movement History.
   - Search or list most recently trained movements.
   - For each movement, show last performed date, best set, total completed sets, and substitutions if relevant.

4. Volume.
   - Simple weekly volume by completed date.
   - No fake charts if data is too sparse. A compact list or bar-strip is fine.

5. Substitutions.
   - Show planned -> performed labels where substitutions happened.
   - Include reason labels.

Acceptance criteria:

- History page has more than recent session cards.
- Every stat is derived from completed sessions and set logs.
- Empty states are clear when there is not enough data.
- No synthetic trend is shown as real data.

### Phase 6: Deepen Program Overview

Goal: make Program answer "where am I, what is changing, and what is next?"

Target files:

- `src/routes/program.tsx`
- `src/server/api.ts`
- `src/types/training.ts`
- `src/lib/program-timeline.ts`
- New generic timeline helpers if Phase 1 moves timeline into the DSL.

Current page:

- Program header.
- Timeline.
- Current anchors.
- Pending progression decisions.

Add:

1. Current position summary.
   - Current block/phase/wave/week/session.
   - Main focus for the current week.
   - Current hardness.

2. Next session preview.
   - Main movement.
   - Variation/accessory count.
   - Top-set or key prescription.
   - Start/resume link when relevant.

3. Recent program sessions.
   - Last 3 to 5 completed sessions for this active program.
   - Completed sets and top-set highlights.

4. Anchor changes.
   - Current anchor values.
   - Pending recommended changes.
   - Last accepted progression decision where available.

5. Accessory plan summary.
   - Current accessory movements by day/slot.
   - Phase-slot substitutions already applied.

Acceptance criteria:

- Program page is useful between workouts.
- It reflects the generic DSL rather than template-specific prose.
- It shows recent sessions and next session context from real data.
- Pending decisions remain auditable and manually accepted.

### Phase 7: Documentation Alignment

Goal: make project docs match the app that exists.

Target files:

- `mvp-plan.md`
- `final-app-spec.md`
- `design-spec.md`, only if timer/setup references need correction.
- `src/features/README.md`, if needed.
- Deployment docs such as `RAILWAY.md`, if needed.

Required doc changes:

- Replace Next.js/RTK Query/route-handler language with TanStack Start, React Query, server functions, and Supabase.
- Remove rest timer from MVP requirements.
- Clarify that schedule customization and recent-set seed setup are post-MVP quality-of-life unless a template specifically requires them.
- State that template definitions in Supabase are the source of truth for session expansion.
- Keep the non-goals intact: no AI/readiness/injury/export/social.
- Update test expectations to acknowledge that Playwright E2E may be improved separately.

Acceptance criteria:

- A new agent reading the docs will not try to migrate stacks.
- MVP scope matches current product decisions.
- The docs emphasize data-driven templates and previous comparable performance as core requirements.

## 7. Recommended Work Order

Implement in this order:

1. Define and validate the database template DSL.
2. Move Healthy 5/3/1 and Bullmastiff expansion onto the generic DSL.
3. Add 70s Powerlifter and Volume/Intensity as DSL seed definitions.
4. Fix previous comparable performance using completed history.
5. Remove rest timer UI/docs.
6. Expand History stats using real logged data.
7. Deepen Program overview using real active-program/session data.
8. Update docs to match the current TanStack architecture and MVP scope.

The most important engineering test is this:

> Adding a new structured program should primarily mean adding a validated template definition, not adding a new route, new UI branch, or new template-specific session expander.

## 8. Testing Expectations

Do not make Playwright flakiness the main focus of this phase, but do add and maintain reliable lower-level coverage.

Run before handoff:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
```

Add or update unit tests for:

- Template DSL validation.
- Generic session expansion.
- Healthy 5/3/1 generated sessions.
- Bullmastiff generated sessions.
- 70s Powerlifter generated sessions.
- Volume/Intensity generated sessions.
- Previous comparable matching.
- e1RM and best-set history helpers.
- Program overview data helpers.

Optional, only if stable enough:

```bash
corepack pnpm playwright
```

Do not block this implementation plan on fixing flaky E2E tests unless the implementation itself causes a new deterministic failure.

## 9. Definition Of Done

This plan is complete when:

- Healthy 5/3/1, Bullmastiff, 70s Powerlifter, and Volume/Intensity are all available and startable.
- Session expansion is driven by validated template definitions from Supabase.
- `src/lib/templates.ts` no longer contains template-specific runtime expansion logic.
- Previous comparable performance is real and visible in Today/live/session summary contexts.
- Rest timer UI and MVP docs are removed or deferred.
- Program setup remains simple and valid for MVP.
- History includes useful real stats beyond recent sessions.
- Program overview shows current position, upcoming work, recent program history, anchors, and decisions.
- Docs describe the current TanStack Start/React Query/server-function system.
- Lint, typecheck, and unit tests pass.

## 10. Scope Guards

- Do not redesign the refreshed UX.
- Do not add AI, readiness, injury, export, or social features.
- Do not add provider auth buttons.
- Do not fake charts or analytics.
- Do not silently mutate anchors. Progression decisions stay reviewable.
- Do not make accessories unstructured notes.
- Do not hardcode one-off program expanders for every new template.
- Do not migrate the stack as part of MVP finalization.
