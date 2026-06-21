# Final App Spec - Mobile Strength Tracker

## 1. Summary

Build a mobile-first web app for structured strength training. The app should make the workout in front of the user effortless to execute: show what is planned, what happened last time, what the goal is today, and what the likely next progression decision will be.

The first version must prioritize a stable training engine and logging workflow over coaching automation. It should support multiple progression models, including main lifts, variations, and accessories, without hardcoding one athlete or one program.

Sources for this spec:

- `references/base-strength-by-bromley.md`
- `references/Ultimate-workout-plan.md`
- `app-spec.md`

V1 intentionally excludes pain gating, shoulder-specific logic, readiness automation, wearable signals, calendar export, Hevy/Strong export, and LLM-generated substitutions. The data model should leave clean module boundaries for those later.

## 2. Product Goals

- Make live workout logging fast enough to use during hard sets on a phone.
- Treat accessory lifts as first-class training data, not notes.
- Support programs with different progression rules: percentage, RPE, AMRAP, 5/3/1 training maxes, Bromley waves, DUP/H/L/M, and double progression.
- Show previous comparable performance at the exact moment it helps: before the set.
- Preserve the difference between planned work, performed work, and recommended future work.
- Support cloud accounts as the canonical store.
- Keep the progression engine deterministic, testable, and shared between backend and UI.

## 3. Non-Goals For V1

- No pain gating, injury ladders, or shoulder-specific restrictions.
- No LLM-generated workout changes.
- No automatic equipment substitution.
- No wearable-driven readiness adjustments.
- No full visual program builder.
- No social feed, coaching marketplace, or public leaderboards.
- No automatic calendar or third-party tracker export.

The LLM and equipment features should be designed as future modules that consume structured program, movement, equipment, and history data. They should not be required for the core tracker to work.

V1 UI must not expose inactive future modules as if they are usable features. Pain/injury gating, AI substitution, readiness automation, calendar export, and third-party export may be mentioned only as future or unavailable areas, not as selectable workout actions.

## 4. Starting Programs

Seed V1 with the user's healthy 5/3/1 FSL plan and the official prefabricated Bromley templates from `Base Strength`.

Do not seed a custom program named "Bromley Base Strength comeback template: Base, Transition, Peak." That was a useful analysis structure, but it is not one of Bromley's named prefabricated templates.

Template UI labels must come from canonical template metadata, not designer placeholder copy. Source badges, days per week, progression labels, and short descriptions must match this spec so Healthy 5/3/1 is not mislabeled as Bromley and Bromley template details do not drift between screens.

### 4.1 Healthy 5/3/1 FSL

Source: adapted from `references/Ultimate-workout-plan.md`, with pain and shoulder gating removed.

Characteristics:

- Anchor: `training_max`.
- Cycle length: 4 weeks.
- Weeks: 5s, 3s, 5/3/1, deload.
- Main work:
  - Week 1: 65%x5, 75%x5, 85%x5+.
  - Week 2: 70%x3, 80%x3, 90%x3+.
  - Week 3: 75%x5, 85%x3, 95%x1+.
  - Week 4: 40%x5, 50%x5, 60%x5.
- Back-off: FSL at 65%, normally 5x5; deadlift may use 4x5 as a template option.
- Plus sets are capped by user-entered RIR/RPE. The app records actual reps and RIR, then recommends the next training max adjustment.
- Cycle progression bands:
  - `reset`: missed minimum on any top set -> reduce TM by 10%, rounded.
  - `hold`: any top set hit minimum but ended at RIR 0-1 -> repeat TM.
  - `standard`: all top sets hit minimum at RIR >= 2 -> lower +5 kg, upper +2.5 kg.
  - `double`: every top set hit minimum plus at least 2 extra reps at RIR >= 2 -> lower +7.5 kg, upper +5 kg.
- Accessories: use double progression independently of the TM engine.

### 4.2 Bromley: Volume/Intensity

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- Split: 3 days, whole body.
- Structure: alternates a 3-week volumizing wave with a 3-week top-set/intensity wave.
- Main lift pattern combines volume work and intensity work across the week.
- Good fixture for:
  - Multiple tracks in one session.
  - Volume and intensity progressions running side by side.
  - Whole-body days with limited accessories.

### 4.3 Bromley: Powerbuilder

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- Split: 4 days, upper/lower/upper/lower.
- Main lifts use a 3-week pyramid wave.
- Accessories use high-rep volumizing waves.
- Good fixture for:
  - Heavy main work plus high-volume bodybuilding work.
  - Accessories with their own wave progression.
  - Broad base-building program structure.

### 4.4 Bromley: 70s Powerlifter

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- Split: 4 days, upper/lower/upper/lower.
- One primary lift per day, with variations and bodybuilding accessories.
- Base phase uses volumizing waves.
- Peak phase uses intensifying waves.
- Good fixture for:
  - Main lift, variation, and bodybuilding accessory layers.
  - Base-to-peak contrast.
  - Step-loading by sets while weight does not drop within a wave.

### 4.5 Bromley: Bullmastiff

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- Split: 4 days, upper/lower/upper/lower.
- Uses a 3-week autoregulated plus-set wave.
- Main lift plus sets determine load jumps.
- Variations use step-loaded volume.
- Accessories use their own progression.
- Good fixture for:
  - Plus-set autoregulation.
  - Load increases based on reps over baseline.
  - Main lift, variation, and accessory progression coexisting in one program.

Bullmastiff plus-set rule:

```text
extra_reps = reps_done - baseline_reps
next_load = current_load + extra_reps * 1% of anchor
```

Loads are rounded to the user's unit increment. The app must show this recommendation as a reviewable progression decision, not silently rewrite the program.

### 4.6 Bromley: Pyramid

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- Split: 4 days, upper/lower/upper/lower.
- Each day has a main lift, heavy variation, and light variation.
- Uses a 3-week structure with heavier top work and lighter supplemental work.
- Good fixture for:
  - Multiple prescribed exercises per focus lift.
  - Heavy and light variations tied to a competition movement.
  - Exercise role metadata.

### 4.7 Bromley: Minimalist

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- Split: 3 days, whole body.
- Leans on main movements and close variations.
- Little to no accessory work.
- Uses top-set waves and back-off work.
- Good fixture for:
  - Short workouts.
  - Low-volume high-specificity training.
  - Back-off methods after top sets.

### 4.8 Bromley: DUP

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- DUP means daily undulating periodization.
- The same lift can appear multiple times per week with different qualities, such as hypertrophy, strength, and power.
- Good fixture for:
  - Separating movement identity from session prescription.
  - Multiple tracks for one lift.
  - Explicitly authored wavy programming.

The app must not synthesize "noise" distributions. Wavy/DUP weeks are represented explicitly.

### 4.9 Bromley: H/L/M

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- Heavy/light/medium organization.
- Same lift can appear several times weekly, with reduced load and volume on lighter days.
- Good fixture for:
  - Hardness labels.
  - Recovery-aware scheduling.
  - Same movement, different daily prescriptions.

### 4.10 Bromley: M/R/S

Source: official prefabricated program in `references/base-strength-by-bromley.md`.

Characteristics:

- Max/reps/speed structure.
- Alternates maximal efforts with volume and recovery/speed work.
- Good fixture for:
  - Different physical qualities in a single program.
  - Speed work prescriptions.
  - Max effort work that is separate from true 1RM testing.

### 4.11 Bromley: Strongman

Source: official prefabricated program and bonus progressions in `references/base-strength-by-bromley.md`.

Characteristics:

- Uses main movements, event variations, carries, loads, and timed or distance-based work.
- Good fixture for:
  - Non-barbell movements.
  - Time, distance, and implement prescriptions.
  - Optional future support for events such as farmers, yoke, stones, bags, log, axle, and carries.

For V1, Strongman templates can use structured placeholders for time and distance work. They do not need advanced event analytics yet.

## 5. Core Methodology Model

The app's program engine must model training as structured prescriptions, not as plain text routines.

Canonical nesting:

```text
program -> block -> wave -> week -> session -> movement slot -> prescription -> set target
```

Key concepts:

- `movement`: the exercise identity, such as squat, bench press, deadlift, chest-supported row, leg curl, farmers walk.
- `movement slot`: a planned appearance of a movement in a session.
- `track`: the progression lane attached to a movement or movement variation.
- `anchor`: the number used to calculate load.
- `prescription`: the planned sets, reps, load, RPE/RIR, notes, and progression behavior.
- `actual log`: what the athlete really did.
- `progression decision`: a computed recommendation based on logs.

Movement identity must be separate from prescription. A squat can appear as heavy squat, light squat, paused squat, hypertrophy squat, or speed squat without corrupting the movement history.

## 6. Program DSL

The DSL should be expressive enough for the starting programs without requiring a visual builder in V1.

### 6.1 Program Template

```ts
type ProgramTemplate = {
  id: string;
  name: string;
  source: "healthy_531" | "bromley_base_strength" | "custom_import";
  description: string;
  schemaVersion: string;
  unitsDefault: "kg" | "lb";
  roundingDefault: number;
  movements: Record<string, MovementDefinition>;
  schedule: ScheduleDefinition;
  blocks: BlockDefinition[];
  progressionRules: Record<string, ProgressionRule>;
  modules?: ProgramModuleFlags;
};
```

### 6.2 Program Instance

A template becomes an instance when a user starts it.

```ts
type ProgramInstance = {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  status: "active" | "paused" | "completed" | "archived";
  startDate: string;
  units: "kg" | "lb";
  rounding: number;
  anchors: Record<string, AnchorState>;
  currentBlockId: string;
  currentWeekIndex: number;
  createdAt: string;
  updatedAt: string;
};
```

### 6.3 Anchors

Supported anchor types:

```ts
type Anchor =
  | { type: "training_max"; movementId: string; tmPct: number; seed?: SeedSet }
  | { type: "rolling_e1rm"; movementId: string; seed?: SeedSet }
  | { type: "fixed_1rm"; movementId: string; oneRm: number }
  | { type: "manual"; movementId: string; value: number; label?: string };
```

Anchor behavior:

- `training_max`: used by 5/3/1 and any program that calculates percentages from TM.
- `rolling_e1rm`: updated from logged top sets and used for Bromley-style working estimates.
- `fixed_1rm`: a tested or declared max that does not auto-update.
- `manual`: a user-entered value for movements where standard max math is not useful.

### 6.4 Intensity Modes

Supported intensity modes:

```ts
type Intensity =
  | { mode: "percent"; pct: number; rpeCap?: number }
  | { mode: "percent_table"; tableKey: string; rpeCap?: number }
  | { mode: "rpe"; target: number; suggestedPct?: number }
  | { mode: "amrap"; pct?: number; baselineReps: number; stopRpe?: number }
  | { mode: "rep_range"; minReps: number; maxReps: number; targetRir?: number }
  | { mode: "manual"; label: string };
```

Rules:

- `percent` produces a planned load from an anchor.
- `percent_table` uses Bromley's sets x reps percentage table.
- `rpe` can show a suggested load, but actual load must be logged by the user.
- `amrap` has a baseline and records extra reps.
- `rep_range` is the default accessory mode.
- `manual` supports non-standard movements and early Strongman placeholders.

### 6.5 Back-Off Methods

Supported back-off methods:

```ts
type BackoffRule =
  | { method: "none" }
  | { method: "two_thirds"; sets?: number }
  | { method: "drop_pct"; pct: number; sets?: number }
  | { method: "fsl"; pct: number; sets: number; reps: number };
```

Behavior:

- `two_thirds`: keep top-set weight and reduce reps to about two-thirds.
- `drop_pct`: reduce load by the configured percentage and keep prescribed reps.
- `fsl`: use first-set-last percentage for fixed back-off volume.
- `none`: no computed back-off.

### 6.6 Progression Rules

Supported progression families:

- `step_load_sets`: add sets across a 3-week wave.
- `step_load_reps`: add reps across a wave.
- `load_ramp`: increase load while sets/reps remain stable.
- `intensify_drop_sets`: raise intensity while reducing sets.
- `top_set_backoff`: top set followed by computed back-off work.
- `plus_set_load`: increase load based on reps over baseline.
- `tm_band`: 5/3/1 style cycle-to-cycle TM adjustment.
- `double_progression`: accessory progression through a rep range.
- `explicit_table`: authored weeks only, used for DUP/wavy programs.

The app must store progression rules as data and store computed recommendations separately from program definitions.

## 7. Accessory Lifts As First-Class Citizens

Accessories are not checklist items. They need structured prescriptions, logs, history, and progression decisions.

Accessory requirements:

- Each accessory has a movement ID.
- Each accessory has a role, such as quad volume, upper back, triceps, hamstrings, trunk, grip, weak-point variation, or hypertrophy.
- Each accessory can have a rep range, target RIR/RPE, sets, rest guidance, and substitution group.
- The app shows the previous comparable performance before logging.
- The app recommends whether to repeat, add load, reduce load, or swap.
- Accessory history is queryable independently of main lifts.

Default accessory progression:

```text
If all prescribed sets hit the top of the rep range at target RIR or easier:
  recommend adding load next time.
Else if all prescribed sets hit at least the bottom of the range:
  recommend repeating the load.
Else if reps miss the bottom of the range or RIR is too low:
  recommend reducing load or repeating with fewer sets.
```

Example:

```text
Chest-supported row
Prescription: 4x8-12 @ RIR 2
Last time: 55 kg for 12, 12, 11, 10 @ RIR 2
Today target: 55 kg, beat 45 total reps
If result is 12, 12, 12, 12 @ RIR >= 2 -> next time 57.5 kg for 8-12
```

## 8. Workout UX

The primary user journey is logging today's workout on a phone.

### 8.1 Today Screen

Show:

- Program name.
- Current block, wave, and week.
- Session title and day.
- Estimated duration.
- Hardness label, such as easy, medium, hard, deload, volume, intensity, speed, recovery.
- Main lifts and accessories.
- Today's goals.
- Previous comparable performance for the top movement.
- Any pending progression decision from the previous cycle.

Primary actions:

- Start workout.
- Resume workout.
- Swap movement.
- View program.
- View history.

### 8.2 Live Session Screen

Design priorities:

- One-handed use.
- Large tap targets.
- Minimal typing.
- Fast load and rep editing.
- Works during poor gym connectivity.
- Clear distinction between target and actual.

For each movement slot, show:

- Planned movement.
- Performed movement, if substituted.
- Exercise role: main, variation, accessory, warm-up, event.
- Previous comparable performance.
- Target sets.
- Actual set inputs.
- Rest timer.
- Notes.
- Progression impact.

Set row fields:

- Target load.
- Target reps or rep range.
- Target RPE/RIR.
- Actual load.
- Actual reps.
- Actual RIR or RPE.
- Completed flag.
- Optional note.

### 8.3 Main Lift Logging

Main lift cards show:

- Anchor value: TM, e1RM, fixed 1RM, or manual.
- Target load and reps.
- Previous top set.
- Best recent comparable set.
- Estimated 1RM trend.
- Plate math.
- Plus-set baseline, if relevant.
- Back-off work generated from the top set, if relevant.
- Progression consequence preview.

Example preview:

```text
Top set target: 170 kg x 3+
Baseline: 3 reps
If you log 5 reps at RIR 2, this may qualify for STANDARD or DOUBLE progression depending on the rest of the cycle.
```

### 8.4 Accessory Logging

Accessory cards show:

- Target rep range.
- Last load and reps.
- Best recent load and reps.
- Target RIR/RPE.
- Progression hint.
- Substitution button.

Examples:

```text
Leg curl
Target: 3x12-15 @ RIR 2
Last: 42.5 kg x 15, 14, 13
Goal: reach 45 total reps before adding load
```

```text
Triceps pushdown
Target: 3x12-15 @ RIR 2
Last: 30 kg x 15, 15, 15
Recommendation: add load next time
```

### 8.5 Program View

Show:

- Current program timeline.
- Blocks.
- Waves.
- Weeks.
- Completed sessions.
- Upcoming sessions.
- Deload weeks.
- Progression decisions.
- Movement list.
- Accessory plan.

Program details should be readable without editing. V1 does not need a full visual builder.

### 8.6 History View

History must work for:

- Main lifts.
- Variations.
- Accessories.
- Substituted movements.
- Strongman/event movements, where applicable.

Useful views:

- Recent sessions.
- Best sets.
- e1RM chart.
- Volume by movement.
- Volume by category.
- Accessory progression state.
- Substitution history.

## 9. Substitutions

V1 supports manual substitution only.

Rules:

- A substitution never deletes the planned movement.
- The log stores both planned movement and performed movement.
- The performed movement gets its own history.
- The planned movement can still show that a substitution occurred.
- Progression decisions should be conservative when substitutions are used.

Substitution data:

```ts
type SubstitutionLog = {
  id: string;
  sessionId: string;
  slotId: string;
  plannedMovementId: string;
  performedMovementId: string;
  reason:
    | "equipment_missing"
    | "crowded_gym"
    | "preference"
    | "fatigue"
    | "other";
  note?: string;
  createdAt: string;
};
```

The V1 substitution reason UI must map directly to this enum. Do not add a `pain` or `injury` reason in V1; pain-specific handling belongs to the future pain-gating module.

Future LLM substitution suggestions should use:

- Movement category.
- Movement role.
- Required equipment.
- Available equipment.
- User history.
- Program intent.
- Contraindication modules, when later enabled.

The LLM should propose substitutions, not directly mutate the workout.

## 10. Cloud Accounts And Data Ownership

V1 uses cloud accounts as the canonical store.

Requirements:

- Users authenticate before starting a program.
- All programs, logs, anchors, and progression decisions are scoped to a user.
- The app should cache the active session locally while logging.
- If connectivity is lost, the user can keep logging and sync when back online.
- Duplicate set logs must be prevented during retry.
- Users can export their data later, though export does not need to ship in the first slice.

Recommended stack:

- Next.js.
- TypeScript.
- PostgreSQL.
- Prisma.
- Auth.js.
- PWA shell.
- Shared pure progression engine package.

## 11. Data Model

### 11.1 Users

```ts
type User = {
  id: string;
  email: string;
  name?: string;
  units: "kg" | "lb";
  rounding: number;
  createdAt: string;
  updatedAt: string;
};
```

### 11.2 Movements

```ts
type MovementDefinition = {
  id: string;
  name: string;
  category:
    | "squat"
    | "hinge"
    | "press"
    | "pull"
    | "single_leg"
    | "trunk"
    | "carry"
    | "event"
    | "isolation"
    | "mobility"
    | "other";
  equipment: string[];
  isCompetition?: boolean;
  variationOf?: string;
  defaultUnit?: "kg" | "lb" | "bodyweight" | "time" | "distance";
};
```

### 11.3 Sessions

```ts
type WorkoutSession = {
  id: string;
  userId: string;
  programInstanceId: string;
  plannedSessionId: string;
  status: "planned" | "in_progress" | "completed" | "skipped";
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  immutablePrescriptionSnapshot: SessionPrescriptionSnapshot;
  notes?: string;
};
```

Started workouts must snapshot prescriptions so later program edits do not rewrite historical workouts.

### 11.4 Exercise Logs

```ts
type ExerciseLog = {
  id: string;
  sessionId: string;
  slotId: string;
  plannedMovementId: string;
  performedMovementId: string;
  role: "main" | "variation" | "accessory" | "warmup" | "event";
  orderIndex: number;
  targetSummary: string;
  notes?: string;
};
```

### 11.5 Set Logs

```ts
type SetLog = {
  id: string;
  exerciseLogId: string;
  setIndex: number;
  targetLoad?: number;
  targetReps?: number;
  targetRepMin?: number;
  targetRepMax?: number;
  targetRpe?: number;
  targetRir?: number;
  actualLoad?: number;
  actualReps?: number;
  actualRpe?: number;
  actualRir?: number;
  completed: boolean;
  isTopSet?: boolean;
  isAmrap?: boolean;
  isBackoff?: boolean;
  note?: string;
  clientMutationId: string;
  createdAt: string;
  updatedAt: string;
};
```

`clientMutationId` prevents duplicate writes during offline retry.

### 11.6 Progression Decisions

```ts
type ProgressionDecision = {
  id: string;
  userId: string;
  programInstanceId: string;
  movementId: string;
  ruleId: string;
  scope: "session" | "week" | "wave" | "cycle" | "block";
  status: "pending" | "accepted" | "dismissed" | "superseded";
  inputSummary: string;
  recommendation: string;
  previousAnchor?: number;
  recommendedAnchor?: number;
  createdAt: string;
  resolvedAt?: string;
};
```

Progression decisions should be visible and auditable.

## 12. API Shape

V1 API endpoints:

```text
POST   /api/programs/import
GET    /api/programs/templates
POST   /api/programs/:templateId/start
GET    /api/programs/active
GET    /api/today

POST   /api/sessions
GET    /api/sessions/:id
PATCH  /api/sessions/:id
PATCH  /api/sessions/:id/sets/:setId
POST   /api/sessions/:id/substitute
POST   /api/sessions/:id/finish

POST   /api/progression/evaluate
PATCH  /api/progression/:decisionId

GET    /api/movements/:movementId/history
GET    /api/movements/:movementId/previous
GET    /api/history/recent
```

API rules:

- All endpoints require auth except public template discovery.
- All writes are user-scoped.
- Session set updates must be idempotent.
- Finish-session triggers progression evaluation.
- Progression evaluation can also be re-run manually.

## 13. Progression Engine

The progression engine should be a pure TypeScript package with no database access.

Inputs:

- Program template or instance snapshot.
- Anchor state.
- Workout logs.
- User settings.

Outputs:

- Set prescriptions.
- Back-off prescriptions.
- Suggested loads.
- Progression decisions.
- Validation warnings.

Core functions:

```ts
e1rm(weight, reps, rir): number
mround(value, increment): number
resolveAnchor(anchor, state): number
setWeight(anchorValue, intensity, rounding): number | SuggestedInput
expandWave(wave): WeekPrescription[]
computeBackoff(topSet, backoffRule, anchorValue, rounding): SetPrescription[]
evaluatePlusSet(rule, setLog, anchorValue, rounding): ProgressionDecision
evaluateTmBand(rule, cycleLogs, currentTm, rounding): ProgressionDecision
evaluateDoubleProgression(rule, exerciseHistory): ProgressionDecision
```

Validation rules:

- A set cannot be both `rep_range` and fixed reps unless explicitly represented.
- A percent intensity requires a numeric anchor.
- RPE prescriptions must allow actual load entry.
- Wavy/DUP programs must use explicit tables unless a known generator is provided.
- Back-off rows generated after a top set must reference the top set used.
- Accessories must have either fixed reps, rep range, or manual target.

## 14. Mobile Design Principles

- The Today screen is the home screen.
- Avoid landing-page behavior in the app shell.
- Use dense, scannable workout information.
- Make set logging possible with one hand.
- Use segmented controls for RPE/RIR when possible.
- Use steppers or quick chips for common load jumps.
- Show icons for repeated actions such as copy, timer, swap, complete, and history.
- Text must not overflow on small screens.
- The user should never need to open the full program spec mid-workout to know what to do.
- Mobile dark mode is an acceptable primary design direction for V1 if contrast remains high and the light theme remains supported.
- Bottom navigation and sticky actions must leave safe padding so set rows, recommendation actions, and form controls are never hidden behind device chrome.

## 15. First Implementation Slice

The first implementation slice should deliver:

- Authenticated user account.
- Program template list.
- Start Healthy 5/3/1 FSL.
- Start Bullmastiff as the first Bromley template fixture.
- Today screen.
- Live session logging for main lifts and accessories.
- Previous-performance lookup.
- Finish-session flow.
- 5/3/1 progression decisions.
- Bullmastiff plus-set decision.
- Accessory double-progression hints.

After that, add the remaining Bromley templates one by one as fixtures against the same DSL.

Recommended template rollout order:

1. Healthy 5/3/1 FSL.
2. Bullmastiff.
3. 70s Powerlifter.
4. Volume/Intensity.
5. Powerbuilder.
6. Minimalist.
7. DUP.
8. H/L/M.
9. M/R/S.
10. Pyramid.
11. Strongman.

This order proves the core engine with progressively harder cases while keeping early value high.

## 16. Test Plan

### 16.1 5/3/1 FSL Golden Tests

- Given deadlift TM 190 kg and rounding 2.5 kg:
  - Week 1 produces 122.5x5, 142.5x5, 162.5x5+, and FSL 122.5.
  - Week 2 produces 132.5x3, 152.5x3, 170x3+, and FSL 122.5.
  - Week 3 produces 142.5x5, 162.5x3, 180x1+, and FSL 122.5.
  - Week 4 produces 77.5x5, 95x5, 115x5, and no FSL.
- TM band tests:
  - Missed top-set minimum -> reset.
  - Any RIR 0-1 -> hold.
  - All minimums at RIR >= 2 -> standard.
  - All minimums plus at least 2 extra reps at RIR >= 2 -> double.

### 16.2 Bromley Golden Tests

- 3-week waves preserve easy/medium/hard structure.
- Step-loaded waves increase sets or reps.
- Intensifying waves raise intensity while reducing volume.
- Weight does not drop within a wave unless the template explicitly says so.
- RPE targets do not force a final load.
- Explicit DUP/H/L/M tracks can reference the same movement with different prescriptions.

### 16.3 Bullmastiff Tests

- Plus-set baseline is stored.
- Extra reps calculate next-load recommendation from 1% of anchor.
- Recommendation rounds to user increment.
- Plus-set decision is stored as pending and does not silently mutate history.
- Variation and accessory progression can coexist with main plus-set progression.

### 16.4 Accessory Tests

- Hitting top of range on all sets at target RIR recommends adding load.
- Hitting only part of range recommends repeating.
- Missing the bottom of range recommends reduce or repeat conservatively.
- Accessory history is independent from main-lift history.

### 16.5 Substitution Tests

- A substituted exercise stores planned and performed movement IDs.
- Planned movement history shows the session as substituted.
- Performed movement history receives the actual set data.
- Progression recommendations are conservative after substitution.

### 16.6 Cloud And Sync Tests

- User A cannot read or write User B data.
- Active session can be resumed after refresh.
- Duplicate `clientMutationId` does not create duplicate set logs.
- Offline set logs sync without losing order.
- Finishing a session is idempotent.

## 17. Future Modules

These should be designed as modules, not baked into the core.

### 17.1 Pain Gating

Future module for pain rules, injury-specific substitutions, ladder progression, and automatic workout modification. Excluded from V1.

### 17.2 Readiness

Future module for sleep, HRV, resting heart rate, soreness, motivation, and bar-speed flags. V1 may collect notes but should not automate load changes from readiness.

### 17.3 LLM Substitutions

Future module for equipment-missing scenarios. The LLM should receive structured context and return a proposed substitution with rationale. The user must confirm before the workout changes.

### 17.4 Calendar Export

Future module to push planned sessions and deloads into calendar systems.

### 17.5 Third-Party Tracker Export

Future module for Hevy, Strong, CSV, or spreadsheet export. These are lossy because flat trackers cannot represent all periodization metadata.

## 18. Acceptance Criteria

V1 is successful when:

- A user can create an account and start Healthy 5/3/1 FSL.
- A user can start at least Bullmastiff from the Bromley templates.
- The Today screen clearly shows what to do.
- Main lifts and accessories can both be logged quickly on mobile.
- Previous comparable performance is visible before logging each movement.
- 5/3/1, Bullmastiff, and accessory progression recommendations are correct and auditable.
- Substitutions preserve planned and performed movement history separately.
- The app can resume an interrupted workout without duplicate set logs.
- Pain gating and LLM features are not required for the core app to work.

## 19. Final Assumptions

- The athlete is assumed healthy in V1.
- Pain gating is intentionally excluded.
- LLM features are future-facing only.
- Cloud accounts are canonical from V1.
- The requested spec filename is `final-app-spec.md`.
- Official Bromley prefabricated templates are seeded; a custom "Bromley comeback" named template is not seeded.
