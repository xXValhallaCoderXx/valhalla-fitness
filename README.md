# Sheetless

Mobile-first strength training for lifters who want structured programming without managing a
spreadsheet in the gym.

**Document authority:** this README is the sole human-facing source for the product, current release
status, architecture, training-plan DSL, development workflow, testing, and production runbook.
It was last reconciled with the repository on **2026-07-30**. Machine-specific implementation
instructions remain in `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and
`.github/instructions/`.

## Product vision

Sheetless should answer five questions without making a lifter think during a hard session:

1. What am I meant to do today?
2. What is the best prior result for this movement, preferring the same programme slot?
3. What load, reps, and RIR did I actually perform?
4. What does that imply for the next progression decision?
5. Where am I in the current programme?

The product is a deterministic training system first and an intelligent assistant second.
Programmes are structured data; progression recommendations are explainable and manually accepted;
started sessions retain immutable prescription snapshots; and planned work remains distinct from
performed work.

### Product principles

- Live logging must be fast enough for one-handed use between sets.
- Programmes, movements, prescriptions, performed sets, and future recommendations are separate
  concepts.
- Accessories are first-class training data, not notes.
- Previous comparable performance is a core cue.
- Progression is deterministic, auditable, and never silently applied.
- User-owned data is protected by Supabase row-level security.
- Built-in programme labels are source-safe and product-owned. Public training concepts may inform
  generic primitives, but Sheetless does not imply affiliation with a coach or paid programme.
- The UI must be honest that beta workout saving is online-only and expose transient save failures.

## Current release state

The core workout loop is implemented end to end. The application can authenticate a user, start a
built-in or custom programme, choose an equipment mode, plan Today, log a session, add or swap
movements, finish the workout, review progression, and inspect programme/history data.

The remaining beta work is concentrated in production configuration and live verification,
legal/operator review, exercise instructions/media, and a few logging-quality gaps.

### Capability matrix

| Area | Status | Current behavior and remaining work |
| --- | --- | --- |
| Authentication | **Shipped; production setup pending** | Magic Link and Google OAuth are the production methods. Password auth remains for local development and E2E only. Google, Resend SMTP, callback URLs, and live delivery still require dashboard verification. |
| Programme catalogue | **Shipped** | Fourteen concrete built-ins are grouped into six presentation families: Beginner Linear Strength, Intermediate Strength, Powerbuilding, Training Max Wave, Classic Volume Strength, and Bodybuilding Splits. |
| Custom programmes | **Shipped** | Users can create constrained programmes from supported methodologies, including logger-only mode. Definitions are validated before storage. |
| Programme start | **Shipped** | Units, rounding, required state values, allowed movement replacements, accessory additions, equipment mode, preview, and active-program replacement are supported. |
| Equipment modes | **Shipped** | Programmes can use All equipment or Free weights only. The free-weight overlay is previewed before confirmation, reversible before a workout starts, pinned to an immutable policy, enforced for live additions/swaps, and frozen into session history. Ad-hoc workouts and favourites remain equipment-neutral. |
| Today | **Shipped** | Planned, active/resume, completed, onboarding, and pending-progression states are supported. |
| Live workout logging | **Shipped** | Optimistic load, reps, RIR, completion, sync state, notes in the model, focus/overview layouts, swaps, and accessory additions are supported. The live UI does not currently expose RPE entry. |
| Previous comparable | **Partial** | Prior results match the movement actually performed, prefer the same programme slot/template, and retain per-set history. The chronological movement-history view remains literal. The planned tap-to-fill interaction is not implemented. |
| Rest timer | **Partial** | Auto-start on genuine set completion, role-based defaults, global opt-out, wall-clock correction, `+15`, skip, audio, and vibration are implemented. Reload persistence, per-movement defaults, `-15`, wake lock, and notifications are not. |
| Plate calculator | **Shipped** | Kg/lb plate loading is available from both live-session layouts. Saved bar/plate inventory and equipment gating are not implemented. |
| Session PRs | **Partial** | Heaviest-load, estimated-1RM, and rep-at-weight PRs are calculated at finish and shown in the summary. There is no live inline celebration or separate lifetime `personal_records` table. |
| Progression | **Shipped** | Recommendations are calculated from completed work, stored as decisions, and require explicit accept/later/dismiss handling. |
| Ad-hoc sessions and favourites | **Shipped** | Users can start unprogrammed workouts, repeat prior sessions, and save/reuse favourites while retaining comparable history. |
| Programme and Insights views | **Shipped** | Programme position, timeline, loads, decisions, recent sessions, e1RM, DOTS/bodyweight-multiple fallbacks, trends, consistency, calibration, muscle-set estimates, records, and history are data-backed. |
| Body profile | **Partial** | Bodyweight history and sex can be stored from Insights/Settings. Units, sex, and bodyweight are not yet collected in first-run onboarding, and Overview has no dedicated bodyweight trend chart. |
| Exercise catalogue | **Shipped; media deferred** | The catalogue stores 151 movements (140 active and 11 resolvable deprecated aliases) with resistance mode, required equipment, pattern, primary/secondary muscles, aliases, load convention, and replacement lineage. Instructions, external IDs, and media are not yet included. |
| Feedback | **Shipped** | Global and post-workout feedback forms write to `feedback_events`; `pnpm feedback:report` reads submissions. An owner and review cadence must be assigned. |
| PWA | **Shipped; production verification pending** | Manifest/service-worker build checks exist. Install, update, auth persistence, and HTTPS behavior must be verified on the live canonical host. |
| Workout saving | **Online-only for beta** | Set changes update optimistically in memory, save directly to Supabase, and show saving or failed states. Failed sets must be retried before finishing. There is no durable local queue or offline navigation. PWA installation and updates do not imply offline workout support. |
| Privacy, deletion, and export | **Shipped; production review pending** | Public Privacy and Terms routes, paginated machine-readable account export, and confirmed self-service account deletion are available. Production must apply the deletion RPC migration, verify the privacy inbox, and complete operator/legal review. |

### Beta work order

#### P0 — release gates

1. Complete the production dashboard and live verification checklist in this README.
2. Apply and audit the release-integrity, lifecycle, and account-deletion migrations before serving
   this build.
3. Review Privacy and Terms against the production operator, jurisdiction, processors, retention
   schedule, and working contact inbox.
4. Keep every save-status surface explicit that beta is online-only while preserving transient
   saving, failed, and retry states.

#### P1 — beta quality

1. Persist the rest timer across reloads and add per-movement defaults and `-15`.
2. Make exact previous-set values tappable to fill the current set.
3. Capture units, sex, and bodyweight in onboarding.
4. Add the bodyweight trend to Overview.
5. Decide whether finish-time PR summaries are sufficient or whether live PR feedback is required.

#### Deferred

- Exercise instructions/media and future catalogue expansion.
- Warm-up generation and user-editable set types.
- Supersets/circuits and body measurements beyond bodyweight.
- Persisted Find My Plan answers.
- Wearables, Health integrations, social features, public leaderboards, and coaching marketplace.
- AI-generated workouts, autonomous substitutions, readiness automation, and injury/pain gating.

### Recorded release posture

Sheetless targets a **public self-serve beta**. Self-service deletion, machine-readable export, and
public Privacy and Terms surfaces are part of that release posture and are implemented. They remain
deployment-gated until the database migrations are applied and the operator has verified the legal
copy, contact inbox, provider agreements, and actual retention practice.

## Product surface

### Navigation and routes

The primary mobile navigation is **Today**, **Plan**, **Insights**, and **Programs**. Settings and
account actions live in the user menu.

| Route | Purpose |
| --- | --- |
| `/` | Marketing page for signed-out visitors; signed-in users redirect to Today. |
| `/auth`, `/auth/callback` | Magic Link, Google OAuth, local password flow, and PKCE callback. |
| `/today` | Planned workout, active-session resume, onboarding, and progression context. |
| `/program` | Active programme overview, timeline, loads, decisions, and recent work. |
| `/history` | Insights dashboard, strength trends, records, movements, and sessions. |
| `/templates` | Programme-family catalogue and custom-programme entry point. |
| `/templates/:templateId/start` | Programme setup, customization, preview, and start. |
| `/sessions/:sessionId` | Live workout overview/focus logging. `?tour=live` forces walkthrough replay. |
| `/sessions/:sessionId/summary` | Completed work, reflection, PRs, and progression decisions. |
| `/settings` | Units, appearance, timer preferences, body profile, account, and walkthrough replay. |
| `/privacy`, `/terms` | Public privacy notice and terms for the beta. |

### Onboarding

- Today onboarding is controlled by `profiles.onboarding_completed` and completed-session history.
- Live-session onboarding is separate and controlled by `profiles.live_onboarding_dismissed`.
- The live walkthrough is optional. It starts from the live-session onboarding card or via
  `/sessions/:sessionId?tour=live`; it must never block normal logging.

## Architecture

### Stack

- **Runtime:** TanStack Start, Vite, React 19, TypeScript
- **Routing:** TanStack Router file routes
- **Server boundary:** TanStack `createServerFn`
- **Remote data/cache:** TanStack React Query
- **Authentication/database:** Supabase Auth and Postgres with RLS
- **UI:** Mantine and app theme tokens; Tailwind v4 for layout only
- **Validation:** Zod
- **Tests:** Vitest and Playwright
- **Deployment:** Nitro Node output on Railway

### Repository layout

Code is organized by product domain:

```text
src/
  routes/                  thin TanStack file-route adapters
  domains/
    account/
    program/
    session/
    history/
    movement/
    onboarding/
  shared/
    lib/
    server/
    types/
  components/
    atoms/
    molecules/
  styles/
tests/                      Vitest unit/domain tests
tests/e2e/                  Playwright browser flows
supabase/migrations/        append-only schema migrations
scripts/                    demo, verification, reporting, and export utilities
```

Routes extract URL/context data and render a domain component. Domain folders own their UI, server
functions, query options, types, and pure logic. Cross-domain helpers move to `src/shared/*` only
when genuinely reused.

### Runtime data boundaries

```text
route loader/component
  -> domain queryOptions / mutation
  -> createServerFn
  -> user-scoped Supabase client
  -> Postgres + RLS
```

Important invariants:

- Server functions use the authenticated user and RLS; the web runtime never uses a service-role
  key.
- Authenticated React Query keys include the current account subject. Account transitions cancel
  and remove the complete account cache root before another subject can use it.
- Programme/template creation, programme start/advancement, workout start/finish/favouriting,
  progression resolution, and every in-session mutation use guarded transactional database RPCs.
  Authenticated application clients retain RLS-scoped reads but cannot write lifecycle tables
  directly.
- At most one active programme and one in-progress workout may exist per user.
- Started programmes pin an immutable template-version ID and checksum-protected definition.
- Free-weight programmes pin an immutable conversion-policy version and a normalized, hashed set of
  choices keyed by template session, slot, phase, and role.
- Started sessions persist a prescription snapshot so later programme edits do not rewrite history.
- Programme equipment mode is copied into that snapshot. A durable database boundary rejects any
  machine/cable target added to a free-weight workout, including direct live-add and swap RPC use.
- Planned and performed movement IDs remain separate through substitutions.
- In-session writes use stable request IDs plus an expected workout revision. Durable mutation
  receipts make exact retries safe, while stale revisions and token reuse with a different payload
  fail closed. Set writes also validate the full session/exercise/set ownership chain.
- Same-owner composite foreign keys prevent cross-account relationships even if an application
  handler regresses.
- Discard fails closed when a programmed session cannot prove that its programme changes can be
  restored safely.
- Only completed work contributes to progression, PRs, and historical training signals.
- Recommendations do not mutate programme state until the user accepts them.
- `scheduled_date` is the workout calendar date used for display, ordering, trends, streaks, and
  analytics. `completed_at` remains a lifecycle instant for duration, audit, same-day tie-breaking,
  and a secondary completion label.
- Calendar-day calculations use the account timezone rather than the server's timezone. New
  prescription snapshots retain that timezone so overnight completion labels stay stable.
- Workout saving is intentionally online-only; there is no second durable local database or replay
  queue.

### Performance and architecture gates

- Marketing and Insights route bodies are lazy chunks; chart code must not preload on `/`, `/auth`,
  or `/today`.
- The production gate caps the root entry at 600 KiB raw/180 KiB gzip, `/auth` and `/today` initial
  JavaScript at 300 KiB gzip, isolated chart code at 140 KiB gzip, and global CSS at 50 KiB gzip.
- The service worker precaches only the revisioned application bootstrap; route chunks are cached
  after an online request. This preserves install/update behavior without presenting the app as an
  offline workout logger.
- Route adapters are capped at 40 lines, new domain components at 300 lines, server-only imports are
  excluded from client barrels, and new shared-to-domain dependencies fail CI.
- Account, movement, onboarding, programme, session, and history types live behind domain-owned
  public barrels. Shared types are restricted to generated database types and the small set of
  genuinely cross-domain training primitives.

## Training-plan DSL

The current schema version is **`2026.06.dsl`**.

### Sources and loading order

- Catalogue metadata for built-ins lives in
  `src/domains/program/lib/templates.ts`.
- Built-in definitions live in
  `src/domains/program/lib/template-definitions.ts` and
  `src/domains/program/lib/template-definitions-5day.ts`.
- Family/variant presentation metadata lives in
  `src/domains/program/lib/template-families.ts`.
- Zod parsing and cross-field validation live in
  `src/domains/program/lib/template-engine-schema.ts`.
- Pure expansion, timeline, load, and state logic lives in
  `src/domains/program/lib/template-engine.ts`.
- Hosted runtime loads and validates the latest `program_template_versions` row. Missing or invalid
  hosted definitions fail closed; code definitions never mask hosted database corruption.
- Programme instances pin the chosen database version. Session expansion reloads and validates that
  exact immutable version and fails closed if it is unavailable or invalid.
- User-created programmes are validated and stored as their own template/version rows.
- Without Supabase, isolated local/test paths use the built-in code catalogue and definitions.

`pnpm export:templates` exports the built-in code catalogue/definitions to the ignored
`.artifacts/template-definitions.json` file for inspection. The export is generated, not a second
editable source or document.

### Movement catalogue and equipment-mode overlay

Movement taxonomy lives in `src/domains/movement/lib/movements.ts`. Discovery and programme
builders expose only active movements; deprecated IDs remain resolvable so immutable template and
session history never breaks. The stored catalogue contains 151 movements: 140 active entries and
11 deprecated aliases with explicit replacements.

Equipment mode is programme state rather than a second DSL schema:

1. A template slot resolves its phase-specific movement.
2. An allowed manual programme override resolves next.
3. In `free_weight` mode, an ineligible source resolves through the programme's pinned policy and
   its saved choice for that exact template-session/slot/phase/role identity.
4. Barbell, dumbbell, specialty-bar, and bodyweight movements are eligible. Cable and selectorized
   or plate-loaded machine resistance is not. Fixed supports such as a rack, bench, pull-up bar,
   dip bars, sliders, or a bodyweight support station remain allowed.
5. An automatic equipment-mode replacement records provenance in the session snapshot and clears
   target/actual load values; rep, RIR/RPE, set-role, and progression metadata remain intact.

Users review every affected future phase before starting or converting a programme. Turning the
mode off restores the DSL plus manual customizations; completed sessions remain literal historical
snapshots. Mode changes are blocked while any workout is in progress. Live programme swaps and
accessory additions are filtered and server-enforced against the snapshot mode.

### Mental model

```text
TemplateDefinition
├─ sessions[]          stable workout days; count equals daysPerWeek
│  └─ slots[]          stable exercise positions pointing to prescriptionId
└─ weeks[]             prescriptions for each training week
   └─ prescriptions{}  prescriptionId -> targets and sets for that week
```

Slots stay stable while weekly prescriptions change. A base, peak, wave, or deload is represented by
resolving the same slot to different set/load targets in a later week.

`movementId` may be a string or a phase map. `anchorMovementId` lets a variation calculate a
percentage from another lift's stored state.

### Field reference

#### `TemplateDefinition`

- `schemaVersion`: currently `2026.06.dsl`
- `id`, `name`, `timelineDescription`
- `durationWeeks`, `daysPerWeek`
- `requiredState[]`
- `sessions[]`
- `weeks[]`
- optional `progressionRules`
- optional `progressionConfig.simple_linear_completion.increments`

#### Session slots

- `id`
- `role`: `main | variation | accessory | warmup | event`
- `movementId`: string or `{ default, byPhase }`
- `prescriptionId`
- optional `anchorMovementId`
- optional `targetSummary`

#### Weeks and prescriptions

A week contains `label`, `phaseKey`, `phaseLabel`, optional `waveLabel`, optional `focus`, `summary`,
`hardness`, and a prescription record.

`hardness` is `Light | Medium | Hard | Deload`.

Each prescription contains:

- `targetSummary`
- optional `progressionRuleId`
- one or more sets

Each set may contain:

- `targetLoad`
- `targetReps` or `targetRepMin`/`targetRepMax`
- nullable `targetRir` or `targetRpe`
- `isTopSet`, `isAmrap`, `isBackoff`
- `label`

#### Load kinds

| Kind | Meaning |
| --- | --- |
| `state` | Use a stored programme-state value directly. |
| `percent_of_state` | Calculate and round a percentage of a stored state/anchor. |
| `fixed` | Use a literal kg value and optional lb equivalent. |
| `user_selected` | Leave load selection to the lifter. |

State types are `training_max`, `one_rep_max`, `working_load`, `five_rep_max`, and `manual`.

### Schema invariants

`templateDefinitionSchema` rejects definitions unless:

1. `sessions.length === daysPerWeek`.
2. `weeks.length === durationWeeks`.
3. Every `requiredState.key` is unique.
4. Every session slot's `prescriptionId` exists in every week.
5. Every programme-state key referenced by a load is declared in `requiredState`.

When adding a built-in:

1. Add and validate the built-in `TemplateDefinition`.
2. Add matching catalogue metadata.
3. Add family/variant metadata where appropriate.
4. Add golden definition and progression tests.
5. Run `pnpm export:templates` if the generated inspection artifact is needed.
6. Seed a new immutable template-version row for hosted use.

## Local development

### Prerequisites

- Node.js 22 (pinned by `engines` and `.node-version`)
- pnpm through Corepack
- Supabase CLI and Docker for the local database
- A Chromium-based browser for Playwright

### Setup

```sh
corepack enable
pnpm install
cp .env.example .env
pnpm exec supabase start
pnpm db:migrate:local
pnpm demo:seed
pnpm dev
```

The local Supabase project ID is `sheetless`. If the CLI reports a different project on the local
ports, stop that stack before starting this one.

Demo users are local-only. The primary browser-test account is
`demo.linear@sheetless.local` / `DemoPass123!`; `demo.wave` and `demo.power` variants are also seeded.
Never seed demo users against production.

### Environment variables

| Variable | Use |
| --- | --- |
| `SUPABASE_URL` | Local or hosted Supabase API URL. |
| `SUPABASE_ANON_KEY` | Public Supabase client key. |
| `APP_ORIGIN` | Exact public/local origin used for callbacks. |
| `AUTH_PASSWORD_ENABLED` | Local/E2E password flow. Explicitly `false` in production if set. |
| `AUTH_ALLOWLIST_ENABLED` | Magic-Link allowlist gate. Production defaults fail closed; the open beta must explicitly set `false`. |
| `SUPABASE_DB_URL` | Migration-only transaction-pooler URI. |
| `SUPABASE_SERVICE_ROLE_KEY` | Trusted local admin scripts only; never configure on the web service. |

Use `.env.example` for placeholders. Never commit real credentials.

### Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local Vite/TanStack server. |
| `pnpm build` | Build production output and run TypeScript checks. |
| `pnpm start` | Run `.output/server/index.mjs`. |
| `pnpm typecheck` | Run TypeScript without building. |
| `pnpm lint` | Run ESLint. |
| `pnpm test` / `pnpm test:watch` | Run Vitest once/in watch mode. |
| `pnpm e2e` or `pnpm playwright` | Run Playwright. |
| `pnpm e2e:headed` / `pnpm e2e:ui` | Run visible/interactive Playwright. |
| `pnpm e2e:auth` | Refresh the saved E2E auth state. |
| `pnpm shot [route]` | Capture a route as the demo user. |
| `pnpm pwa:verify` | Verify built PWA artifacts. |
| `pnpm bundle:check` | Enforce production entry-chunk and PWA-precache budgets. |
| `pnpm architecture:check` | Enforce thin routes, domain boundaries, and component-size gates. |
| `pnpm docs:check` | Enforce this README as the only human-facing document. |
| `pnpm db:contract:check` | Statically verify lifecycle/integrity migrations and server call sites. |
| `pnpm db:migrate:local` | Apply migrations to local Supabase. |
| `pnpm db:migrate:dry-run` | Preview hosted migrations using `SUPABASE_DB_URL`. |
| `pnpm db:migrate` | Apply hosted migrations using `SUPABASE_DB_URL`. |
| `pnpm db:audit` | Run read-only preflight checks for legacy integrity violations on the target database. |
| `pnpm db:test` | Run pgTAP database contract tests against local Supabase. |
| `pnpm demo:{seed|reset|refresh|verify|list}` | Manage local demo data. |
| `pnpm feedback:report` | Read beta feedback events. |
| `pnpm export:templates` | Validate/export built-in template definitions. |
| `pnpm verify` | Run the complete static, unit, build, PWA, bundle, architecture, docs, and database-contract suite. |

## Testing and validation

### Definition of done

For meaningful changes, use the narrowest relevant checks first, then broaden:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm pwa:verify
pnpm bundle:check
pnpm architecture:check
pnpm docs:check
pnpm db:contract:check
```

For UI behavior, also run the relevant Playwright project/spec and inspect the real rendered result.
Pure logic changes should add or update Vitest coverage. Training-engine, session-cache,
progression, history-signal, and server-API changes require behavior-focused tests.

Database migrations also require a local Supabase stack:

```sh
pnpm db:migrate:local
pnpm db:test
```

### Playwright prerequisites

1. Start the local Supabase project.
2. Apply migrations and run `pnpm demo:seed`.
3. Start `pnpm dev`, or let the Playwright configuration start/reuse it.
4. Ensure a Chromium browser is available. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when an explicit
   binary is required.

Examples:

```sh
pnpm e2e
pnpm e2e --project=desktop-chrome
pnpm e2e --project=mobile-chrome
pnpm e2e tests/e2e/login.spec.ts
pnpm e2e --headed
pnpm e2e --ui
pnpm shot /program
pnpm shot /history insights.png
```

`tests/e2e/auth.setup.ts` signs in once and stores ignored browser state at
`tests/e2e/.auth/user.json`. Desktop and mobile projects depend on that setup; logged-out specs
explicitly clear storage state.

Because the app is server-rendered, an action taken before React hydration may silently no-op. Retry
the interaction until the expected result appears:

```ts
await expect(async () => {
  await thing.click()
  await expect(target).toBeVisible({ timeout: 1000 })
}).toPass({ timeout: 15000 })
```

Stateful profile flags must be reset in `beforeEach` when a flow depends on them.
`live-coach-marks.spec.ts`, for example, resets `live_onboarding_dismissed` before checking the
onboarding card, dismissal, and forced replay.

## Production deployment and release runbook

### Locked deployment posture

- One hosted production environment: one Railway service and the existing hosted Supabase project.
- Railway production is promoted from a green `main` commit only after the protected production
  database workflow succeeds. Automatic deploy-on-push must remain disabled.
- Production user auth is Magic Link plus Google OAuth.
- Email/password is disabled for production users and retained for local/E2E.
- Resend supplies Supabase custom SMTP.
- Open Magic Link sign-up requires `AUTH_ALLOWLIST_ENABLED=false` explicitly.
- Access-token lifetime remains short; refresh-cookie rotation maintains trusted-device sessions.
- Canonical host: **`https://www.sheetless.fitness`**.
- Apex `sheetless.fitness` and the raw Railway host must redirect permanently to `www` so PKCE begins
  and ends on the same host.

### Railway commands

Build:

```sh
pnpm build
```

Start:

```sh
pnpm start
```

Run the protected **Release database** GitHub Actions workflow against `main` before promoting the
same commit to Railway. The workflow verifies the exact commit, then runs:

```sh
pnpm db:audit
pnpm db:migrate:dry-run
pnpm db:migrate
```

The audit is read-only and must pass against the target database before the integrity constraints are
applied. Migration credentials live only in the protected `production-database` GitHub environment;
the web service never receives them. Do not make migrations part of every runtime start. Restarts or
replicas can race, and a failed migration must stop the release before new code serves.
The audit also blocks on a programmed workout that began before discard journaling existed. Finish
that workout before migrating; the release deliberately refuses a lossy discard whose programme
changes cannot be reconstructed.
After that workflow succeeds, promote its exact commit SHA to Railway. Require the three CI jobs and
the database release job before promotion; do not deploy a newer unverified `main` head.

The application sends a restrictive Content Security Policy, denies framing and sensitive browser
capabilities, prevents MIME sniffing, keeps HTML private/no-store, and serves hashed assets as
immutable. Enable HSTS only after the apex and raw Railway hosts reliably redirect to the canonical
HTTPS host; enabling it before that DNS/redirect gate can make recovery harder.

### Required Railway values

```sh
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
APP_ORIGIN=https://www.sheetless.fitness
NODE_ENV=production
AUTH_PASSWORD_ENABLED=false
AUTH_ALLOWLIST_ENABLED=false
```

Do not configure `SUPABASE_DB_URL` or `SUPABASE_SERVICE_ROLE_KEY` on Railway.

Configure `SUPABASE_DB_URL` separately as a secret in a protected GitHub environment named
`production-database`. Use Supabase's IPv4 transaction-pooler URI and percent-encode special
characters in the password. Require manual approval for that environment.

If Railway selects an incompatible Node version despite the repository pin, set
`NIXPACKS_NODE_VERSION=22`.

### External setup checklist

#### Google Cloud

- [ ] Configure an external OAuth consent screen with app name, support email, logo, email, and
      profile scopes.
- [ ] Create a Web OAuth client.
- [ ] Set authorized JavaScript origin to `https://www.sheetless.fitness`.
- [ ] Set authorized redirect URI to
      `https://<project-ref>.supabase.co/auth/v1/callback` — this is Supabase's callback, not the
      application's `/auth/callback`.
- [ ] Copy the client ID and secret into the Supabase Google provider.

#### Supabase

- [ ] Confirm the existing hosted project is production; do not create a second project.
- [ ] Capture the project URL, anon key, service-role key for trusted local admin use, and transaction
      pooler URI.
- [ ] Run `pnpm db:audit`, then `pnpm db:migrate:dry-run`; inspect both before `pnpm db:migrate`.
- [ ] Enable new-user signup for the Email provider.
- [ ] Enable Google and configure its client ID/secret.
- [ ] Configure Site URL `https://www.sheetless.fitness`.
- [ ] Add redirect URLs:
      `https://www.sheetless.fitness/auth/callback` and
      `http://localhost:3000/auth/callback`.
- [ ] Leave inactivity timeout, time-boxing, and single-session enforcement disabled for the current
      persistent-session posture.
- [ ] Review email/sign-up rate limits.
- [ ] Confirm production contains no demo/seed users.
- [ ] Confirm backup and retention behavior for the hosted plan.

#### Resend

- [ ] Verify the `sheetless.fitness` sending domain and its SPF, DKIM, and DMARC records.
- [ ] Create an API key.
- [ ] Configure Supabase SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = API key,
      and a sender such as `login@sheetless.fitness`.
- [ ] Test a real Magic Link in Gmail and Outlook and confirm inbox—not-spam delivery.

#### Railway and DNS

- [ ] Disable automatic production deploys on push; promote only the exact verified `main` SHA.
- [ ] Configure the required values above.
- [ ] Confirm no database, service-role, or demo credentials are present on the web service.
- [ ] Require all three CI jobs and run the protected **Release database** workflow before promotion.
- [ ] Attach `www.sheetless.fitness` with TLS.
- [ ] Redirect apex and raw Railway hosts to the canonical `www` host.

### Code and live verification

- [x] Record the public-beta account deletion/export posture in this README.
- [x] Publish Privacy and Terms routes/content.
- [ ] Confirm `privacy@sheetless.fitness` works and legal/operator review is complete.
- [ ] Verify account export and destructive deletion end to end against a disposable hosted user.
- [ ] `pnpm verify`, local migration application, and `pnpm db:test` are green on `main`.
- [ ] `pnpm pwa:verify` passes against the production build.
- [ ] A new Google user completes consent and lands authenticated on `/today`.
- [ ] A new Magic Link user receives email, creates an account, and lands on `/today`.
- [ ] No password UI is visible in production.
- [ ] An installed PWA remains signed in across full close/reopen.
- [ ] A session remains authenticated beyond the one-hour access-token lifetime through silent
      refresh, and explicit logout revokes the local session.
- [ ] A fresh user can complete onboarding, start a programme, log/finish a workout, and resolve
      progression without server errors.
- [ ] Exercise metadata meets the chosen beta scope.
- [ ] The save-status UI accurately represents the online-only beta behavior.
- [ ] Feedback reporting has an owner and review cadence.
- [ ] Railway and Supabase log locations are documented for the operator.
- [ ] Rollback procedure and latest known-good deployment are identified.

### Post-launch operation

- Review feedback submissions on an assigned cadence.
- Watch Supabase Auth users, rate limits, and Resend volume for abuse.
- Monitor Railway and Supabase errors.
- Confirm backups/retention and periodically test recovery assumptions.
- Keep the invite-only fallback ready.

To re-gate Magic Link:

1. Set `AUTH_ALLOWLIST_ENABLED=true` on Railway.
2. Disable new-user signup in Supabase.
3. Provision allowed users from a trusted local shell with the service-role key:

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed add someone@example.com "note"
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed list
```

### Local production check

```sh
pnpm build
pnpm start
```

Nitro reads Railway's `PORT` value at runtime.

## Known beta limitations

- A network connection is required to open and use workout routes; the installed PWA is not an
  offline workout logger.
- Optimistic changes exist only in memory until Supabase confirms them. Failed set saves stay
  visibly flagged for retry, and reloading can discard an unconfirmed edit.
- Rest-timer state does not survive reload and is not a true locked-screen timer.
- Previous-set ghosts do not yet fill the current set on tap.
- PR feedback occurs at workout finish, not immediately after the set.
- Exercise instructions, muscle metadata, and media are absent.
- Bodyweight and sex are collected after onboarding rather than during initial setup.
- Privacy, Terms, deletion, and export require hosted migration verification and production
  legal/operator review before opening sign-up.

## Documentation maintenance

- Update this README in the same change whenever product state, release policy, architecture,
  deployment procedure, testing workflow, or the DSL contract changes.
- Keep machine rules in `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and
  `.github/instructions/`; do not create another human-facing plan/spec/checklist.
- Completed implementation plans belong in Git history, not as active root documents.
- Link to code symbols instead of copying long implementation detail when this README would
  otherwise become a second source of truth.
