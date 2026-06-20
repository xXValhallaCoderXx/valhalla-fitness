# Base-Strength Comeback — A Bromley-Native Rebuild

> **Document purpose & audience.** This is a complete, self-contained training specification for a returning powerlifter, rebuilt natively around **Alexander Bromley's *Base Strength* (Program Design Blueprint, 2020)**. It supersedes the earlier 5/3/1-FSL spec (`references/Ultimate-workout-plan.md`); 5/3/1-FSL survives here only as **one optional peaking engine** (§7). The document is written to be handed to **another agent** (which can generate spreadsheets via `exceljs`/`openpyxl` and, optionally, calendars or app exports) and to keep the **athlete** in full context of the logic. Every percentage and rule below resolves against the seed inputs in §4 without further coaching context.
>
> The injury, shoulder, splits, sport, sleep and nutrition protocols are inherited largely intact from the prior research pass (`/home/odin/workout-plan/comeback-plan-v2.md`); this document re-derives the **training engine** from Bromley and references those protocols where they are unchanged. See [§15 Sources](#15-sources).

---

## 0. Quick start for the executing agent

Before generating anything, **confirm these inputs with the athlete** (only the first three are blockers):

1. **Squat** — recent solid top set (weight × reps × RIR). *Seeds squat e1RM.* (Working default below: 170×5@2.)
2. **Bench** — recent **pain-free** top set (weight × reps × RIR) + how the shoulder felt. *Seeds bench e1RM, or keeps bench in the rehab ladder with no load anchor.* (Working default: 100×5@3.)
3. **Training start date, session time, time zone.** *For the optional calendar.*
4. Deadlift seed is pre-filled (210×1, ~1 rep left → e1RM ≈ 224). Confirm whether that single had ~1 left (default) or was a true grinder (0 left → e1RM ≈ 217).
5. Physio/shoulder clearance status (gates pressing load and snatch-grip pulls — §9).

Then build, in order: **(a)** the spreadsheet per [§13](#13-build-spec-spreadsheet) → **(b)** optionally the calendar per [§14](#14-build-spec-calendar-optional). A machine-readable config is in [§12](#12-machine-readable-config-json).

---

## 1. Athlete profile & the Base/Peak diagnosis

| Attribute | Value |
|---|---|
| Age | 40 |
| Bodyweight | ~70 kg |
| History | Lifelong; **formerly elite relative strength** (peak 270 kg axle DL, 250 kg conventional @ 70 kg) |
| Current status | **Mid-comeback**, training consistently for weeks/months (NOT a cold returner) |
| Recent benchmark | **210 kg conventional DL, tough single** → e1RM ≈ 224 (~85–88% of old peak) |
| Bench | "Coming back," below old level |
| Injury | Recovering shoulder; pressing **symptom-gated**, no overhead |
| Concurrent sport | Martial arts + running, ~3–4 sessions/week |
| Primary goal | Rebuild **powerlifting (SBD)** strength |
| Secondary | Muscle (byproduct), keep MA, **regain full splits** (front + side) |

### The Bromley diagnosis — *narrow base, stuck peak*
Bromley's central model says you fail to progress for one of three reasons: **Specificity** (a narrow base can't support a taller peak), **Recovery** (stress outruns recovery), or **Novelty** (diminished returns to the same stimulus). This athlete is a textbook case of the first:

- His **peak (neural drive) is largely intact** — he can already express ~220 kg.
- His **base has narrowed** — connective tissue, muscle mass, work capacity, and a healthy shoulder have all regressed faster than his nervous system.
- Therefore **the last ~30 kg back to 250 is tissue-gated, not motivation-gated.**

Bromley's prescription for a narrow base is unambiguous and is the spine of this plan:

> **"Wide bases make tall peaks."** Widen the base with broad, sub-maximal, higher-rep volume and exercise variety *before* re-specializing in heavy singles. The accessory/high-rep work also resurrects "newbie gains," and re-specialization afterward recovers fast because you start further from your peak.

This dovetails perfectly with the comeback's real limiters and even with the shoulder: **high-rep, low-load pressing *is* both Bromley's base work and the rotator-cuff rehab** — the same prescription from two directions.

**Two facts that govern every decision (unchanged from the prior plan):**
- **Neural drive is ahead of tissue.** Let joint/tendon symptoms and bar speed gate load — not ego or the percentage table.
- **Hard-session density is the binding constraint.** 5 lifting days + 3–4 sport sessions is too many hard efforts for a 40-year-old. Keep **3–4 truly hard efforts/week**; make the rest deliberately easy. This is Bromley's "≈half of workouts should be substantial" applied to a concurrent athlete.

---

## 2. The SRN engine (how every programming decision is made)

**SRN = Specificity · Recovery · Novelty.** It is the decision lens, not a template. Each phase deliberately optimizes a different pair:

| Lever | What it means here | When we turn it up |
|---|---|---|
| **Specificity** | How closely training mimics a 1RM SBD attempt (comp lifts, low reps, high %) | Peak block; late comeback |
| **Recovery** | Capacity to absorb stress without performance decay | Always (the masters/concurrent constraint); raised by sub-maximal loading + spacing hard days |
| **Novelty** | New stimulus to restart adaptation (new rep range, new variation) | Whenever a stimulus goes stale; supplied by rotating variations and shifting rep ranges each wave |

**Operating rules drawn straight from Bromley:**
1. **Volume work is *always* sub-maximal.** On any repeating-set work, *leave reps in the tank* — work at roughly ½–⅔ of the true max for that rep range (e.g. a 10-rep-max set is trained for 5–7 reps). One set taken to the limit fatigues the weakest link, wrecks the next set, and busts the volume target. This is the theoretical parent of the AMRAP-cap rule (§8).
2. **The 3-week wave is the atomic unit:** easy → medium → hard (RPE 7 → 7–8 → 8/9), **step-loaded**, and **weight never drops within a wave**. Week 4 is a deload. Waves repeat **+2–4%**.
3. **Base widens, Peak narrows.** Base = broad exercise menu, higher reps, volume climbs (add sets). Peak = comp lifts only, lower reps, intensity climbs (drop sets).
4. **Ration maxes.** Bromley: a true 1RM belongs in training **≤ twice a year**. Combined with the comeback CNS rule, **RPE 9 is the hard ceiling** until a planned realization test.

---

## 3. The macrocycle (Base → Transition → Peak)

A returning advanced lifter needs an **extended base** (Bromley's explicit guidance for comeback athletes). The full arc below is ~28–30 weeks; it is a loop, not a one-shot — re-enter Base whenever the peak gets "stuck" again.

| Block | Length | SRN emphasis | Rep waves | Load zone (% of working e1RM) | RPE ceiling (wk1/2/3) | Exercise breadth |
|---|---|---|---|---|---|---|
| **A — Base / Accumulation** | ~12 wk (4 × 3-wk waves) | Recovery + Novelty (widen base) | **12 → 10 → 8 → 6** | 57.5–80% | 7 / 7–8 / 8 | **Broad:** comp lift + 2–3 variations + accessories |
| *Deload* | wk 13 | reset fatigue | light technique | ~50–60% | 5–6 | same lifts, ~½ volume |
| **B — Transition / Specificity** | ~6 wk (2 × 3-wk waves) | shift toward Specificity | **6 → 5 → 4** | 75–87% | 8 / 8 / 8–9 | comp lift + **1** variation; capped plus-sets introduced |
| *Deload* | wk 20 | reset | light | ~55% | 5–6 | — |
| **C — Peak / Realization** | ~6–9 wk (2–3 × 3-wk waves) + test | Specificity + Recovery | **5 → 3 → 1+** | 80–92% | **9 hard ceiling** | comp lift + **1** overload variation only |
| *Realization* | final 1–2 wk | taper + confirm | e1RM-confirmation single | open ~5% below best e1RM | 9 → ~9.5 (cleared only) | — |

**The anchoring rule (most important number decision — inherited from the prior plan):**
> All loads are anchored to a **rolling working e1RM that STARTS at the seed** (~224 for DL) and is **re-estimated every 1–2 weeks from RPE-8 top sets.** The percentage columns are an *expected landing zone*, not a contract. **If the bar is harder than the prescribed RPE, the bar wins** — stop ramping at the RPE cap regardless of the kg. The plan *expects* e1RM to climb fast on muscle memory; the heavier kg only become valid as the estimate rises.

- **No true 1RM for the first 2–3 months.** The first realization test is an **e1RM confirmation, not a PR attempt** (open ~5% below best e1RM, take 1–2 clean ascending singles, stop at the first grind or >10–15% bar-speed drop). Realistic Week-~28 band: a **confident ~220–235 kg** single if markers stayed green; anything above is a bonus only if it moves fast.
- **Go/no-go to a genuine PR block:** only if shoulder physio-cleared **AND** pain-free at the current press rung **AND** DL e1RM trending up **AND** HRV stable. Otherwise loop back to Base.

---

## 4. Core parameters & calculations

**Units = kg. Round every prescribed weight to the nearest 2.5 kg.**

### 4.1 Estimated 1RM (Epley with reps-in-reserve)
```
e1RM = weight × (1 + (reps + RIR) / 30)
```
This is the **anchor** for the Bromley-native engine (not a fixed Training Max). Re-estimate from RPE-8 top sets every 1–2 weeks.

### 4.2 Prescribed set weight
```
set_weight = MROUND( working_e1RM × set_pct , 2.5 )      # capped by the wave's RPE ceiling
```

### 4.3 Optional Training Max (only for the 5/3/1-FSL peak option, §7)
```
TM  = MROUND( e1RM × tm_pct , 2.5 )     # tm_pct: DL 0.85, Squat 0.85, Bench 0.80
```
Running FSL off TM keeps even a 95%-of-TM top set at only ~80% of true 1RM — the deliberate "fast bar beats grinding" consequence.

### 4.4 Bromley AMRAP → max coefficient (cross-check on Epley)
A fixed-load AMRAP set estimates max as `weight × coeff`:

| reps | 2 | 3 | 4 | 5 | 6 | 8 | 10 |
|---|---|---|---|---|---|---|---|
| coeff | 1.08 | 1.13 | 1.17 | 1.20 | 1.23 | 1.30 | 1.33 |

Use it to sanity-check the rolling e1RM (e.g. a capped 5-rep top set at 180 → 180×1.20 ≈ 216).

### 4.5 Seed values
| Lift | weight | reps | RIR | e1RM | (opt) TM | Status |
|---|---|---|---|---|---|---|
| **Deadlift** | 210 | 1 | 1 | **224.0** | 190 | confirmed (grinder → 217 / 185) |
| **Squat** | 170 | 5 | 2 | **209.7** | 177.5 | working default — replace with a fresh top set |
| **Bench** | 100 | 5 | 3 | **126.7** | 102.5 | working default — **only if pain-free**; else no anchor, ladder only (§9) |

---

## 5. The Base block in detail (Block A — the heart of the comeback)

Broad exercise selection, climbing volume, sub-maximal loads, RPE-capped. This is where the **tissue-gated last 30 kg is actually earned** and where the bench shoulder-ladder lives. Four step-loaded waves; weight never drops within a wave; repeat the block **+2.5%** on the e1RM anchor if you run it twice.

### 5.1 Lower-body main lift — Base waves (% of working e1RM, RPE-capped)

| Wave | Reps | Wk 1 (RPE ≤7) | Wk 2 (RPE ≤7–8) | Wk 3 (RPE ≤8) |
|---|---|---|---|---|
| **1** | 12s | 3×12 @ 57.5% | 4×12 @ 60% | 5×12 @ 62.5% |
| **2** | 10s | 3×10 @ 65% | 4×10 @ 67.5% | 5×10 @ 70% |
| **3** | 8s | 3×8 @ 70% | 4×8 @ 72.5% | 5×8 @ 75% |
| **4** | 6s | 3×6 @ 75% | 4×6 @ 77.5% | 5×6 @ 80% |

*Worked example — Squat at e1RM ≈ 210:* Wave 1 = 120×12 / 125×12 / 132.5×12; Wave 4 = 157.5×6 / 162.5×6 / 167.5×6. All **stopped at the RPE cap** even if the kg says you could do more.

### 5.2 Deadlift — Base waves (volume-capped)
Deadlift is the most systemically fatiguing lift (Bromley). **Cap at ≤4 work sets** and run the **same % zone but fewer sets**, leaning on variations for the remaining stimulus:

| Wave | Reps | Wk 1 | Wk 2 | Wk 3 |
|---|---|---|---|---|
| 1 | 8s* | 3×8 @ 62.5% | 3×8 @ 65% | 4×8 @ 67.5% |
| 2 | 6s | 3×6 @ 67.5% | 3×6 @ 70% | 4×6 @ 72.5% |
| 3 | 5s | 3×5 @ 72.5% | 3×5 @ 75% | 4×5 @ 77.5% |
| 4 | 4s | 3×4 @ 75% | 3×4 @ 77.5% | 4×4 @ 80% |

\*Start the pull's first wave at 8s (not 12s) — high-rep deadlifts degrade technique. Double-overhand (hook/straps); **never mixed grip** for volume (asymmetric shoulder/biceps strain). Emphasize **tempo/eccentric pulls early** for tendon conditioning.

### 5.3 Bench — Base waves = the shoulder ladder (§9)
The bench *is* rehab here: **high-rep, low-load, RPE ≤7, NO AMRAP ever.** Load is secondary to the **current pain-free ladder rung** (floor press → DB → machine → … → barbell). Keep ≤65% e1RM:

| Wave | Reps | Wk 1 | Wk 2 | Wk 3 |
|---|---|---|---|---|
| 1 | 12s | 3×12 @ 50% | 3×12 @ 52.5% | 4×12 @ 55% |
| 2 | 10s | 3×10 @ 55% | 3×10 @ 57.5% | 4×10 @ 60% |
| 3 | 8s | 3×8 @ 60% | 3×8 @ 62.5% | 4×8 @ 65% |

> If no pain-free pressing exists yet, bench has **no load anchor** — stay in the isometric/rehab rungs (§9) and skip the bench % table until cleared.

### 5.4 Variations & accessories (the "widen the base" work)
Rotate **1–2 variations per lift per block** (not all at once — Westside-style novelty). Run variations one rep-range lighter than the main wave, step-loaded by sets (Wk1 2 sets → Wk2 3 → Wk3 4). Accessories on **double progression**, RPE 7–8, never to failure, ~25–50 reps per category per session. The accessory menu (pull-biased, shoulder-safe) is inherited verbatim from the prior plan, §5C — see [comeback-plan-v2.md].

---

## 6. The Transition block (Block B)

Narrow to the comp lift + **one** variation; rep waves descend 6 → 5 → 4; intensity climbs; **capped plus-sets are introduced** on the top set (§8). RPE 8, last week up to 8–9.

| Wave | Wk 1 | Wk 2 | Wk 3 (top set = capped +) |
|---|---|---|---|
| **1** | 4×6 @ 75% | 4×5 @ 80% | 4×4 @ 82.5% + |
| **2** (+2.5%) | 5×5 @ 80% | 4×4 @ 82.5% | 3×3 @ 85% + |

Back-off after the top set via the **2/3-method** (same weight, ⅔ of the reps) or **−10% drop**. Bench remains capped, no plus-set, and only advances a ladder rung when pain-free.

---

## 7. The Peak block (Block C) — two engines, pick one

Comp lift + **one overload variation** (block/rack pull, pin/board press, paused/box squat). Intensity climbs, volume drops, **RPE 9 is the ceiling, no true 1RM.**

### 7.1 Engine 1 — Bromley top-set wave (default)
| Wave | Wk 1 | Wk 2 | Wk 3 |
|---|---|---|---|
| **1** | 5×5 @ 80% (top +, RPE≤8) | 5×4 @ 85% | 5×3 @ 87.5% |
| **2** (+2.5%) | 5×3 @ 85% | 3×3 @ 87.5% | 1×3 @ 90% (+) |

Back-off: FSL 65–70% or −10%. Plus-sets autoregulate the climb (§8). Deadlift caps sets at 4 throughout.

### 7.2 Engine 2 — 5/3/1 + FSL (optional, off TM)
The prior plan's engine, retained for anyone who prefers fixed %: 3 working sets + FSL back-off, weekly wave 5s → 3s → 5/3/1, **AMRAP-capped** (squat/DL stop at RPE 8; bench no AMRAP). Run off **TM** (§4.3). Cycle TM-adjustment bands (RESET / HOLD / STANDARD+ / DOUBLE+) per the prior plan §6. Use this *or* Engine 1, never both in the same block.

### 7.3 Realization / test
Taper: cut volume ~40–50% over the final 7–14 days, keep intensity ~85–92% so reps stay fast; last heavy lift 7–10 days out. Then the **e1RM-confirmation single** (§3). Save the real PR push for the next macrocycle.

---

## 8. Autoregulation engine (Bromley-native, shoulder-safe)

### 8.1 Plus-sets (the Bullmastiff rule) — lower body only
On a designated top set, the prescribed reps are the **baseline**. Take it as a **capped AMRAP** — add reps one at a time **only while bar speed stays fast, stop at RPE 8 (≈2 RIR)**, never to failure. Then:

```
extra_reps      = reps_done − baseline
next_week_load  = this_week_load + extra_reps × (1% of working e1RM)     # rounded to 2.5 kg
```
*Example (DL, e1RM 224, 1% ≈ 2.25 kg):* baseline 5, did **8** → +3 reps → +~7.5 kg next week. As you get stronger the extra reps shrink and the jumps self-throttle. **Bench is excluded from plus-sets entirely** — the shoulder gates that set absolutely.

### 8.2 Within-session set-to-set rule (unchanged from prior plan)
| Situation | Next set today |
|---|---|
| Hit target, RIR ≥ 2 | Proceed as written |
| Hit target, RIR 0–1 (grindy) | −1 rep **or** −10% load; do **not** add load |
| Missed target (≥1 short) | −10% load; **never grind a 2nd failed set** → if you miss again, end main sets, do back-off lighter, log it |
| Far too easy, RIR ≥ 4 | Keep load (never add mid-session); log "raise e1RM/TM" |

### 8.3 Back-off methods
- **2/3-method:** keep the top-set load, drop reps to ⅔ (a 10-rep top set → sets of ~6). Volumize in Base (add sets each week), intensify in Peak (drop sets).
- **−10% drop:** drop ~10% of e1RM off the top set, keep the reps.

### 8.4 Deload & stall (inherited)
- **Planned deloads** at the end of each block (wk 13, 20) + the Bromley Week-4 light week within a doubled base.
- **Reactive deload** if any fire: RPE creeping at the same load; bar speed slowing two sessions running; accumulating joint ache (esp. shoulder); poor sleep / depressed HRV; 2+ missed top sets; shoulder pain >5/10 or night pain. Cut weekly sets ~40–60%, trim intensity 10–20%, pull effort back for 5–7 days, **and replace hard sparring with technical-only that week** (deload the highest-variance stressor too).
- **Stall reset:** two consecutive stalled waves on a lift → drop the e1RM anchor to 90% and rebuild; reassess technique, sleep, total weekly load. (Bromley: a stuck peak means the base needs re-widening — consider returning to Block A.)

---

## 9. Shoulder management (symptom-gated, runs in parallel)

Unchanged from the prior plan, §7 — summarized; **defer to comeback-plan-v2.md §7 for full detail.**
- **Gate:** no pressing load until physio confirms pain-free overhead flexion + restored internal rotation + adequate thoracic extension. Strengthening will not restore range — mobility is a separate stream.
- **Bench ladder (advance a rung only when pain-free across all working sets):** isometrics/high-rep-low-load → landmine → DB floor press → neutral-grip DB → machine → incline → **barbell bench**. The shoulder-gated variable is **press-path angle toward vertical + load**; kneeling/stance variants only change core demand and may move freely.
- **Overhead = DEFERRED** to Block B/C, only with clearance: landmine → bottoms-up KB → neutral-grip DB → barbell.
- **Loaded cuff** (band/cable ER) 3–4×/wk with rest; **light scapular/motor-control** (face pulls w/ end-range ER, serratus, Y/T) near-daily 2–3×15–25.
- **⚠️ Snatch-grip pulls are shoulder-LOADING, not rehab** — defer behind the same clearance gate as pressing; until then get upper-back stimulus from double-overhand/trap-bar work.
- **Pain rule:** brief low-grade discomfort OK; spike >5/10 or worse next morning → regress that day. Persists >2–3 days, or two rung-regressions, or any red-flag/night pain → **pause pressing, re-consult physio.**
- **Red flags → stop, seek care:** shoulder/arm pain with chest tightness or breathing difficulty (cardiac — emergency); post-fall deformity; new lump; fever + hot swollen joint; progressive/sudden weakness or numbness; unexplained night pain/sweats/weight loss.
- **In sport:** tap early on shoulder-lock submissions; limit hard clinch/posting on the injured side; treat any sparring tweak as a flare trigger.

---

## 10. Splits / flexibility (front + middle) — inherited

Unchanged from the prior plan, §8 — summarized; **defer to comeback-plan-v2.md §8 for full detail.**
- **Realistic timelines:** front split ~4–8 months with near-daily work (8–12+ months at only 2–3 sessions/wk); middle/box split is a multi-year, depth-only goal that may never reach a flat 180° (anatomy-limited).
- **Deadlift headwind:** heavy hinging shortens hip flexors/hamstrings and tightens adductors — the exact split limiters. **Expect depth to plateau in the high-volume Base/Transition weeks and rebound in lower-volume weeks; judge block-to-block.**
- **Dose:** 6× short daily "split snacks" (8–10 min, microstretching ~30–40% intensity) + **2–3 dedicated loaded sessions/wk** (PNF/Contract-Relax + PAILs/RAILs + Emmet-Louis loaded holds; progress sets → reps → hold → load).
- **Placement:** primary loaded slot **immediately after Thursday's heavy squat** (warm), second slot **Wed** (post-skill). **No aggressive end-range within 24 h before a hard pull/squat/spar, and gentle-only post-spar** (protect adductors/proximal hamstrings — the common adult split injuries).
- **Squat-depth limiters first:** ankle knee-to-wall **≥12 cm** before loading ATG depth; hips + T-spine are the two emphases.
- **Timing ban:** no long static/PNF holds on prime movers pre-lift (cuts force 4–7.5%). Pre-lift = dynamic RAMP only.

---

## 11. Conditioning, recovery & nutrition — inherited

Unchanged from the prior plan §§9–11 — summarized; **defer to comeback-plan-v2.md for full detail.**
- **Weekly schedule shell:** Mon heavy pull · Tue press/upper · Wed MA skill + loaded stretch · Thu heavy squat + technique pull + primary loaded stretch · Fri easy/skills · Sat hard sparring (standalone) · Sun full rest. The three high-CNS stressors (max pull, heavy squat, hard spar) **never land within 24 h of each other**; lift first when sharing a day; no running within 24 h before heavy lower days.
- **Load governance:** score MA by sRPE (RPE×min); keep **3–4 hard efforts/week**; sum sRPE across lifting+MA+running and keep **ACWR ~0.8–1.3** (avoid weeks >1.5× the trailing 4-wk average). Cut conditioning/extras FIRST when readiness dips.
- **Sleep** 8–10 h on heavy days (never <7); **protein 1.8–2.0 g/kg**; **carbs 4–6 g/kg**; eat at maintenance to tiny surplus; **creatine 3–5 g/day**; **collagen 15–30 g + vit C ~30–60 min before loading**. No post-lift ice baths on training days.

---

## 12. Machine-readable config (JSON)

The executing agent can parse this to build deterministically. Units = kg; this is the human-readable summary — the fuller program spec lives in `app/program.json` (same values).

```json
{
  "units": "kg",
  "rounding_kg": 2.5,
  "anchor": "rolling_working_e1rm",
  "formulas": {
    "e1rm": "weight * (1 + (reps + rir) / 30)",
    "set_weight": "mround(working_e1rm * set_pct, rounding_kg)",
    "tm_optional": "mround(e1rm * tm_pct, rounding_kg)",
    "amrap_coeff_max": "weight * coeff[reps]"
  },
  "tm_pct_optional": { "deadlift": 0.85, "squat": 0.85, "bench": 0.80 },
  "amrap_coeff": { "2": 1.08, "3": 1.13, "4": 1.17, "5": 1.20, "6": 1.23, "8": 1.30, "10": 1.33 },
  "seeds": {
    "deadlift": { "weight": 210, "reps": 1, "rir": 1, "e1rm": 224.0, "confirmed": true },
    "squat":    { "weight": 170, "reps": 5, "rir": 2, "e1rm": 209.7, "confirmed": false },
    "bench":    { "weight": 100, "reps": 5, "rir": 3, "e1rm": 126.7, "confirmed": false, "note": "only if pain-free; else ladder, no anchor" }
  },
  "blocks": [
    { "id": "A", "name": "Base/Accumulation", "weeks": 12, "waves": "12,10,8,6", "rpe_cap": [7, 7.5, 8],
      "lower_pct": [[57.5,60,62.5],[65,67.5,70],[70,72.5,75],[75,77.5,80]],
      "dl_pct":    [[62.5,65,67.5],[67.5,70,72.5],[72.5,75,77.5],[75,77.5,80]], "dl_max_sets": 4,
      "bench_pct": [[50,52.5,55],[55,57.5,60],[60,62.5,65]], "bench_amrap": false,
      "sets_by_week": [3,4,5], "repeat_increment_pct": 2.5, "exercise_breadth": "broad" },
    { "id": "B", "name": "Transition/Specificity", "weeks": 6, "waves": "6,5,4", "rpe_cap": [8, 8, 8.5],
      "pct": [[75,80,82.5],[80,82.5,85]], "sets_by_week": [4,4,3], "plus_sets": true,
      "backoff": "two_thirds_or_minus10", "exercise_breadth": "comp_plus_one_variation" },
    { "id": "C", "name": "Peak/Realization", "weeks": 9, "waves": "5,3,1", "rpe_cap": [8, 8.5, 9],
      "engine_default": "bromley_top_set_wave",
      "pct": [[80,85,87.5],[85,87.5,90]], "plus_sets": true, "dl_max_sets": 4,
      "engine_alt": "531_fsl_off_tm", "no_true_1rm": true, "exercise_breadth": "comp_plus_one_overload" }
  ],
  "plus_set_rule": "capped AMRAP (stop RPE8); next_week += extra_reps * 0.01 * working_e1rm (round 2.5); bench excluded",
  "within_session": {
    "hit_rir_ge2": "proceed", "hit_rir_le1": "-1 rep or -10% load",
    "missed": "-10% load, never grind a 2nd fail", "too_easy_rir_ge4": "hold, raise anchor"
  },
  "deload": { "planned_weeks": [13, 20], "reactive_triggers": ["rpe creep", "bar speed slows 2 sessions", "joint ache", "poor sleep/HRV", "2+ missed top sets", "shoulder pain>5 or night pain"], "execution": "cut sets 40-60%, intensity -10-20%, sparring technical-only" },
  "hard_efforts_per_week": "3-4 (heavy pull, heavy squat, hard spar, +press once heavy); never two within 24h",
  "acwr_band": [0.8, 1.3],
  "shoulder_gate": "no press load / no snatch-grip until physio clearance; bench ladder, no AMRAP",
  "no_1rm_window_weeks": 12
}
```

---

## 13. Build spec — spreadsheet

Title: **"Base-Strength Comeback — Bromley Rebuild."** Generated from `app/program.json` by `app/generate-xlsx.mjs` (exceljs). Reuse the formula idioms refined in `/home/odin/workout-plan/comeback-plan-v2.xlsx` (`MROUND`, null-safe `IF`). **Mark input cells with a fill colour; everything else is a formula.**

| Tab | Contents |
|---|---|
| **Read me** | one-screen orientation: the anchoring rule, RPE caps, how to log, where to input seeds |
| **Setup** | `Lift | weight | reps | RIR | e1RM | (opt TM%) | (opt TM)`. `e1RM = IF(w="","",w*(1+(reps+RIR)/30))`; `TM = IF(e="","",MROUND(e*tm%,$rounding))`. Rolling-e1RM cell per lift (manually updated from logs). Rounding cell = 2.5. |
| **Base Plan** | per lift, the 4 waves × 3 weeks: `Wave | Wk | Reps | %e1RM | RPE cap | Weight | Note`. `Weight = MROUND(Setup!e1RM * pct, 2.5)`. DL capped at 4 sets; bench rows gated (blank if no anchor). |
| **Peak Plan** | per lift, Engine-1 waves + top-set/back-off (2/3 or −10%); an Engine-2 (5/3/1 FSL off TM) sub-table. |
| **Plus-Set Autoreg** | input baseline + reps_done → `next_week_load = this + (reps_done−baseline)*MROUND(0.01*e1RM,2.5)`; bench row disabled. |
| **Variation Library** | approved shoulder-safe variations per lift (from §5.4 / §5B), with "job" and rotation notes. |
| **Session Log** | `Date | Block | Wave | Wk | Lift | Target reps | Reps done | RIR | Bar speed (1–5) | Shoulder pain (0–10) | Sleep | Notes` (mirror v2). |
| **Progression** | reads top-set logs per wave → plus-set next-load + stall flag; for Engine 2, the RESET/HOLD/STANDARD+/DOUBLE+ band logic. |
| **Weekly Load** | sRPE per session (lifting + MA + running) → weekly sum, 4-wk rolling avg, **ACWR**, flag >1.5×. |
| **Readiness** | daily sleep, HRV, RHR, mood, joint/shoulder feel. |
| **Mobility & Splits** | knee-to-wall cm, front/side split gap, photo-checkpoint dates, PAILs/RAILs load progression. |
| **Dashboard** | e1RM trend vs goal band, current block/wave indicator, split metrics, "next deload" countdown. |

### Worked validation row
Squat Base Wave 1 Wk 3: `5×12 @ 62.5%` of e1RM 209.7 → `MROUND(209.7×0.625, 2.5) = MROUND(131.06, 2.5) = 130.0 kg`. Capped at RPE 8.

---

## 14. Build spec — calendar (optional)

If the athlete wants it, mirror the weekly shell (§11) as recurring events (HARD days get a 2 h reminder), put the day's prescribed top-set weights + accessories in each event description, add daily mobility/prehab blocks, and anchor block-transition / deload / physio-review / checkpoint banners to the confirmed start date. The calendar **reflects** the plan; if an early-deload trigger fires, shift the deload banner earlier. (Full RRULE spec carried over from `references/Ultimate-workout-plan.md` §13.)

---

## 15. Sources

**Primary methodology:** Bromley, A. *Base Strength: Program Design Blueprint* (2020) — SRN model, 3-week waves, base/peak periodization, prefab templates (Volume/Intensity, Powerbuilder, 70s Powerlifter, Bullmastiff, Pyramid, Minimalist, DUP, H/L/M, M/R/S, Strongman), plus-set autoregulation, AMRAP→max coefficients. Local reference: `references/base-strength-by-bromley.md`.

**Inherited research pass** (comeback/muscle-memory, deadlift rebuild & autoregulation, shoulder rehab, splits, concurrent training, sleep/nutrition/aging): see the full annotated list in `comeback-plan-v2.md §13` — Stronger By Science, PowerliftingToWin, Physio-Pedia, Emmet Louis / Kit Laughlin, Huberman, Schumann/Wilson concurrent-training meta-analyses, PNAS muscle-memory, and the 2025 Delphi stretching consensus.

---

## 16. Safety & medical caveat

General training information, **not** a medical or clinical prescription. The shoulder protocol assumes rotator-cuff-type pain; a different diagnosis (labral/cuff tear, instability, AC pathology) requires a different progression. **A physio / sports-med assessment and explicit loading clearance is the single highest-value action before heavy or overhead pressing and before snatch-grip pulls**, and overrides anything written here. "Cleared" is symptom- and capacity-based, not calendar-based.
