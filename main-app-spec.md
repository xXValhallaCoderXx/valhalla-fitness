# Sheetless Main App Spec

Updated: 2026-06-26

This document is the current product and implementation spec for Sheetless. It consolidates the original planning sources in `research/final-app-spec.md`, `research/mvp-final.md`, `research/mvp-plan.md`, and the OpenAI Apps SDK submission guidance that informed the broader app direction.

It supersedes the older research docs where the product or stack has changed. The research docs remain useful historical context, but this file should be treated as the root-level snapshot of the application's current vision, shipped progress, and next priorities.

## 1. Product Vision

Sheetless is a mobile-first strength training tracker for lifters who follow structured programming but need a faster, more reliable way to execute it in the gym.

The app should answer five practical questions without making the user think during a hard session:

1. What am I meant to do today?
2. What did I do last time that is comparable?
3. What load, reps, and RIR/RPE did I actually perform?
4. What does that imply for the next progression decision?
5. Where am I in the current programme?

The long-term product is a deterministic training system first, and an intelligent assistant second. The app should not depend on AI to generate workouts, explain the plan, or mutate training. AI, ChatGPT, readiness signals, injury modules, exports, and external integrations are future companion surfaces that must consume the structured training model rather than replace it.

## 2. Product Principles

- Live workout logging must be fast enough for one-handed use between sets.
- Programmes are structured data, not plain text routines.
- Movement identity is separate from prescription and from performed movement.
- Accessories are first-class training data, not notes.
- Progression recommendations are deterministic, auditable, and manually accepted.
- Previous comparable performance is a core feature, not a nice-to-have.
- Started sessions snapshot their prescription so future template edits do not rewrite old logs.
- The app should be honest about feature state. Planned modules must not be shown as shipped capabilities.
- Built-in programme labels must be source-safe and product-owned. The app can be inspired by public training concepts, but UI copy should not imply official affiliation, endorsement, or licensed templates unless that is actually true.

## 3. Current Stack

The original MVP plan proposed Next.js, RTK Query, route handlers, Server Actions, and Redux. That is now stale.

The current app uses:

- TanStack Start, TanStack Router, Vite, React 19, and TypeScript.
- TanStack React Query for client/server data coordination.
- TanStack `createServerFn` handlers as the server boundary.
- Supabase Auth and Supabase Postgres with row-level security.
- Mantine as the visual system, with Tailwind reserved for layout-only utilities.
- Dexie for local workout storage primitives and mutation queue groundwork.
- Vitest for unit/domain tests and Playwright for e2e smoke coverage.

Code is organized by domain:

- `src/domains/account`
- `src/domains/program`
- `src/domains/session`
- `src/domains/history`
- `src/domains/movement`
- `src/shared`
- `src/components`
- `src/routes`

New product work should stay inside the owning domain unless at least three domains need the abstraction.

## 4. Current Product Surface

### Auth And Account

Implemented:

- Supabase-backed email/password auth.
- Supabase magic-link auth.
- Auth callback route.
- Profile creation and settings persistence.
- User-scoped reads/writes through RLS-backed Supabase tables.
- Theme preference, units, rounding, and programme load defaults.

Not currently in scope:

- Broad auth redesign.
- Social auth as a product priority.
- Public coaching or marketplace accounts.

### Navigation

Implemented routes:

- `/today`
- `/program`
- `/history`
- `/templates`
- `/templates/:templateId/start`
- `/sessions/:sessionId`
- `/sessions/:sessionId/summary`
- `/settings`
- `/auth`
- `/auth/callback`

The primary navigation remains Today, Program, History, Templates, and Settings.

### Programme Template System

Implemented:

- Database-backed template versions through `program_template_versions.definition`.
- A validated TypeScript/Zod template DSL in `src/domains/program/lib/template-engine.ts`.
- Runtime expansion from the pinned template definition on a `ProgramInstance`.
- Local fallback definitions for development and safety.
- Template validation before starting a programme.
- Programme state values for anchors such as training maxes and working loads.
- Generic timeline and session expansion helpers driven by the DSL.

The important architecture rule is:

```text
Adding a structured programme should primarily mean adding a validated template definition, not adding a new route, UI branch, or template-specific expander.
```

### Built-In Programme Pack

Current built-in templates available in the app:

- `Beginner 5x5 Linear`
- `Training Max Wave`
- `Old School Wave Powerbuilding`
- `Classic Volume Strength`
- `Volume-Intensity Strength`

These represent the practical MVP coverage originally targeted by Healthy 5/3/1 FSL, Bullmastiff-style wave training, 70s Powerlifter-style volume strength, and Volume/Intensity-style whole-body training, but they are now presented as source-safe Sheetless programme tools.

The app should continue avoiding UI copy that presents these as official, affiliated, endorsed, or directly licensed templates from a coach, author, book, or programme brand.

### Programme Start And Customization

Implemented:

- Template catalogue with filtering, search, source labels, and active-program context.
- Programme start preview with compact week/session previews.
- Required load/state entry for template anchors.
- Derived defaults from stored one-rep maxes where possible.
- Confirmation before replacing an active programme or abandoning an active session.
- Start-time variation/accessory swaps using curated replacement options.
- Start-time accessory additions copied from existing accessory prescriptions.
- Customization summary on the active programme.

Current product choice:

- The default start flow is intentionally lightweight: choose a programme, review the work, set required values, optionally make simple variation/accessory changes, then start.
- Rich setup wizards and schedule/recent-set seeding are post-MVP unless a specific template truly requires them.

### Custom Programme Builder

Implemented:

- User-created templates stored in `program_templates` and `program_template_versions`.
- RLS rules for user-created custom templates.
- Guided custom programme builder in the template catalogue.
- Supported methodologies:
  - `None (logger only)`
  - `Training Max Wave`
  - `Plus-Set Wave Block`
  - `Simple linear progression`
- Logger-only templates with no required state, no automatic recommendations, and user-selected loads.
- Regulated custom templates with methodology-driven state requirements and progression rules.
- Arbitrary positive day counts up to seven days per week through the guided builder.

The builder should stay constrained and methodology-based. It should not become a fully free-form formula editor in the near term.

### Today

Implemented:

- Active programme context.
- Planned session expansion.
- Active, resume, planned, and completed states.
- Previous comparable performance lookup from completed history.
- Pending progression decisions.
- Start/resume/summary routing.
- Automatic advancement to the next uncompleted planned session for the current day.

Today should remain the fastest path into the live workout.

### Live Session

Implemented:

- Session creation from the planned Today workout.
- Immutable prescription snapshot on workout start.
- Main, variation, accessory, warmup, and event role support at the data-model level.
- Load, reps, RIR/RPE, completion, and note logging.
- Optimistic React Query updates for set logging.
- Saving and sync-failed states.
- Finish blocking while failed set saves remain unresolved.
- Session notes.
- Previous comparable labels inside movement context.
- Movement history modal.
- Non-main movement swaps.
- In-session accessory additions.

Current limitations:

- The Dexie local DB has active-session and queued-mutation primitives, but full offline replay is not complete enough to describe as shipped offline mode.
- Retry behavior exists at the set-row level, but there is no finished background sync worker that drains the Dexie queue after reconnect.
- The rest timer is intentionally not part of the current MVP surface.

### Movement Swaps

Implemented:

- Main lift swaps are blocked.
- Variation and accessory swaps preserve planned movement and performed movement separately.
- Session-only swaps.
- Phase-slot persistence for curated programme-level replacements.
- Swap reason enum: equipment missing, crowded gym, preference, fatigue, other.
- Conservative replacement logic based on curated rules first, with accessory fallbacks where appropriate.

Default behavior should stay session-only unless the user explicitly chooses phase-slot persistence.

### In-Session Accessory Adds

Implemented:

- Add accessory modal inside live sessions.
- Movement search and category filtering.
- Rep target configuration.
- Progression method selection:
  - history only
  - double progression
- Session-only scope.
- Phase-slot scope for future occurrences of the current phase slot.
- Programme customization summary updates when an accessory is persisted beyond the current session.

This feature now satisfies the first major workstream from `research/my-custom-workout.md`.

### Finish Flow And Progression

Implemented:

- Finish-session mutation.
- Completed session summary route.
- Progression decision creation from completed set logs.
- Pending, accepted, dismissed, and later-style decision handling.
- Training-max band recommendations.
- Plus-set wave recommendations.
- Simple linear completion recommendations.
- Accessory double progression recommendations when the accessory is configured for it.
- Logger-only and history-only modes that avoid automatic recommendations.

Product rule:

- The app may recommend anchor or load changes, but it must not silently mutate the user's programme state without an auditable decision.

### Program Page

Implemented:

- Current position summary.
- Next session preview.
- Timeline.
- Load/state overview.
- Pending and accepted progression decision context.
- Recent programme sessions.
- Accessory plan summary.
- Body-load summary input from real logged history.
- Customization status display.

The Program page should answer where the user is, what is next, and what has recently changed.

### History Page

Implemented:

- Recent sessions.
- Completed session summaries.
- Dashboard overview stats.
- Completed volume.
- Logged set count.
- Unique movement count.
- Latest training date.
- Best sets.
- Movement summaries.
- Weekly volume buckets.
- Substitution summaries.
- Body-load analytics from completed session data.
- Movement history lookup.

History must continue using only real completed sessions and set logs. Sparse or missing data should produce honest empty states rather than fake trends.

### PWA And Deployment

Implemented:

- PWA registration and app icons.
- Offline-ready and update prompt events.
- Railway deployment docs.
- Build/start scripts for Nitro output.
- Supabase migration scripts for local and remote workflows.

Current deployment assumptions:

- Run `pnpm build` before deployment.
- Run migrations through the Supabase CLI.
- Keep `APP_ORIGIN` aligned with the deployed domain.
- Configure the Supabase callback URL for `/auth/callback`.

## 5. Data Model Summary

The current model centers on these persisted concepts:

- profiles
- movements
- movement replacement rules
- program templates
- program template versions
- program instances
- program state values
- program movement overrides
- program accessory additions
- workout sessions
- exercise logs
- set logs
- substitution logs
- progression decisions

Important invariants:

- User-owned rows are scoped by `user_id`.
- Seeded movements and system templates are not user-editable.
- User custom templates are owned by the creator.
- Started sessions store `prescription_snapshot`.
- Exercise logs store both planned and performed movement.
- Set logs store target and actual values separately.
- Progression decisions are stored separately from logs and programme definitions.

## 6. ChatGPT And OpenAI App Direction

The OpenAI Apps SDK submission material was useful as a distribution and product-quality constraint, but it should not pull the core MVP into an AI-first design.

Current stance:

- Sheetless is a standalone web app first.
- There is no shipped ChatGPT app, MCP server, or public OpenAI app submission package in this repo.
- A future ChatGPT/App SDK surface should be a thin companion over the existing structured data, not a replacement training engine.

Future ChatGPT companion tools, if built, should be narrow and auditable:

- read today's planned session
- read recent history summaries
- explain pending progression decisions
- create a draft note or draft plan change for review
- never directly finish sessions, accept progression, replace movements, or mutate programme state without explicit user confirmation

Submission-readiness considerations for a future public app:

- Host any MCP server on a public production domain, not a local endpoint.
- Define a strict content security policy for fetched domains.
- Keep authentication and requested permissions transparent and minimal.
- Provide a fully featured demo account with sample data for review if authentication is required.
- Make tool names, descriptions, inputs, and side effects predictable.
- Avoid hidden writes, hidden data export, and retry-unsafe behavior.
- Do not frame training output as medical, injury, or clinical guidance.

## 7. Explicit Non-Goals

These remain out of scope for the current MVP:

- AI-generated workouts or autonomous substitutions.
- Readiness automation.
- Injury or pain gating.
- Wearable integrations.
- Calendar export.
- Hevy, Strong, CSV, or spreadsheet export.
- Social feed.
- Coaching marketplace.
- Public leaderboards.
- Full visual programme builder.
- Rest timer.
- Advertising or marketplace monetization inside the app.

The data model may leave clean extension points for these modules, but the UI must not present them as usable features until they are actually implemented.

## 8. Progress Against Original MVP Plan

| Area | Current status |
| --- | --- |
| Supabase auth | Implemented with password and magic link |
| Cloud database and RLS | Implemented through Supabase migrations |
| Mobile app shell | Implemented with responsive routes and bottom navigation |
| Template library | Implemented with built-in and user-created templates |
| Programme start | Implemented with anchors/state values, preview, replacement confirmation, swaps, and accessory additions |
| Core training DSL | Implemented with Zod validation and pinned template definitions |
| MVP programme pack | Implemented as source-safe Sheetless templates |
| Today screen | Implemented with planned/active/resume/completed states |
| Previous comparable | Implemented from completed history for planned sessions |
| Live workout logging | Implemented with optimistic set updates, sync states, swaps, and accessory adds |
| Session summary | Implemented with completed work and progression recommendations |
| Progression decisions | Implemented as auditable stored recommendations |
| Program overview | Implemented with current position, timeline, next session, loads, decisions, recent sessions, and accessory plan |
| History | Implemented with real dashboard stats, best sets, movement summaries, volume, substitutions, and body-load inputs |
| Custom programme builder | Implemented with constrained methodologies and logger-only mode |
| Local resilience | Partially implemented: optimistic UI and Dexie groundwork exist, but full offline replay is not complete |
| Rest timer | Removed/deferred from MVP surface |
| AI/readiness/injury/export modules | Not implemented and intentionally out of scope |
| ChatGPT app submission | Not implemented; future companion only |

## 9. Near-Term Product Priorities

1. Harden the live session save path.
   - Complete or remove the unused Dexie queued-mutation path.
   - If offline support is kept, implement replay, conflict handling, and tests.
   - If not kept for MVP, describe the current model as optimistic online logging with retry.

2. Keep strengthening template DSL coverage.
   - Add golden tests whenever a new template is added.
   - Avoid template-specific expansion branches.
   - Keep source-safe names and metadata consistent between seed data and UI fallbacks.

3. Improve custom programme editing after creation.
   - Start with duplicate/edit/version workflows.
   - Keep methodology constraints.
   - Preserve `None (logger only)` as a real no-regulation mode.

4. Deepen history only where data supports it.
   - Add movement detail pages or richer modals.
   - Improve sparse-data rendering.
   - Avoid fake charts or inferred trends that are not backed by completed logs.

5. Polish mobile ergonomics.
   - Validate 375px phone layouts.
   - Check sticky bottom navigation and live-session controls.
   - Continue replacing touched ad-hoc typography/color Tailwind with Mantine atoms and molecules.

6. Prepare a future ChatGPT companion only after the core app is stable.
   - Define read-only tools first.
   - Add explicit auth and privacy boundaries.
   - Keep every side effect user-confirmed.

## 10. Engineering Guardrails

- Do not migrate to Next.js or RTK Query.
- Do not edit `src/routeTree.gen.ts` manually.
- Do not make route files own product behavior.
- Do not re-export server-only modules through client barrels.
- Do not create new template-specific expanders for every programme.
- Do not hardcode official-template branding in UI copy.
- Do not silently mutate programme state from recommendations.
- Do not turn accessories into unstructured notes.
- Do not advertise offline mode until durable replay is complete.
- Do not add AI, readiness, injury, export, or social modules into the core MVP.

## 11. Validation Expectations

For changes touching the training engine, run targeted unit tests first, then broaden:

```sh
pnpm test
pnpm typecheck
pnpm lint
```

For UI changes, also verify mobile layouts manually or with Playwright where practical. Existing flaky e2e behavior should not block unrelated domain work, but new deterministic regressions should be fixed before handoff.

For schema changes:

- Add a new timestamped migration under `supabase/migrations`.
- Do not rewrite applied migrations unless explicitly requested.
- Use `pnpm db:migrate:local` for local Supabase.
- Use `pnpm db:migrate:dry-run` before remote migration when `SUPABASE_DB_URL` is configured.

## 12. Current Definition Of Done For MVP

Sheetless is MVP-complete when:

- A user can sign in, create or choose a programme, enter required values, start it, and land on Today.
- The user can complete a live session on a phone without losing logged work under normal network conditions.
- Previous comparable work appears when meaningful history exists.
- Progression recommendations are auditable and manually resolved.
- Program and History pages are useful from real data after sessions are completed.
- Custom logger-only and constrained regulated programmes are createable and startable.
- Built-in programme metadata is source-safe and consistent.
- The docs describe the actual TanStack Start, React Query, server-function, Supabase architecture.
- Lint, typecheck, and unit tests pass for the touched surface.
