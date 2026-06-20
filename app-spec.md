# Strength Program Engine — Application Spec

A **generic** engine for periodized strength programs, built on Alexander Bromley's
*Base Strength* methodology (SRN; 3-week waves; base → peak). One declarative program file
(`program.json`) is the single source of truth; pure compute functions price every set; renderers
flatten it to a spreadsheet (today) or other trackers (later).

This document is the **design-of-record for the generic engine**. It supersedes
[`app/SPEC.md`](app/SPEC.md), which remains accurate as the *Iteration-0 / xlsx-renderer* notes
for the current single-athlete build. The methodology source is
[`references/base-strength-by-bromley.md`](references/base-strength-by-bromley.md); the athlete's
original plan is [`references/Ultimate-workout-plan.md`](references/Ultimate-workout-plan.md).

> **Status.** This is a *design spec only*. The current code (`app/program.json` v1.0,
> `app/generate-xlsx.mjs`) is hardcoded to one athlete and still works as-is. Migrating it to the
> schema below (v2.0), extracting the compute core, and making the renderer generic are
> **future work, scoped in §6–7 and not yet implemented.**

---

## 1. Purpose & scope

**Why.** Today's program is welded to one athlete: a returning powerlifter with a recovering
shoulder doing martial arts — fixed deadlift/squat/bench lifts, shoulder/pain gating, ACWR
sport-load tracking, and a personal weekly schedule, all baked into `program.json` and the
renderer. The methodology and the math are sound and worth keeping. The *coupling* is not.

**Goal.** Generalize the engine so the same code expresses:
- the athlete's own comeback plan — **without** the personal shoulder restrictions baked into the core, and
- other templates from Bromley's book (70s Powerlifter, Bullmastiff, DUP, H/L/M, …).

**In scope.** A program DSL (this doc), the compute-core generalization it implies, and the
renderer changes to drive off it. Personal features (shoulder gating, sport load, mobility) become
**optional opt-in modules**, off by default.

**Out of scope / deferred.** Anything that requires *generating* a program from prose intent, or
*deciding* a load the athlete must feel out in the moment. These are catalogued plainly in
[§8 — Hard to support / plan later](#8-hard-to-support--plan-later) so they can be planned in a
later pass rather than silently dropped.

---

## 2. Concepts & vocabulary

The schema encodes this shared language; understanding it makes the field names obvious.

- **SRN** — Bromley's diagnostic lens: **S**pecificity, **R**ecovery, **N**ovelty. The reasons a
  program does or doesn't drive progress. Carried as a label per block, for the athlete's benefit.
- **Macrocycle → block → wave → week → set** — the nesting. A **block** (a.k.a. phase/mesocycle)
  is weeks of similar character. A **wave** is Bromley's atomic unit: **3 weeks, easy → medium →
  hard** (RPE 7 → 7–8 → 8–9), weight never dropping within the wave. A **week** holds the
  prescribed **sets** for each tracked movement.
- **Base vs Peak phase.** *Base* = broad exercise selection, high volume, ~55–80%, RPE ≤ 8, sets
  *increase*. *Peak* = narrow selection, low volume, ~80–100%, RPE 8–9, sets *decrease*.
  *Transition* is the bridge.
- **Three periodization models.** *Linear* (volume ↓, intensity ↑ smoothly over ~12 wk),
  *Block* (Accumulation → Transmutation → Realization), *Wavy/Undulating* (volume and intensity
  uncoupled — "looks like noise" zoomed in).
- **Anchor.** The number percentages are taken against: a fixed tested **1RM**, a **training max**
  (a % of 1RM), or a **rolling working e1RM** re-estimated from RPE-8 top sets.
- **Autoregulation.** Letting the day decide: **RPE** (pick the weight that hits a target effort),
  **AMRAP** (fixed load, as many reps as possible), or plain **percentage** (sets across).
- **Back-off.** Lighter volume after a heavy top set: *2/3 method*, *−10% drop*, *FSL* (first-set-
  last fixed %), or *none*.

---

## 3. Architecture

```
program.json   ──►   core.mjs            ──►   renderers / exporters
(DSL, source         (pure functions:          ├─ xlsx          (DONE — generate-xlsx.mjs, exceljs)
 of truth)            anchor/intensity/         ├─ Strong CSV    (history flatten — lossy)
                      backoff/progression)      ├─ Hevy routine  (Pro API — lossy on AMRAP)
                                                └─ print sheet   (manual re-entry)
```

**One source of truth.** `program.json` fully describes the periodized program. Everything
downstream is a pure function of it plus the athlete's seeds. This is deliberately the schema that
no tracker app stores — periodization metadata (blocks → waves → weeks → sets with %, RPE caps,
AMRAP/plus flags, back-off method). Trackers hold flat routines or history, so we keep the
structured program here and **flatten on export** (and accept the documented losses in §8).

**Tech stack.** Node + ESM today (`.mjs`), zero build step; migrate to TypeScript when a second
consumer (web UI, Hevy adapter) makes shared types pay for themselves. Unchanged from `app/SPEC.md`.

**Design principles for the DSL.**
1. **Reuse the existing shapes.** Keep `blocks → tracks → waves → weeks`; keep the
   `e1rm / mround / setWeight / tm / plusSetNext / amrapMax / acwr` core. Add only what's needed.
2. **Tagged unions for the three things that vary:** anchor, intensity, progression. A
   `type`/`mode` discriminator with mode-specific params.
3. **Explicit or generated weeks.** A wave's weeks are given explicitly (`weeks[]`, as today) or
   produced by a `generate{}` sugar that *expands to the same `weeks[]` shape* — so the core and
   renderer only ever see explicit weeks.
4. **Movements are a registry, not lift keys.** Sessions reference movement IDs; a movement can
   appear on several days with different prescriptions (this unlocks DUP / H-L-M).
5. **Personal features are namespaced opt-in `modules{}`.** Absent ⇒ disabled.

---

## 4. The program DSL (schema v2.0)

Today's `program.json` is already ~80% of a generic DSL — the right bones, with single-athlete
coupling concentrated in five places: (1) lift identity is implicit in `seeds`/`tm_pct`/
`liftsOrder`; (2) intensity mode is implicitly "percent"; (3) progression-between-waves is prose
(`repeatIncrementPct`); (4) back-off is a display-only magic string; (5) shoulder/ACWR/mobility are
baked in at top level. The schema below lifts exactly those five.

### 4.1 Top-level shape

```jsonc
{
  "schemaVersion": "2.0",
  "meta": { "title": "...", "athlete": "...", "methodology": "...", "source_doc": "..." },

  "config": {
    "units": "kg",
    "rounding": 2.5,
    "amrapCoeff": { "2":1.08, "3":1.13, "4":1.17, "5":1.20, "6":1.23, "8":1.30, "10":1.33 },
    // Bromley's sets×reps → % table. Used ONLY by intensity.mode "table" (and as the
    // suggestion source for mode "rpe"). Keyed by reps → [easy, med, hard, max].
    "percentTable": {
      "10": [60,65,70,75], "8": [65,70,75,78], "6": [74,77,80,83],
      "5":  [76,79,83,85], "4": [79,82,85,87], "3": [82,85,88,90],
      "2":  [85,90,95,94], "1": [91,94,97,100]
    }
  },

  // (1) MOVEMENT REGISTRY — arbitrary movements, first-class
  "movements": {
    "squat":     { "label": "Back Squat",     "category": "squat", "isCompetition": true },
    "bench":     { "label": "Bench Press",    "category": "press", "isCompetition": true },
    "deadlift":  { "label": "Deadlift",       "category": "hinge", "isCompetition": true },
    "frontSquat":{ "label": "Front Squat",    "category": "squat", "variationOf": "squat" }
  },

  // (2) ANCHORS — tagged union per movement; program-level default for brevity
  "anchorDefault": "rolling_e1rm",            // rolling_e1rm | training_max | fixed_1rm
  "anchors": {
    "squat":    { "type": "rolling_e1rm", "seed": { "weight":170, "reps":5, "rir":2 } },
    "bench":    { "type": "rolling_e1rm", "seed": { "weight":100, "reps":5, "rir":3 } },
    "deadlift": { "type": "rolling_e1rm", "seed": { "weight":210, "reps":1, "rir":1, "confirmed":true } }
  },

  // (3) SCHEDULE — days → sessions → movement slots; trackRef unlocks DUP / H-L-M
  "schedule": {
    "patternWeeks": 1,                        // 1 = same layout every week
    "days": [
      { "day": "Mon", "title": "Heavy Pull", "hard": true,
        "slots": [ { "movement": "deadlift", "trackRef": "deadlift" } ] },
      { "day": "Wed", "title": "Squat",
        "slots": [ { "movement": "squat", "trackRef": "squat" } ] }
    ]
  },

  "blocks": [ /* §4.4 */ ],

  // carried over, now keyed by movement id
  "variationLibrary": { "deadlift": [ { "movement": "Deficit pull", "job": "Off-the-floor speed" } ] },
  "accessories": { "Mon": [ { "movement": "RDL", "setsReps": "3x8-10" } ] },

  // (5) OPTIONAL MODULES — absent ⇒ disabled (§5)
  "modules": { /* painGating, loadTracking, mobility, readiness, concurrentSport */ }
}
```

### 4.2 Anchor (tagged union, per movement)

```jsonc
"anchors": {
  "<movementId>": {
    "type": "rolling_e1rm" | "training_max" | "fixed_1rm",
    // rolling_e1rm: anchor = working e1RM, re-estimated from RPE-8 tops (current behavior)
    // training_max: anchor = mround(workingE1rm * tmPct); pct means "% of TM"
    // fixed_1rm:    anchor = oneRM (tested), never auto-updated
    "tmPct": 0.85,                            // training_max only
    "oneRM": 230,                             // fixed_1rm only
    "seed": { "weight":170, "reps":5, "rir":2, "confirmed":false }
  }
}
```

This single field is the switch that lets the **same block table** drive a 5/3/1 "% of TM" program
and the comeback "% of working e1RM" program with no other change. It absorbs today's `tm()`
function as one branch of the resolver.

### 4.3 Intensity (tagged union, per week-set) — the central generalization

Today every week-set is implicitly percent-of-anchor with `rpe` as an annotation. Make intensity a
first-class tagged union:

```jsonc
"weeks": [
  // (a) PERCENT of anchor — optionally RPE-capped (today's default behavior)
  { "sets":3, "reps":8, "intensity": { "mode":"percent", "pct":62.5, "rpeCap":7 } },

  // (b) PERCENT-from-table — no explicit pct; look up percentTable[reps][weekIndex]
  { "sets":3, "reps":5, "intensity": { "mode":"table" } },

  // (c) RPE-target — weight is NOT derivable; reps fixed, effort drives load (§8 #1)
  { "sets":1, "reps":10, "intensity": { "mode":"rpe", "target":7 }, "backoffRef":"two_thirds" },

  // (d) AMRAP — fixed load (% of anchor), open reps, +X% next wave-repeat
  { "sets":1, "reps":"AMRAP", "intensity": { "mode":"amrap", "pct":65 } }
]
```

The v1.0 `plus:true` ("the last set is a capped AMRAP / plus-set on top of percent working sets")
becomes the explicit flag `"amrapTopSet": true` on a percent set — keeping the Bullmastiff / 5-3-1
behavior without overloading a boolean.

### 4.4 Block / track / wave (shape preserved)

```jsonc
{
  "id": "A", "name": "Base / Accumulation",
  "phase": "base",                    // base | transition | peak  (label)
  "periodization": "linear",          // linear | block | wavy     (label)
  "weeks": 12,
  "srn": "Recovery + Novelty (widen the base)",
  "repeatPolicy": { "incrementPctOf1RM": 2.5, "maxRepeats": 3 },   // Bromley "+2% and run again"
  "tracks": {
    "deadlift": {
      "anchorRef": "deadlift",
      "maxSets": 4,                                  // optional volume cap
      "backoff": { "method": "two_thirds" },         // track default; a week may override
      "waves": [
        { "reps": 8, "weeks": [ /* week-sets per §4.3 */ ] },
        // OR generated (§4.5):
        // { "reps": 6, "generate": { "kind":"step_load_sets", "startSets":3,
        //                            "pct":[67.5,70,72.5], "rpeCap":[7,7.5,8] } }
      ]
    }
  }
}
```

### 4.5 Progression as data

Two independent axes, both declarative.

**Within a wave (week → week)** — either explicit `weeks[]`, or a `generate{}` that expands to it:

```jsonc
"generate": {
  "kind": "step_load_sets"      // add a set each week (Base volumize: 3→4→5 sets)
        | "step_load_reps"      // add a rep each week (3x10 → 3x11 → 3x12)
        | "intensify_drop_sets" // peel a set each week (Peak: 5x3 → 4x3 → 3x3)
        | "rpe_ramp"            // same reps, RPE 7 → 8 → 9
        | "load_ramp",          // same sets/reps, pct climbs
  "reps": 8, "startSets": 3, "pct": [62.5,65,67.5], "rpeCap": [7,7.5,8]
}
```

**Between wave-repeats** — `repeatPolicy{ incrementPctOf1RM, maxRepeats }`: "+2% and run the wave
again" until `maxRepeats`.

**Autoreg feedback** — generalizes the v1.0 plus-set rule:

```jsonc
"autoregRule": { "kind": "plus_set_load", "stepPctOf": "e1rm", "stepPct": 1, "stopAtRpe": 8 }
// next load = this load + max(0, repsDone - baseline) * mround(stepPct% * anchor, rounding)
```

### 4.6 Back-off (enum + params)

Replaces v1.0's display-only magic strings (`"two_thirds_or_minus10"`) with a computed enum:

```jsonc
"backoff": { "method": "two_thirds" }            // keep top weight, reps → round(reps * 2/3)
"backoff": { "method": "drop_pct", "pct": 10 }   // −10% of anchor, keep reps
"backoff": { "method": "fsl", "pct": 65 }        // fixed % of anchor (5/3/1 FSL), prescribed reps
"backoff": { "method": "none" }
```

This is a net-new capability the DSL enables: the renderer can now print computed back-off rows
beneath a top set, which v1.0 could only describe in prose.

---

## 5. Optional modules (`modules{}`, off by default)

Everything personal lives here. A pure Bromley template omits `modules` entirely (or includes only
`loadTracking` if wanted). The athlete's plan re-enables what it needs. **Nothing in the core or
the block tables references "shoulder" anymore.**

```jsonc
"modules": {
  "painGating": {
    "appliesTo": ["bench"],
    "gate": "No press load until physio clearance (pain-free overhead flexion, restored IR).",
    "ladders": { "bench": ["isometrics","landmine","DB floor press","neutral-grip DB","machine","incline","barbell bench"] },
    "excludeFromAutoreg": ["bench"],            // bench gets no plus-set / AMRAP
    "painRule": "Brief low-grade OK; spike >5/10 or worse next morning → regress one rung; persists >2-3 days or 2 regressions or red flag → pause, re-consult physio.",
    "prehabDaily": "Face pulls + end-range ER, serratus/wall slides, prone Y/T: 2-3 x 15-25.",
    "renderTab": "Mobility & Splits"
  },
  "loadTracking":    { "metric": "acwr", "band": [0.8, 1.3], "renderTab": "Weekly Load" },
  "concurrentSport": { "sessions": ["MA","running"], "hardEffortsPerWeek": "3-4; never two within 24h" },
  "mobility":        { "metrics": ["knee-to-wall","front-split"], "renderTab": "Mobility & Splits" },
  "readiness":       { "markers": ["sleep","HRV","RHR"], "renderTab": "Readiness" }
}
```

The v1.0 top-level `shoulder{}`, the bench `gated:true` flag, and `acwr_band` move **verbatim**
into these objects. The core consults `painGating.excludeFromAutoreg` (so bench is never given a
plus-set) and renders the ladder/rule, but it does **not** decide rung changes — that stays
athlete-driven (see §8 #6).

---

## 6. Compute core

Pure functions, mirrored verbatim as in-sheet formulas (`MROUND`, `IF`) so the spreadsheet and any
future app agree to the kilogram. Currently inlined in `generate-xlsx.mjs`; **extract to `core.mjs`
as part of the migration (future work).**

| Function | Status | Definition / change |
|---|---|---|
| `e1rm(w, reps, rir)` | unchanged | `w * (1 + (reps + rir) / 30)` (Epley + RIR) |
| `mround(x, m)` | unchanged | `round(x/m)*m` |
| `amrapMax(weight, reps)` | unchanged | `weight * amrapCoeff[reps]` (cross-check on e1RM) |
| `acwr(week, prior4[])` | unchanged | `week / mean(prior4)`; flag `>1.5` |
| `anchorValue(movement)` | **new** | resolver dispatching on `anchors[m].type`: rolling_e1rm → workingE1rm; training_max → `mround(workingE1rm * tmPct)`; fixed_1rm → `oneRM`. Absorbs old `tm()`. |
| `setWeight(anchorValue, intensity)` | **generalize** | branch on `intensity.mode`: `percent` → `mround(anchor*pct/100)` (today); `table` → look up `percentTable[reps][weekCol]` then same; `rpe` → return `{ suggested, input:true }` (never a hard kg); `amrap` → fixed `mround(anchor*pct/100)`, reps open. |
| `backoff(topWeight, topReps, anchorValue, method)` | **new** | implements `two_thirds` / `drop_pct` / `fsl` / `none`. Replaces magic strings. |
| `applyAutoreg(rule, load, baseline, repsDone, anchorValue)` | **rename** of `plusSetNext` | driven by `autoregRule`; the v1.0 1%-per-rep is one instance. |
| `expandWave(wave)` | **new** | if `wave.generate` present, emit explicit `weeks[]` (the §4.5 kinds); else pass `weeks` through. Keeps generation isolated and testable; everything downstream sees explicit weeks only. |

Net: **two new small functions, one new generator, one rename, one branched** — the four math
primitives untouched.

---

## 7. Renderers / exporters

### 7.1 xlsx — primary (exists; needs generalizing)

`generate-xlsx.mjs` is already mostly data-driven, but assumes exactly three lifts and three
blocks. To go generic (**future work**):

1. **Drive off `movements` + `schedule` + `anchors`,** not the hardcoded `[deadlift,squat,bench]`.
   The Setup tab shows a TM column only for `training_max` anchors. Anchor cell references resolve
   via a movement→row map, not the positional `4+i`.
2. **`weightCell(intensity, anchorRef)`** instead of `(lift, pct)`: `percent`/`table` → the live
   `MROUND(anchor × %, rounding)` formula (as today); `rpe` → a *suggested* value plus an adjacent
   yellow "actual" input cell; `amrap` → fixed load + a "reps: AMRAP (stop RPE n)" note.
3. **`renderPlan` iterates `block.tracks` generically,** calling `expandWave` per wave. Tab
   partitioning becomes **one tab per block** (phase shown in the banner) instead of the fixed
   "Base Plan / Peak Plan" split.
4. **Computed back-off rows** beneath top sets via `backoff()` (new capability).
5. **Optional tabs render only if the module exists** — `Plus-Set Autoreg`, `Weekly Load (ACWR)`,
   `Readiness`, `Mobility & Splits` appear only when the matching `modules.*` key is present. A
   generic Bromley program with no `modules` yields a leaner workbook — the clearest visible proof
   that the personal stuff is now opt-in.
6. **Schedule-driven weekly layout** so a movement appearing in several tracks (DUP) renders
   grouped by `day → slot` (Mon: Squat-H, Bench-M, DL-L), not only by movement.

The exceljs helpers and styling survive unchanged; they're just fed by generic iteration.

### 7.2 Strong CSV / Hevy / print — flatten-on-export

Tracker-agnostic *history/routine flattening*: one prescription week → one row/set. These lose all
periodization metadata, and AMRAP/plus-set semantics have no native representation — flatten to a
fixed load + the baseline rep target with "AMRAP — stop at RPE 8" pushed into Notes (see §8 #4).
Treat as convenience, not the system of record. Hevy needs a Pro key and `exercise_template_id`
resolution. Unchanged in priority from `app/SPEC.md`.

---

## 8. Hard to support / plan later

The methodology that is hard or infeasible to model **declaratively**, ranked most → least
problematic. **None of these block the project.** Each is stated with a recommended treatment so it
can be planned in a later pass — nothing here is being built now.

| # | Bromley logic | Why it's hard | Recommended treatment (later) |
|---|---|---|---|
| 1 | **Pure RPE autoregulation** (`mode:"rpe"`) | The kg depends on how the athlete feels *that day*; no formula can output it ahead of time. | **Partial — suggest + collect.** Render a *suggested* load from `percentTable[reps][rpeColumn]` plus a yellow "actual" input cell, exactly like the existing plus-set tab. The table→RPE mapping is approximate; document it as such. |
| 2 | **Wavy / Soviet "noise" programming** (Sheiko-style tonnage distribution) | Bromley himself calls it "just noise" and declines to compute the distribution; there is no closed-form generator. | **Explicit-table-only.** `periodization:"wavy"` is a label; its weeks MUST be hand-authored (no `generate`). The engine validates "weight never drops within a wave" and can surface weekly tonnage, but will not synthesize the pattern. |
| 3 | **DUP / H-L-M scheduling constraints** ("don't stack two Heavy days," "space hard efforts ≥24h") | Representation is solved by `trackRef`; the *constraint* is a cross-track optimization, not a per-set rule. | **Represent now, lint later.** Author the H/M/L assignment by hand (a few cells). Add a *lint warning* (not error) when two `hard` slots collide on a day or land <24h apart. No auto-scheduling. |
| 4 | **AMRAP semantics on Hevy/Strong export** | Flat trackers carry only `weight × reps`; AMRAP/plus-set don't exist natively. | **Lossy export.** Emit fixed load + baseline rep target, push "AMRAP — stop RPE 8" into Notes. AMRAP stays first-class internally and in the xlsx. |
| 5 | **Bar-speed / readiness autoregulation** | Velocity/HRV-gated load is a runtime decision needing input streams the program file can't hold. | **Out of scope for the engine.** Keep `modules.readiness` + the Session-Log bar-speed column as signals the athlete reviews; deload `reactiveTriggers` stay as human-read rules-as-data. No automated load change. |
| 6 | **Pain/rehab gating idiosyncrasy** (the shoulder ladder) | Highly personal, non-numeric; rung progression is a state machine driven by subjective pain. | **Partial via `painGating` module.** Represent the ladder + exclusion set + prose rule; the engine respects `excludeFromAutoreg` and renders it, but the athlete drives rung changes. Cleanly off for generic programs. |
| 7 | **True-1RM realization / meet attempt selection** | Opener/2nd/3rd selection and taper are meet-specific heuristics outside Bromley's core wave math. | **Out of scope (v1).** Represent realization as ordinary `peak` waves topping at `mode:"rpe",target:9` or high-% singles; keep a `noTrue1RM` safety flag. Attempt-selection can be a later module. |

**One-line summary for review:** the only thing the engine *cannot generate* is Soviet wavy
distributions (store them as tables), and the only thing it *cannot predict* is same-day RPE /
bar-speed load (suggest + collect). Both are inherent to the methodology, not to the tool.

---

## 9. Worked encodings (proof of breadth)

Short sketches in the v2.0 schema, each exercising different features. These double as the
canonical fixtures for the future migration.

### 9.1 The comeback plan (the existing program, migrated)

Near-mechanical migration of today's file. Block A deadlift wave 1:

```jsonc
{ "id":"A", "phase":"base", "periodization":"linear", "weeks":12,
  "repeatPolicy": { "incrementPctOf1RM": 2.5 },
  "tracks": { "deadlift": {
    "anchorRef":"deadlift", "maxSets":4, "backoff": { "method":"two_thirds" },
    "waves": [ { "reps":8, "weeks":[
      { "sets":3,"reps":8,"intensity":{"mode":"percent","pct":62.5,"rpeCap":7} },
      { "sets":3,"reps":8,"intensity":{"mode":"percent","pct":65,  "rpeCap":7.5} },
      { "sets":4,"reps":8,"intensity":{"mode":"percent","pct":67.5,"rpeCap":8} } ] } ] } } }
```

Bench is an ordinary `rolling_e1rm` movement; its AMRAP exclusion and rehab ladder live entirely in
`modules.painGating` — no special schema. Flipping the three anchors to `training_max` + a
`backoff:{method:"fsl",pct:65}` re-expresses the athlete's *original* 5/3/1-FSL plan, proving the
anchor union does its job. **Exercises:** per-movement anchor, percent+rpeCap, `amrapTopSet`,
`maxSets`, `two_thirds` backoff, `painGating` module, `repeatPolicy`.

### 9.2 70s Powerlifter (linear, sets-across, training_max) — contrast #1

One main lift/day, volumize-then-intensify. Base phase main movement:

```jsonc
{ "id":"70s-base", "phase":"base", "periodization":"linear", "weeks":9,
  "repeatPolicy": { "incrementPctOf1RM": 3 },
  "tracks": { "bench": {
    "anchorRef":"bench", "backoff": { "method":"none" },
    "waves": [
      { "reps":10, "generate": { "kind":"step_load_sets", "startSets":3, "pct":[60,62.5,65] } },
      { "reps":8,  "generate": { "kind":"step_load_sets", "startSets":3, "pct":[65,67.5,70] } },
      { "reps":5,  "generate": { "kind":"step_load_sets", "startSets":3, "pct":[70,72.5,75] } }
    ] } } }
```

Peak phase uses `intensify_drop_sets` (5×3 → 3×3) with `amrapTopSet` on the max-rep week. No
`modules` → leaner workbook. **Exercises:** `training_max`/`fixed_1rm` anchor, `step_load_sets` /
`intensify_drop_sets`, sets-across (no backoff), one-main-lift schedule.

### 9.3 DUP (wavy, same lift 3×/week) — contrast #2, the scheduling stress test

Squat/bench/DL each appear Mon/Wed/Fri at Heavy/Medium/Light — expressed via three `trackRef`s per
movement:

```jsonc
"schedule": { "days": [
  { "day":"Mon", "slots":[ {"movement":"squat","trackRef":"squat_H"},
                           {"movement":"bench","trackRef":"bench_M"},
                           {"movement":"deadlift","trackRef":"deadlift_L"} ] },
  { "day":"Wed", "slots":[ {"movement":"squat","trackRef":"squat_M"}, /* … */ ] },
  { "day":"Fri", "slots":[ {"movement":"squat","trackRef":"squat_L"}, /* … */ ] }
] },
"blocks":[ { "id":"dup", "periodization":"wavy", "weeks":6, "tracks": {
  "squat_H": { "anchorRef":"squat", "backoff": { "method":"drop_pct","pct":10 },
    "waves":[ { "reps":3, "weeks":[
      { "sets":1,"reps":3,"intensity":{"mode":"rpe","target":7} },
      { "sets":1,"reps":3,"intensity":{"mode":"rpe","target":8} },
      { "sets":1,"reps":3,"intensity":{"mode":"rpe","target":9} } ] } ] },
  "squat_M": { "anchorRef":"squat", "waves":[ /* ~70% × 8 */ ] },
  "squat_L": { "anchorRef":"squat", "waves":[ /* ~60% × 12 */ ] }
} } ]
```

**Exercises:** the `trackRef` indirection (the key move that decouples "movement" from "its
prescription today" — this is what also makes **H/L/M** and Texas-Method expressible),
`mode:"rpe"` (with §8 #1 suggest+collect), `drop_pct` backoff, `periodization:"wavy"` (explicit
tables only).

### 9.4 Bullmastiff (top-set + back-off, plus-sets) — autoreg stress test

One main `amrapTopSet` track + one high-volume variation track per day:

```jsonc
"tracks": { "squat": {
  "anchorRef":"squat", "backoff": { "method":"fsl","pct":70 },
  "autoregRule": { "kind":"plus_set_load", "stepPctOf":"e1rm", "stepPct":1, "stopAtRpe":8 },
  "waves":[ { "reps":5, "weeks":[
    { "sets":1,"reps":5,"intensity":{"mode":"percent","pct":80},"amrapTopSet":true },
    { "sets":1,"reps":5,"intensity":{"mode":"percent","pct":82.5},"amrapTopSet":true },
    { "sets":1,"reps":5,"intensity":{"mode":"percent","pct":85},"amrapTopSet":true } ] } ] } }
```

**Exercises:** `amrapTopSet`, `applyAutoreg` / `plus_set_load`, `fsl` backoff. (The athlete's plan
already uses this rule, so it's well-trodden.)

---

## 10. Migration & versioning (future work)

1. **`schemaVersion` 1.0 → 2.0.** Today's file is v1.0; the schema above is v2.0.
2. **Mechanical migration of `app/program.json`:** lift `seeds`→`anchors`, infer `movements`,
   wrap each `weekSet.pct`→`intensity{mode:"percent"}`, `plus`→`amrapTopSet`, the magic-string
   backoffs → `backoff{}` objects, and `shoulder{}`/`acwr_band` → `modules{}`. The §9.1 numbers
   stay identical — this is a re-shaping, not a re-design.
3. **Extract `core.mjs`** from `generate-xlsx.mjs` (the §6 functions) so the renderer and any future
   consumer share one implementation.
4. **JSON-schema file + CI validation** of `program.json` against v2.0.
5. **Generalize the renderer** per §7.1.

Sequencing and effort for the above are a **separate planning pass**, not part of this spec.

---

## 11. Open decisions (parked)

To be settled in a later pass; defaults noted are non-binding suggestions:

- **Percentage *ranges* (e.g. "60–65%").** Store a single midpoint `pct` (deterministic weight
  cell) or `pctRange:[60,65]` with an editable cell? *Default: midpoint, range in the note.*
- **Accessories as registered movements vs free-text.** Registering enables future Hevy
  template-ID mapping; free-text is less ceremony. *Default: register mains + variations, leave
  accessories free-text.*
- **Plan tab per phase vs per block.** *Default: one tab per block, phase in the banner.*
- **How far to take RPE suggestion.** Suggest-from-table then input, or pure input with no number?
  *Default: suggest-then-input.*
- **Keep the original 5/3/1-FSL cycle bands** (RESET / HOLD / STANDARD+ / DOUBLE+ from
  `references/Ultimate-workout-plan.md`) as a named `autoregRule` kind, or as the comeback
  program's bespoke module? They're more elaborate than the plus-set rule and apply only to
  `training_max` anchors. *Default: model later as a named autoreg kind if a second program wants
  them.*
```
