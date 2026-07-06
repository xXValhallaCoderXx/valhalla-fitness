# Sheetless — Final Release Plan (Beta)

Sheetless is closer to beta than a raw feature count suggests: the hard, differentiated work — DB-backed movements with a hardcoded fallback, deterministic auditable progression, a full DOTS/e1RM insights overhaul, RIR capture, previous-comparable, and a PWA/Dexie substrate — is already shipped and validated. The gap is not the analytics ceiling (we lead Strong/Jefit there and DOTS out-positions all four competitors); it is the **in-session logging floor**. The single most conspicuous, founder-flagged omission — a rest timer — is completely absent (its dormant `profiles.auto_start_timer` column, unread since `202606210001_initial_schema.sql`, proves it was scoped-then-cut), and re-adding it plus a plate calculator and richer exercise data is what stands between "credible logger" and "feels half-built next to Hevy." Realistically beta is **4–6 focused workstreams away**, gated as much by an entirely-unchecked ops checklist (Resend email end-to-end, prod migration, feedback channel, data-deletion) as by code.

**Posture:** analytics-ahead, logging-behind, ops-unstarted. Ship the logging floor and the ops checklist; everything else is polish or post-beta.

## Where we already stand

Shipped and validated — do **not** re-plan these:

- **DOTS / insights overhaul** — per-lift e1RM `LineChart`s, stall/velocity/trend classification, a **DOTS-over-time chart already on the Strength tab**, a signal-driven Overview dashboard, honest empty states. We lead all four competitors here.
- **DB-backed movement catalog with fallback** — `movements` Supabase table read via `movement-functions.ts`, falling back to the hardcoded `movementCatalog` (~72 curated strength lifts). Movement ids are load-bearing FKs across `exercise_logs`/`program_anchors`.
- **Bodyweight + sex substrate** — `bodyweight_entries` (canonical kg, one row/day), nullable `profiles.sex`, and `logBodyweightFn`/`updateSexFn` server functions all exist. `TotalPoint` already carries date-paired `dots`/`bwMultiple`/`bodyweightKg`.
- **Custom program builder**, ad-hoc sessions, favourites, deterministic manually-accepted progression, a `Deload` hardness tag.
- **Full per-set RIR capture** with carry-over; per-set notes modeled (`SetLog.note`).
- **PWA/offline substrate** — Dexie + Workbox present; optimistic online logging with retry works, and `local-db.ts` already has a `queuedMutations` store + `queueSetPatch()`. The durable **replay/flush** is not wired — spec forbids advertising offline sync until it is.
- **`feedback_events` table** exists (no form surfaced yet).

## Competitor feature matrix

| Feature | Sheetless | Hevy | Fitbod | Alpha / Strong | Verdict |
|---|---|---|---|---|---|
| In-workout rest timer | **Missing** — dormant `auto_start_timer` never read | Auto-start, Live Activity | Auto-start, sound/vibrate | Auto-start, per-exercise | **Behind** |
| Plate calculator | **Missing** — 2 stub buttons | — | Built-in | Strong/Alpha built-in; Alpha next-lower | **Behind** |
| Muscle-group tagging | Partial — coarse body-region fractions siloed in `body-load.ts`, none on `Movement` | Primary+secondary, heat map | Recovery heat map | Strong heat map / Jefit BodyMap | **Behind** |
| Exercise instructions | **Missing** — no instruction column | — | Cues | Alpha/Jefit cues | **Behind** |
| Exercise media | **Missing** — no media column | — | HD video | Alpha ~600 videos, Jefit ~1,300 images | **Behind** |
| Library breadth | Partial — ~72 strength/powerlifting | 400+ | 1,000+ | Strong 450+, Alpha ~600, Jefit ~1,300 | **Behind** |
| Previous-set reference | Partial — movement-level "Last time" | Per-set inline + autofill | Per-set inline | Per-set inline + autofill | **Behind** |
| PR detection + celebration | **Missing** — trophy = top-set count | Live PR banner (7 types) | PR tracking | Strong PR tracking | **Behind** |
| Warm-up / set-type marking | **Missing** — enum exists, nothing emits | Auto warm-ups + tags | Auto warm-ups | Auto warm-ups + tags | **Behind** |
| Strength score / e1RM trends (DOTS) | **Have** — e1RM + DOTS-over-time, honest empties | est. 1RM only | Estimated Strength | Alpha hides 1RM; none compute DOTS | **Ahead** |
| RIR / effort capture | **Have** — full per-set RIR + carry-over | RPE | RiR | Alpha RIR-core / Strong RPE | **On-par** |
| Deterministic progression / deload | Partial — auditable, `Deload` tag, no auto-detect | none | Adaptive engine | Alpha auto set-by-set + deload | **On-par** |
| Muscle-volume / recovery analytics | Partial — Body Load fatigue + PPL balance | Sets-per-muscle | Recovery heat map | Strong/Jefit heat maps | **Behind** |
| Onboarding data intake | Partial — orientation-only; data in Settings | — | Goal→exp→equipment up front | Alpha up front | **Behind** |
| Body-composition tracking | Partial — bodyweight only, no trend chart | +bodyfat +14 girths +photos | Measurements + Health | Measurements | **Behind** |
| Supersets / circuits | **Missing** | Grouped + rest-aware | Grouped | Grouped | **Behind** |
| Offline logging | Partial — set-patch queue exists, durable replay/flush not wired | Full offline sync | Health/Watch sync | Full offline sync | **Behind** |
| Wearables / Health / import / social | **n/a — explicit spec non-goals** | Watch + Health + CSV + social | Health + Watch | Watch + Health + CSV + social | **n/a** |

## Gap analysis & priorities

| Priority | Gap | Kind | Effort | Rationale (one line) |
|---|---|---|---|---|
| **P0** | Rest timer (auto-start, global+per-movement, persistent pill, wake-lock/audio/vibrate) | feature | **L** | Most conspicuous, founder-flagged omission; dormant `auto_start_timer` is the ready hook. Needs §7/§8 spec amendment. |
| **P0** | Exercise metadata — **muscles + instructions** from free-exercise-db into our DB (text columns) | data | M | Real credibility gap for a beginner-first app; upstream blocker for muscle-volume analytics. Cheap (text). |
| **P0** | Release ops — Resend email end-to-end, prod migration, OAuth, privacy/terms, **data deletion/export** | infra | M | Entire `release-checklist.md` is unchecked; gates launch regardless of code. |
| **P1** | Exercise **images** — ~1,600 JPGs into a Supabase Storage bucket | data | L | Delight, not a launch blocker; schema is additive so it lands after muscles/instructions ship. |
| **P1** | Capture bodyweight + sex + units during onboarding | data | S | DOTS live on first insight view; no schema work — only a capture point. |
| **P1** | DOTS-over-time chart on Overview `StrengthScoreCard` | feature | S | Documented follow-up; area where we already lead. Pure UI reuse. |
| **P1** | Plate calculator wired into the two existing stub buttons | feature | S | Table-stakes; pure unit-testable fn + modal. |
| **P1** | Inline previous-set ghost values + tap-to-fill + consistent steppers | polish | M | Most-used beginner cue; data (`getPreviousComparablesBySlotId`) already exists. |
| **P1** | PR detection + tasteful in-workout celebration | feature | M | Cheap, high-delight; reuse e1RM already computed. |
| **P1** | In-product feedback channel (surface `feedback_events`) | infra | S | "Collecting feedback is the point of this launch." |
| **P1** | Seed muscle data — body-load regions + region→muscle mapping, gaps from importer | data | M | Avoids a third divergent copy of movement data; lands with library migration. |
| **P2** | Warm-up / set-type marking with correct exclusion from e1RM/DOTS/PR | feature | M | Data-integrity concern; defer generator, wire set-typing only if scope allows. |
| **P2** | Persist experience/goal/training-days from Find-my-plan wizard | data | S | Cheap extension points; low beta urgency. |
| **P2** | Bodyweight trend chart + strength-standard banding | feature | S | Low-hanging LineChart from existing daily series. |
| **P2** | Body measurements (girths/bodyfat) + supersets | feature | L | Additive scope, not credibility-defining; supersets need a larger `supersetGroupId` lift. |

**Migration numbering.** All new migrations sort *after* `202607060001` and must carry **unique** sequential versions, or the same-version rows silently skip on push (memory: `supabase-push-version-collision-gotchas`). The plan uses one continuous block in introduction order:

- `202607070001_add_rest_timer_defaults.sql` (M1)
- `202607070002_add_personal_records.sql` (M1)
- `202607070003_add_movement_metadata.sql` (M2)
- `202607070004_add_profile_intake_fields.sql` (P2)

---

## Implementation plan

## Rest Timer

### 1. Goal & scope
Ships for beta: an auto-starting, wall-clock rest timer that begins the instant a set is marked complete, renders as a persistent bottom pill (mm:ss + progress + −15/+15/Skip), survives the Overview↔Focus swap and a page reload, and cues completion with an audio beep + vibration + screen wake-lock. Two-level defaults: global (`profiles.default_rest_seconds` + the revived `profiles.auto_start_timer`) with a per-movement override, seeded from `MovementRole` (main/variation get longer rest than accessory/warmup). Applies uniformly to program, **ad-hoc, and `Deload` sessions** — seeding is by movement role, not session intensity, so null-intensity sessions still get sane defaults. **Deferred to post-beta:** true screen-locked delivery via server Web Push, and any cross-device timer sync. On a locked phone the beep/notification is best-effort only — documented, not promised.

### 2. Data model / schema changes
Migration `supabase/migrations/202607070001_add_rest_timer_defaults.sql`:
- `alter table public.profiles add column if not exists default_rest_seconds int not null default 120 check (default_rest_seconds between 0 and 900);`
- **`auto_start_timer` already exists, defaulting `true`.** Reviving it retroactively auto-starts timers for every existing account that never opted in. Intended behavior for beta: **auto-start ON by default** (matches Hevy/Fitbod/Strong/Alpha, all auto-start) and applies to existing rows — this is a deliberate call, disable-able in settings, not an accident. No reset statement; the true default is intentional and documented here.
- New table `public.movement_rest_defaults (user_id uuid references profiles(id) on delete cascade, movement_id text references movements(id), rest_seconds int not null check (rest_seconds between 0 and 900), primary key (user_id, movement_id))`. Enable RLS with a self-owned `for all using (auth.uid()=user_id)` policy; `grant select,insert,update,delete on public.movement_rest_defaults to authenticated, service_role;` and `revoke all ... from anon` (per the service_role-not-auto-granted memory).

TypeScript: regenerate `src/shared/types/database.ts` (profiles Row/Insert/Update gain `default_rest_seconds`; new table types). Add `restSeconds?: number | null` to `MovementSlot` in `src/shared/types/training.ts` so the per-slot override rides along the session payload, and a `RestTimerState = { endsAt: number; durationMs: number; movementId: string; sessionId: string }` type there too.

### 3. Implementation
- **Choke point:** add an `onSetCompleted?(ctx)` callback param to `useSetLogMutation` (`src/domains/session/lib/useSetLogMutation.ts`) fired in `onSuccess` only when `patch.completed === true` and it was previously false. This single edit catches both `LiveSetRow` and `FocusSetCard`, since both route through this hook.
- **State owner:** a session-scoped `RestTimerProvider` mounted in `SessionPage.tsx` (`LoadedSessionRoute`, wrapping both the Focus and Overview branches) so it outlives the `mobileView` swap. Provider computes `endsAt = Date.now() + durationMs`, renders `endsAt − now` via a `250ms` interval used **only** to re-render (never an accumulator), and recomputes on `visibilitychange` so a backgrounded tab shows the correct remaining time on resume.
- **Persistence:** `workoutDb` in `src/domains/session/lib/local-db.ts` is currently `this.version(1)`. Add a **`this.version(2).stores({ restTimer: 'sessionId' })`** bump — additive-only, so the existing `queuedMutations`/set stores migrate untouched. Write `RestTimerState` keyed by `sessionId` on start, clear on skip/expiry, rehydrate on mount for reload survival. Reuse the existing `workoutDb` instance. (The PR-detection workstream also touches this DB in the same milestone; land the v2 bump once, here.)
- **Duration resolution:** `resolveRestSeconds(slot, profile, overrides)` — pure fn in a new `src/domains/session/lib/rest-timer.ts` (per-movement override → global default → role-based seed). Role seeds live beside it (colocation convention).
- **Cue:** Web Audio beep unlocked on the set-complete tap gesture, `navigator.vibrate`, and `navigator.wakeLock` held for the active session; `Notification` only when the tab is hidden-but-alive.
- **UI:** new `RestTimerPill.tsx` in `src/domains/session/components/`; per-movement override control in `MovementHistoryModal` or the movement card; global controls in `PreferencesSection.tsx`. Text/color via design-system atoms, Tailwind layout-only. **SSR gotcha:** guard all `window`/`navigator`/`Dexie` access behind `typeof window !== 'undefined'` and effects; render the pill only after hydration.

### 4. Validation (DoD)
`pnpm typecheck` + `pnpm lint` (0 errors); `pnpm test` with new unit tests for `resolveRestSeconds` (override precedence, role seeds, clamp, null-intensity/ad-hoc/deload slots) and the wall-clock `remaining(endsAt, now)` math (including now > endsAt → 0). New e2e in `tests/e2e/` (`rest-timer.spec.ts`): complete a set → pill appears with countdown → −15/+15/Skip work → switch Focus↔Overview and confirm the pill and its remaining time persist → reload and confirm rehydration. Use the resilient `toPass` retry pattern for the hydration race. `pnpm shot /sessions/<id>` to eyeball the pill in both views.

### 5. Effort & risks
**Effort: L** — the choke-point edit is small, but wake-lock + Web Audio unlock + vibration + `Notification` + `visibilitychange` recompute + Dexie-v2 persistence across the Focus↔Overview swap + a new table + per-movement override UI + settings + the spec amendment add up. This is the Milestone-1 anchor and the estimate is sized as L. Sequencing: migration + type regen first, then the pure `rest-timer.ts` (unit-testable in isolation), then provider/pill, then settings UI. No dependency on the exercise-library workstream, though the per-movement override UI pairs naturally with richer movement metadata later. **Risks:** (a) PWA timer accuracy when backgrounded — mitigated by wall-clock + `visibilitychange` recompute, never an accumulator; (b) audio/vibration autoplay policies require unlocking on the tap gesture, and locked-screen delivery is genuinely unsolved pre-Web-Push (scope it honestly in the §7/§8 amendment, since rest timer is currently a documented non-goal); (c) wakeLock is unsupported on some browsers — degrade gracefully. **Fallback if the cycle tightens:** cut wake-lock + `Notification` to post-beta and ship the pill + audio/vibration only, which re-tiers the core to M.

## Exercise Library Hardening — Muscles & Instructions (P0), Media (P1)

### 1. Goal & scope
Give every movement primary/secondary muscles and step-by-step instructions, served from our own `movements` table with **zero per-request latency** (no third-party calls at request time). **Ships for beta (P0):** additive schema on `movements`, an idempotent importer that upserts public-domain **text** data keyed on `external_id`, and read-through of the new fields in the existing DB-with-fallback path so the exercise-detail/swap UI can show muscles + instructions. **Ships as P1 (post-P0, pre/at-launch if time allows):** the ~1,600-JPG image pipeline into a public Supabase Storage bucket — the expensive, non-blocking part. **Deferred:** wger CC-BY-SA gap-fill (cardio/mobility/machines), animated media, and per-user custom exercises. The current ~72 `builtin` rows and the hardcoded `movementCatalog` fallback (`src/domains/movement/lib/movements.ts`) must keep working untouched.

### 2. Data model / schema
Migration `supabase/migrations/202607070003_add_movement_metadata.sql` — all nullable, additive (the `image_paths` column ships in this P0 migration even though it is populated later in P1):
```sql
alter table public.movements
  add column if not exists primary_muscles text[],
  add column if not exists secondary_muscles text[],
  add column if not exists force text, add column if not exists level text,
  add column if not exists mechanic text, add column if not exists instructions text[],
  add column if not exists is_unilateral boolean,
  add column if not exists image_paths text[],
  add column if not exists source text not null default 'builtin',
  add column if not exists external_id text;
create unique index if not exists movements_external_id_key on public.movements (external_id) where external_id is not null;
```
`source` keeps public-domain (`free_exercise_db`) legally separable from `builtin`/future `wger`. Storage (P1): create bucket `exercise-media` (public read); grant `service_role` (memory: new buckets are **not** auto-granted). Types: extend `Movement` in `src/shared/types/training.ts` (optional `primaryMuscles?`, `secondaryMuscles?`, `instructions?`, `imagePaths?`, `source`, `externalId?`, `isUnilateral?`), regen `src/shared/types/database.ts`, and map the new columns in `mapMovementRow` (`src/domains/movement/server/movement-functions.ts`).

### 3. Implementation
**Crux — keep the TS catalog authoritative for identity, DB authoritative for metadata.** `getMovementName` (movements.ts:730) is synchronous and read by ~20 files; do **not** make it async. The hardcoded catalog stays the source of truth for ids/names/structure (load-bearing FKs across `exercise_logs`/`program_anchors`); the DB layer only *enriches* it. `mapMovementRow` merges DB metadata over the fallback row.

`scripts/import-exercises.mjs` (mirror `demo-data.mjs`, run via a new `pnpm import:exercises`): fetch free-exercise-db JSON, **fuzzy-match/alias** its ids to our ~72 `builtin` ids (a checked-in `movementAliases` map), upsert on `external_id`, and **never delete builtin rows**.

**Muscle seeding (not a clean "fold").** `body-load.ts` stores `compoundMovementWeights: Record<string, RegionWeights>` — coarse **body-region** fractions (`Partial<Record<BodyRegionId, number>>`), plus a `categoryFallbackWeights` fallback, so many of the ~72 movements have *no* explicit region entry. free-exercise-db uses fine-grained **muscle names** ("biceps", "lats"). These taxonomies do **not** map 1:1 and the region seed is lossy, so the plan is: (1) define a checked-in **region→muscle-name mapping**; (2) seed `primary_muscles`/`secondary_muscles` from body-load regions *where present*; (3) **fill gaps from the importer's** free-exercise-db muscles. This narrows drift to one reconciliation surface rather than promising true single-source before the mapping exists.

**Media (P1).** Download the 2 JPGs per exercise once, upload to `exercise-media`, store bucket paths in `image_paths` (re-run-guarded via `list` before upload; never hotlink, never bundle into the PWA). UI: surface muscles/instructions server-side first, images once the bucket is populated (`LiveMovementCard.tsx`, movement picker). SSR gotcha: metadata renders server-side, so no hydration race, but any e2e that opens a detail drawer must use the `toPass` retry pattern.

### 4. Validation
DoD gate: `pnpm typecheck` + `pnpm lint` (0), `pnpm test` with **new unit tests** for the alias-mapping/merge logic, the region→muscle-name mapping, and updated `body-load`/muscle-volume tests. Add an importer dry-run test (mirror `export-templates.spec.ts`) asserting idempotency and that builtin ids are never dropped. UI: `pnpm shot` a movement-detail route to eyeball muscles + instructions (P0) and image (P1); add an e2e opening the swap/detail sheet.

### 5. Effort & risks
**M** for muscles+instructions (P0, text-only importer), **L** for the image pipeline (P1). Sequence: schema → types/`mapMovementRow` → region→muscle mapping + seed → text importer (P0 done) → storage bucket + media pipeline (P1). **Risks:** (a) license hygiene — keep `source` accurate, attribute wger when added; (b) id fuzzy-matching drift — the alias map must be human-reviewed, not auto-guessed, or program templates surface wrong muscles; (c) media storage egress/bucket size (~1,600 JPGs) — acceptable, served from our CDN, guarded against re-upload, and isolated to P1 so it can slip without blocking launch. No per-request latency risk: all data lives in `movements` + our bucket.

## Onboarding Essential-Data Capture

### 1. Goal & scope
Ships for beta: a short, beginner-first intake wired into the existing Today-page onboarding — **units → sex → bodyweight** — so DOTS is live on the first insight view instead of waiting for the `completedSessions >= 2` `BodyweightPromptCard` fallback. Reuses `logBodyweightFn` and `updateSexFn` verbatim; **no schema work** (`profiles.sex`, `profiles.units`, `bodyweight_entries` all exist). Deferred (P2): persisting the Find-my-plan wizard's transient `experience`/`days`/`goal` (`WizardAnswers` in `src/domains/program/lib/find-my-plan.ts`) into profiles columns. Explicitly out of scope: injury questionnaire (spec non-goal).

### 2. Data model / schema changes
Beta ships with **zero migrations** — all target columns exist.

P2 follow-on: `supabase/migrations/202607070004_add_profile_intake_fields.sql` — `alter table profiles add column experience text, add column primary_goal text, add column training_days_per_week int2` (all nullable, no default). Existing profiles RLS already scopes by `id = auth.uid()`; no new table, so no service_role grant needed. Type changes: add the three fields to `profiles` Row/Insert/Update in `src/shared/types/database.ts` and to `UserProfile` in `src/shared/types/training.ts`; surface them in `getMeFn` (`src/domains/account/server/profile-functions.ts`).

### 3. Implementation
Add a derived **`bodyProfile`** step to `OnboardingStepId`/`buildOnboardingProgress()` in `src/domains/onboarding/onboarding-progress.ts`, mirroring the `estimates` derivation: `done = input.hasSex && input.hasBodyweight`. Extend `OnboardingProgressInput` with `hasSex`/`hasBodyweight`; `OnboardingPanel.tsx` already has `me` and the history dashboard query — pass `me.sex != null` and `bodyweightEntries.length > 0`. **Order units first** so lb users never see a kg field: a 3-field inline step (SegmentedControl units → Select sex → NumberInput bodyweight). Units writes via **`updateSettingsFn`** (which already handles the `units` field); sex/bodyweight reuse `updateSexFn`/`logBodyweightFn`. Extract the capture UI from `BodyweightPromptCard.tsx` into a shared `BodyweightSexFields` molecule consumed by both the onboarding step and the existing prompt card (which stays as fallback). On success invalidate `['me']`, `['bodyweight']`, `['history','dashboard']`. No new libs. **SSR gotcha**: the step renders inside the server-rendered Today page — e2e must use the retry-until-visible `toPass` pattern (`tests/e2e/support/auth.ts`).

### 4. Validation
DoD gate: `pnpm typecheck` + `pnpm lint` (0 errors), `pnpm test` with new unit tests for `buildOnboardingProgress` (bodyProfile done/undone permutations; step ordering with units first), `pnpm shot /` to eyeball the intake step, and a new `tests/e2e/onboarding-intake.spec.ts` asserting: units toggle flips the bodyweight field label kg↔lb, saving sex+bodyweight marks the step done, and DOTS renders on `/insights` without hitting the 2-session gate. Reseed demo users first (memory: `pnpm demo:seed` before full e2e).

### 5. Effort & risks
**S** (beta intake) + **S** (P2 columns). Sequencing: no dependency on the rest-timer/catalog workstreams; unblocks the DOTS-over-time Overview chart by guaranteeing early data. Risks: low — reuses validated server fns and `normalizeBodyweightLog` bounds. Watch that the units write lands before the bodyweight NumberInput is edited (hydration race) so the value is stored in the intended unit; adding one extra required step risks onboarding drop-off, so keep it skippable (the prompt card remains a safety net).

## DOTS-over-time on Overview + Insights polish

### 1. Goal & scope
Bring the strength-score trend LineChart (already live on the Strength tab) onto the Overview `StrengthScoreCard`, plus a cheap adjacent bodyweight-trend chart, so the Overview headline number gains honest history without any engine work. **Ships for beta:** range-aware DOTS/×BW/total trend on the Overview card; a bodyweight sparkline from the existing daily series; extraction of the four total-metric helpers into a shared, unit-tested module. **Deferred:** any new signal engine, per-lift charts on Overview (they stay on Strength), and forecasting. This is pure UI reuse — the `no-fake-trends` rule (`main-app-spec.md:306`) is honored via the existing `>= 2 finite points` gate and honest empty captions.

### 2. Data model / schema changes
**None.** `bodyweight_entries` + `profiles.sex` already shipped in `202607060001_add_bodyweight_and_sex.sql`, and `TotalPoint` (`src/shared/types/training.ts:650`) already carries date-paired `total`/`totalKg`/`bodyweightKg`/`dots`/`bwMultiple`. `insights.totalSeries` and `insights.bodyweight.entries` (`BodyweightEntry[]`, `recordedOn`+`weightKg`) are already on `HistoryInsights`. No migration, no `database.ts` change, no new grant.

### 3. Implementation
- **New `src/domains/history/lib/total-metric.ts`**: move `TotalMetric` type + `totalMetricFor`/`totalMetricValue`/`totalMetricLabel`/`formatTotalMetricValue` out of `StrengthTab.tsx:21,193-215` (which import `formatLoad`/`formatNumber` from `insight-format.tsx`). Re-import them in `StrengthTab.tsx` so behavior is unchanged.
- **`StrengthScoreCard.tsx`**: add a `range: InsightRange` prop. Compute `filterToRange(insights.totalSeries, range, { firstDataDate: insights.firstSessionDate, now: insights.generatedAt, getDate: p => p.date })`, map through `totalMetricValue(point, totalMetricFor(score.kind))`, filter to finite points, and render the same `@mantine/charts` `LineChart` (h≈160, `dataKey="date"`, `series` label from `totalMetricLabel`) **only when `>= 2` points**; otherwise keep the existing "See your lift trends" link + `BodyweightPromptCard`. Add a second small `LineChart` for `insights.bodyweight.entries` (`recordedOn`→`weightKg`, converted at the edge via `formatLoad`), gated identically.
- **`OverviewTab.tsx:121`**: thread the already-in-scope `range` prop into `<StrengthScoreCard range={range} … />`.
- **SSR/recharts caveat**: `ResponsiveContainer` needs ~1-2s to measure after hydration (dots-plan §"blank charts"); the container reserves height so no layout shift. Only add a mount-gate if the pre-settle paint reads rough.

### 4. Validation
DoD gate: `pnpm typecheck` + `pnpm lint` (0 errors); `pnpm test` with new unit tests for the extracted `total-metric.ts` (kind→metric mapping, null/non-finite handling, `formatTotalMetricValue` per metric+unit). UI: `pnpm shot /history` as `demo.linear` (female/63 kg → renders DOTS trend) and `demo.wave` (no bodyweight → prompt card, no fake chart) with a settle wait; extend `tests/e2e/insights.spec.ts` to assert the Overview card shows a chart for a bodyweight+sex user and the empty caption otherwise. Reseed (`pnpm demo:seed`) before the full e2e run.

### 5. Effort & risks
**S.** Sequencing: extract helpers first (mechanical, keeps Strength tab green), then thread `range`, then charts. Risks are low: recharts backgrounded-settle flicker (mitigated by reserved height / optional mount-gate) and the honesty gate — do not down-shift the metric kind mid-series; keep the whole trend on one metric matching `score.kind`, matching Strength-tab behavior.

## Logging UX Polish — plate calc, inline previous-set, PR detection

### 1. Goal & scope
Close three table-stakes in-session conveniences so the logger matches Hevy/Strong. **Ships for beta:** (a) a plate calculator wired into the two existing stub buttons; (b) inline previous-set ghost values with one-tap-to-fill on every set row; (c) PR detection on set-complete with a restrained, reduced-motion-aware badge, persisted server-side. **Deferred:** warm-up-set generator, supersets. RPE/RIR and per-set notes are already modeled (`SetLog.actualRpe`, `note`) — surface entry affordances only, don't re-architect.

### 2. Data model / schema
- **New table** `personal_records` (user_id, movement_id, kind `'e1rm'|'heaviest'|'rep_at_weight'`, value, reps, load, session_id, achieved_at). Migration `supabase/migrations/202607070002_add_personal_records.sql` (numbered *after* the rest-timer migration and *before* movement metadata, matching introduction order in M1). RLS: user-scoped select/insert on `auth.uid()`; **explicit `grant select, insert on personal_records to authenticated, service_role`** (per memory — not auto-granted).
- **Types** (`src/shared/types/training.ts`): add `equipment?: string[]` and `bestSet?: HistoryBestSet | null` to `MovementSlot` (both populated server-side in `session-functions.ts` alongside `getPreviousComparablesBySlotId`); add a `PersonalRecord` type + `newPr?: HistoryBestSet['kind'][]` hint on the set-log response. Regenerate `src/shared/types/database.ts`.

### 3. Implementation
- **Plate calc** — pure `computePlateStack({ target, barWeight, units, inventory, rounding })` in a new `src/domains/session/lib/plate-math.ts`: `perSide=(target−bar)/2`, greedy over a default inventory, returns `{ perSide[], nearestLoadable }` (Alpha's next-lower behavior). Wire the `ToolButton` at `LiveMovementCard.tsx:157` (add `onClick`) and un-disable `FocusExerciseHeader.tsx:46` to open a Mantine modal; seed weight from `seedLoadForSet`, units/`rounding` from `session`, gate visible-but-disabled unless `movement.equipment` includes `'barbell'`.
- **Inline previous-set** — reuse `formatPreviousShort` (currently movement-level in `LiveMovementCard`) as ghost placeholder text inside `StepCell` in `LiveSetRow.tsx`, sourced from `movement.previous`; tapping the ghost fills `draft.actualLoad/actualReps`. Unify the `StepCell` steppers with Focus mode's `FocusStepper`.
- **PR detection** — on `complete()` in `LiveSetRow`, compute `e1rm(load, reps, rir)` (`src/shared/lib/math.ts`) and compare against `movement.bestSet`; on a new best, insert into `personal_records` via a new server fn and show an inline `Badge` celebration honoring `prefers-reduced-motion` with a Settings opt-out. Persist optimistically; the Dexie set-patch queue (`local-db.ts`, now at v2 from the rest-timer bump) already handles offline set patches — extend the same v2 store schema if PR inserts also need queuing rather than adding a second version bump.
- **SSR gotcha:** modal-open and ghost-fill clicks must use the retry-until-visible pattern in e2e (React hydration race).

### 4. Validation (DoD)
`pnpm typecheck` + `pnpm lint` (0 errors). `pnpm test`: unit-cover `plate-math.ts` (per-side stacks, unloadable→nearest, lb/kg, odd bars) and the PR-comparison predicate. `pnpm e2e`: extend a logger spec to open the calculator, tap-to-fill a ghost value, and trigger a PR badge; `pnpm shot /sessions/$id` to eyeball badge + plate modal in light/dark.

### 5. Effort & risks
**S** (plate calc), **M** (inline previous + PR detection incl. migration) — total **M**. Sequence: types + migration → plate math → inline fill → PR (depends on `bestSet` plumbing). Risks: `movement.bestSet` requires an extra server query per session load (cache it); PR spam on early sessions (suppress when no prior history); e1RM PR noise at high reps — cap comparison at `E1RM_MAX_REPS` (12), matching `strength.ts`.

## Release Ops (P0 — gates launch regardless of code)

The entire `release-checklist.md` / `RAILWAY.md` sequence is unchecked. None of it is optional for beta:

- **Resend email end-to-end** — Magic Link is the only prod email path, so a verified Resend domain + inbox-not-spam delivery is the hardest external dependency. Test a real magic-link sign-in on the prod domain before anything else.
- **Prod migration** — dry-run first, then merge `develop → main` and run the migration against prod Supabase (`xbvjxkfsvxskboqynxih`). Mind the `supabase db push` collision gotchas (same-version history row = silent skip; out-of-order files need `--include-all`) — the renumbered sequential block above is designed to avoid exactly this.
- **Google OAuth** — enable on the canonical domain (`www.sheetless.fitness`); redirect = Supabase callback, JS origins = bare origins.
- **Privacy / terms** — add a basic line now that real accounts are being collected.
- **Account deletion + data export** — a GDPR-adjacent compliance item, not a wearables-style non-goal: real accounts (email, bodyweight, sex, training history) are being collected, so ship a self-serve account-delete (cascade already flows via the `on delete cascade` FKs) and a basic data export before launch, alongside privacy/terms.
- **In-product feedback channel (P1, promoted)** — `feedback_events` already exists; surface a lightweight form. "Collecting feedback is the point of this launch," so this ships pre-beta, not post.

**Effort: M.** No code-workstream dependency — can run in parallel, but the email + migration steps must complete before any real user touches the app.

---

## Sequencing & milestones

**Milestone 1 — Logging floor (the credibility fix).** Rest timer (**L**) + plate calculator (S) + inline previous-set & PR detection (M). Rationale: this is the founder-flagged, competitor-obvious gap; it makes the logger *feel finished*. Rest timer and logging polish share the `useSetLogMutation` choke point and the Dexie DB (land the single v2 bump in the rest-timer work) — do them together. **Dependency:** none external. **~2–2.5 weeks** (the rest timer is L, not M — plan for it). Requires the §7/§8 spec amendment for the rest timer up front.

**Milestone 2 — Data credibility.** Exercise metadata muscles+instructions (**M**, text importer + region→muscle mapping seeded from `body-load.ts` with importer gap-fill) → exercise images (**L, P1**, same additive migration). Rationale: the "am I doing it right" gap for beginners and the upstream unblock for muscle-volume analytics. Splitting text (P0) from media (P1) means the credibility win lands even if the image pipeline slips. **Dependency:** none on M1, but do *after* M1 so the logger is solid first. **~1.5 weeks** (P0 text ~1 week; images fill remaining time or slip to P1).

**Milestone 3 — Insight completeness & data intake.** Onboarding essential-data capture (S) → DOTS-over-time on Overview + bodyweight trend (S). Rationale: onboarding capture *unblocks* the Overview chart by guaranteeing early bodyweight+sex data — sequence intake first. Both are small, low-risk UI-reuse wins that foreground an area we already lead. **Dependency:** DOTS-over-time depends on onboarding intake for a populated first-view. **~1 week.**

**Milestone 0 — Ops (parallel track, must finish before launch).** Resend end-to-end + prod migration + OAuth + privacy/terms + account-deletion/export + feedback form. Run alongside M1–M3; the email and migration steps are the true launch gate. **~M effort spread across the cycle.**

**Post-beta backlog (P2):** exercise images if slipped, warm-up / set-type marking (data-integrity — must exclude from e1RM/DOTS/PR before warm-ups are ever loggable), persist wizard experience/goal/days, strength-standard banding, body measurements + supersets, durable offline replay/flush.

## Risks & open questions

- **Spec amendment required (founder decision).** Rest timer is currently a documented §7 non-goal, cut for honesty. It cannot ship without an explicit §7/§8 amendment. **Decide before Milestone 1 starts.**
- **Rest timer is L, and it anchors M1.** Wake-lock + Web Audio + vibration + `Notification` + `visibilitychange` + Dexie-v2 persistence + new table + override UI + settings is a large workstream. If the cycle tightens, cut wake-lock + `Notification` to post-beta (re-tiers the core to M) rather than shipping it half-done.
- **`auto_start_timer` default for existing users.** Reviving the column auto-starts timers for everyone (it defaults `true`). The intended beta behavior is auto-start ON (competitor parity), applied to existing rows, disable-able in settings — a deliberate call, confirmed here, not an accident.
- **PWA timer accuracy on locked screens.** Backgrounded/foreground accuracy is solved via wall-clock + `visibilitychange` recompute, but *true screen-locked* beep/notification delivery is genuinely unsolved without server Web Push. Scope it honestly — best-effort, documented, not promised. Web Push is post-beta.
- **Dataset licensing.** free-exercise-db is Unlicense/public-domain (copies wholesale, `source='free_exercise_db'`); wger is CC-BY-SA and requires attribution (`source='wger'`, phase-2). The `source` column must stay accurate to keep the two legally separable. **Founder call:** confirm we're comfortable shipping ~1,600 JPGs from our Storage bucket (egress/size acceptable, but a decision) — isolated to P1 so it doesn't gate launch.
- **Muscle-taxonomy mismatch, not a clean fold.** `body-load.ts` holds coarse body-*region* fractions (many movements have no entry); free-exercise-db holds fine-grained muscle *names*. There is no 1:1 mapping. The plan defines a region→muscle-name mapping, seeds from regions where present, and fills gaps from the importer — narrowing drift to one reconciliation surface rather than claiming true single-source. Keep `getMovementName` synchronous (DB enriches, never owns, identity); the importer must never delete builtin rows.
- **Movement-id fuzzy-matching drift.** The importer's alias map (free-exercise-db ids → our ~72 builtin ids) must be *human-reviewed*, not auto-guessed — a wrong match surfaces incorrect muscles on a program template. Movement ids are load-bearing FKs.
- **Migration numbering.** Four new migrations must carry unique sequential versions (`202607070001`–`0004`); duplicate versions silently skip on push. This is the single most likely concrete break in the plan and is designed out above.
- **Scope creep vs non-goals.** Supersets, body measurements, offline replay, wearables/Health/CSV/social remain explicit non-goals or P2. Don't let the competitor matrix pull them into beta. Keep onboarding intake *skippable* to avoid drop-off.
- **PR noise.** Suppress PRs when there's no prior history (early sessions); cap e1RM comparison at `E1RM_MAX_REPS` (12) to match `strength.ts`; honor `prefers-reduced-motion` and make celebration opt-outable.
- **Ops is the real gate.** Resend inbox-not-spam delivery is the hardest external dependency and the most likely thing to slip. Test a real prod magic-link sign-in early. Account-deletion/export is a compliance requirement, not optional.

## Definition of done

Every item above must clear the repo's validation bar (`CLAUDE.md` §Validation, `main-app-spec.md` §12) before it is called done:

1. **`pnpm typecheck`** and **`pnpm lint`** — 0 errors.
2. **`pnpm test`** — add/extend unit tests for any new pure logic (`resolveRestSeconds` + wall-clock math, `plate-math.ts`, `total-metric.ts`, PR predicate, `buildOnboardingProgress`, importer alias/merge + region→muscle mapping + idempotency).
3. **For any UI change, validate in the real running browser** — typecheck + unit tests are not sufficient:
   - Eyeball with `pnpm shot <route>` (read the PNG).
   - Add/run an e2e flow in `tests/e2e/` for new interactive features and run `pnpm e2e`.
   - Use the resilient `toPass` retry pattern for every action that can race SSR hydration.
4. **Reseed before full e2e** — `pnpm demo:seed` (the suite is non-idempotent; estimates/session-finish specs consume demo state).
5. **New public tables/buckets** need explicit `grant … to service_role` (not auto-granted); new migrations need unique sequential versions, `supabase migration up` **and** `pnpm demo:seed` locally, then a dry-run before prod push.

UI bugs — hydration races, broken nav, disabled buttons, empty states — repeatedly slip past typecheck/unit tests and only show up in a real browser. That browser check is a hard requirement, not a nicety.
