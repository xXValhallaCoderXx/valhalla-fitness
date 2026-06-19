# Ultimate Workout Plan

> **Document purpose & audience.** This is a complete, self-contained training specification for a returning powerlifter. It is written to be handed to **another AI agent** that has access to the **Google Calendar API** and **Google Sheets API** (and can generate Excel files via CLI/openpyxl/exceljs). That agent should be able to read this file and, with a few confirmed inputs, build the athlete's tracking spreadsheet and calendar **without further coaching context**. It is also written so the **athlete** retains full context of the goals, logic, and progression rules.
>
> Everything here is derived from a verified research pass (program selection, masters-athlete recovery, concurrent training, shoulder return-to-pressing, and flexibility) plus a validated calculation model. See [§14 Sources](#14-sources).

---

## 0. Quick start for the executing agent

Before generating anything, **confirm these inputs with the athlete** (only the first three are blockers):

1. **Squat** — recent solid top set (weight × reps × reps-in-reserve). *Required to seed squat TM.*
2. **Bench** — recent **pain-free** top set (weight × reps × RIR) + how the shoulder felt. *Required to seed bench TM.*
3. **Training start date, preferred session time, and time zone.** *Required for calendar.*
4. Deadlift seed is pre-filled (210 kg tough single) — confirm whether that single had ~1 rep left (default) or was a true grinder (0 left).
5. Physio/shoulder clearance status (affects whether overhead pressing is unlocked in Phase 2).

Then build, in this order: **(a)** the Google Sheet per [§12](#12-build-spec-google-sheets) → **(b)** the Google Calendar per [§13](#13-build-spec-google-calendar). A machine-readable config is in [§11](#11-machine-readable-config-json).

---

## 1. Athlete profile & current status

| Attribute | Value |
|---|---|
| Age | 40 |
| Bodyweight | ~70 kg |
| Training history | Lifelong; **formerly elite relative strength** (peak: **270 kg axle DL, 250 kg conventional DL @ 70 kg BW**) |
| Current status | **Mid-comeback, training consistently for weeks/months** (NOT a cold returner) |
| Recent benchmark | **210 kg conventional deadlift, tough single** → est. 1RM ≈ 220 kg (~85–88% of old peak) |
| Bench | "Coming back" — progressing but below old level |
| Injury | Recovering shoulder; **cautious on most pressing** — pressing is symptom-gated, not cleared for heavy/overhead |
| Concurrent sport | Martial arts + running, **moderate load (~3–4 sessions/week)** |
| Primary goal | Rebuild **powerlifting (squat / bench / deadlift)** strength |
| Secondary goals | Build muscle (byproduct), keep martial arts, **regain full splits** (front + side) |
| Lifting availability | Wants 5+ days/week (see load-management caveat, [§9](#9-recovery-load-management--fatigue-cut-order)) |

**Two facts that govern every decision:**
- **Neural drive is ahead of tissue.** He can already express ~220 kg; tendons/ligaments and the shoulder are still catching up. The last ~30 kg back to 250 is **tissue-gated**, not motivation-gated.
- **Hard-session density, not calendar days, is the binding constraint.** 5 lifting days + 3–4 sport sessions = ~8–9 hard efforts/week, which is above sustainable for a 40-year-old. The plan keeps **3–4 truly hard lifts/week** and makes the rest deliberately easy.

---

## 2. Goals, targets & timelines

Targets are expressed as **estimated 1RM (e1RM)** unless noted. All are aspirational and **tissue-gated** — the progression engine ([§6](#6-progression-engine-the-core)) governs the real pace; do not chase these dates by overriding the rules.

| Horizon | Strength | Shoulder / bench | Flexibility | Sport / general |
|---|---|---|---|---|
| **Now (baseline)** | DL e1RM ~220, squat TBD, bench rebuilding | Pressing symptom-gated, no overhead | Below old splits | MA + running moderate |
| **3 months** | DL working sets smooth at TM ~190–200; squat TM established & climbing; **all TMs progressing** | Barbell bench pain-free at prescribed loads; bench TM +10–15 kg | Knee-to-wall ≥12 cm; front-split depth visibly improving | 3–4 hard lifts + sport, consistent, no flares |
| **6 months** | DL e1RM ~230–240; squat near old working level | **Overhead pressing reintroduced** if cleared | Front split near-flat; side split in progress | Full MA participation |
| **12 months** | **Re-approach / regain 250 kg conventional DL**; competitive SBD totals | Full pressing incl. overhead | Side split progressing; front split owned | "Beast mode"; optional competition |

**Definition of done for the comeback:** sustained training with no shoulder flare, 250 kg conventional DL back in reach, front split achieved, and the athlete able to choose a specialization block (powerlifting peak, strongman, or sport) from a healthy base.

---

## 3. Program selection (decided — with what's deferred and why)

**Chosen program: 5/3/1 with First-Set-Last (FSL) volume, masters/comeback configuration.** Run as a genuine training block (the athlete is past the "re-introduction" stage).

**Why this over the alternatives (full comparison was researched):**
- **5/3/1 FSL** — conservative training max + submaximal % work + autoregulated top sets = lowest joint cost, cleanest fit alongside martial arts, easy to regress for the shoulder. **Best entry fit.**
- **Stronger By Science (RPE/RTF templates)** — co-equal; better once base capacity is fully re-established. Planned as the **Phase 2/3 option**.
- **The Juggernaut Method (classic book)** — **deferred.** Its defining realization-week AMRAP-to-failure (including on Military Press) is the single worst thing for a recovering shoulder, and its fixed, non-autoregulated volume fights the concurrent-sport load. **JuggernautAI (the app)** is a viable later option (it autoregulates) once the shoulder is cleared.
- **Sheiko** — deferred 8–12+ weeks (tonnage too high to co-exist with sport right now); excellent later for SBD specificity.
- **Layne Norton PHAT/PH3** — avoid for now (volume/frequency too joint-heavy; PH3 presupposes a base he's still rebuilding).

**Key structural rule — decouple upper and lower:** squat/deadlift train like a proper strength athlete mid-comeback; **pressing stays on a shorter leash, gated by the shoulder**, regardless of what the lower-body progression is doing.

---

## 4. Core parameters & calculations

All math below is what the spreadsheet must implement. **Units = kg. Round every prescribed weight to the nearest 2.5 kg.**

### 4.1 Estimated 1RM (Epley with reps-in-reserve)
```
e1RM = weight × (1 + (reps + RIR) / 30)
```
- `RIR` = reps left in the tank on that set (0 = true failure).

### 4.2 Training Max (TM) — the number the whole program runs off
```
TM = ROUND( e1RM × TM% / rounding ) × rounding        // rounding = 2.5
```
| Lift | TM % | Rationale |
|---|---|---|
| Deadlift | **0.85** | Standard 5/3/1 — keeps top single at ~80% of true 1RM |
| Squat | **0.85** | Standard |
| Bench | **0.80** | **Shoulder-conservative** — drop further if it complains |

> The intentional consequence: even the heaviest prescribed set (95% of TM) is only ~80% of true 1RM. **Fast bar speed beats grinding.** This is rebuilding, not testing.

### 4.3 Seed values (current)
| Lift | weight | reps | RIR | e1RM | TM% | **TM** | Status |
|---|---|---|---|---|---|---|---|
| **Deadlift** | 210 | 1 | 1 | 224.0 | 0.85 | **190.0** | confirmed (set RIR=0 → e1RM 217 → TM 185 if it was a true grinder) |
| **Squat** | _TBD_ | _TBD_ | _TBD_ | — | 0.85 | _TBD_ | **REQUIRED INPUT** (recent solid 5RM) |
| **Bench** | _TBD_ | _TBD_ | _TBD_ | — | 0.80 | _TBD_ | **REQUIRED INPUT** (pain-free top set) |

### 4.4 Prescribed-weight formula (per set)
```
set_weight = ROUND( TM × set_pct / rounding ) × rounding
```

---

## 5. The training block: 5/3/1 + FSL

A **cycle = 4 weeks** (3 working weeks + 1 deload). Each working day = the three main 5/3/1 sets **plus FSL back-off volume**.

### 5.1 Main sets and FSL by week

| Week | Set 1 | Set 2 | Top set (Set 3) | FSL (back-off) |
|---|---|---|---|---|
| **Wk 1 — "5s"** | 65% × 5 | 75% × 5 | **85% × 5+** (min 5) | 65% × **5×5** |
| **Wk 2 — "3s"** | 70% × 3 | 80% × 3 | **90% × 3+** (min 3) | 65% × 5×5 |
| **Wk 3 — "5/3/1"** | 75% × 5 | 85% × 3 | **95% × 1+** (min 1) | 65% × 5×5 |
| **Wk 4 — deload** | 40% × 5 | 50% × 5 | 60% × 5 | — (no FSL) |

- **Deadlift FSL = 4×5** (not 5×5) to manage spinal/systemic fatigue.
- `%` is of **TM**, not 1RM.

### 5.2 Worked example — Deadlift at TM 190 (validated numbers)
| Week | Set 1 | Set 2 | Top set | FSL |
|---|---|---|---|---|
| Wk1 (5s) | 122.5×5 | 142.5×5 | **162.5×5+** | 122.5 × 4×5 |
| Wk2 (3s) | 132.5×3 | 152.5×3 | **170×3+** | 122.5 × 4×5 |
| Wk3 (5/3/1) | 142.5×5 | 162.5×3 | **180×1+** | 122.5 × 4×5 |
| Wk4 (deload) | 77.5×5 | 95×5 | 115×5 | — |

### 5.3 The AMRAP-CAP policy (critical — this is NOT standard 5/3/1)
The "+" sets are normally taken to failure. **We do not.** Safety override:
- **Squat / Deadlift "+" set:** do the minimum reps, then add reps **one at a time only while bar speed stays fast**, and **STOP at RPE 8 (≈2 reps in reserve)**. Never to failure, never a grind.
- **Bench "+" set:** **no AMRAP at all.** Hit the minimum reps and **stop 2–3 reps short**. The shoulder gates this set absolutely.
- The reps you achieved + your RIR estimate are **the autoregulation signal** that drives [§6](#6-progression-engine-the-core). That is the entire reason we record them.

---

## 6. Progression engine (THE CORE)

This section answers directly: *"If I don't make the rep target, what happens? If I exceed it, what happens?"* — at **two levels**: within a session (set-to-set) and across cycles (the TM that drives everything).

### 6.1 Level 1 — Within-session set-to-set rule

Logged per working set: did you hit the **target reps**, and what was your RIR?

| Situation on a set | What to do on the **next set today** |
|---|---|
| **Hit target, RIR ≥ 2** (as planned) | Proceed exactly as written. |
| **Hit target but RIR 0–1** (grindy, slow) | Reduce the next same-load set by **−1 rep**, *or* drop **−10% load** to keep the target. **Do not** add load. |
| **Missed target** (≥1 rep short) | Drop **−10% load** on the next set to land back in the target range. **Never grind a second failed set.** If you miss again, end the main sets and do FSL **lighter**. Log it. |
| **Far too easy, RIR ≥ 4 across sets** | Keep the prescribed reps/load for the rest of the session (**never add load mid-session**). Log "raise TM next cycle." |
| **Exceeded reps on the AMRAP-capped top set** | Does **not** change later sets today — it feeds the **cycle decision** below ([§6.2](#62-level-2--cycle-to-cycle-tm-adjustment)). |

**FSL back-off sets specifically:** load is fixed at 65%. If a back-off set drops below target reps or RIR < 1, cut the remaining FSL sets to **3 reps** or stop — that is acceptable and expected on hard days.

### 6.2 Level 2 — Cycle-to-cycle TM adjustment

**Evaluated once per 4-week cycle, per lift.** Inputs: the reps + RIR you logged on each week's top set, bar-speed flags, and (for bench) pain. **Apply the first band that matches, in order:**

| # | Band | Condition (this cycle, this lift) | Next-cycle TM change |
|---|---|---|---|
| 1 | **RESET** | Failed the prescribed minimum on **any** top set, **OR** bench pain > 5/10 | **TM × 0.90** (rounded). Add an extra deload. |
| 2 | **HOLD** | Any top set finished at **RIR 0–1 / grind** (hit min, nothing left) | **No change** (repeat TM) |
| 3 | **STANDARD +** | All top sets hit minimum at **RIR ≥ 2** with fast bar | **Lower +5 kg · Upper +2.5 kg** |
| 4 | **DOUBLE +** | **Every** top set hit minimum **+ ≥2 extra reps** at RIR ≥ 2, bar fast all cycle, fully recovered | **Lower +7.5 kg · Upper +5 kg** |

**Bench override:** never apply any "+" with pain present; bench progresses **only if fully pain-free for the entire cycle**, otherwise HOLD regardless of the band.

**Decision logic (pseudocode the spreadsheet/agent implements):**
```
for each lift at end of cycle:
    if any_top_set.missed_min OR (lift == bench AND pain > 5):  band = RESET
    elif any_top_set.rir <= 1:                                  band = HOLD
    elif all_top_sets.rir >= 2 and all_top_sets.min_plus2 and fully_recovered: band = DOUBLE
    elif all_top_sets.rir >= 2 and fast_bar:                    band = STANDARD
    else:                                                       band = HOLD

    delta = { RESET: -(TM*0.10), HOLD: 0,
              STANDARD: (lower? 5 : 2.5), DOUBLE: (lower? 7.5 : 5) }[band]
    if lift == bench and pain_any_session: delta = min(delta, 0)
    newTM = ROUND((TM + delta)/2.5)*2.5
```

### 6.3 Stall & reset rule
**Two consecutive cycles** of HOLD or RESET on a lift → **reset that lift's TM to 90% of current** and rebuild from there; reassess technique, sleep, and total weekly load. This prevents spinning wheels at a too-high TM.

### 6.4 Deload rule
- **Always take the Week-4 deload.**
- **Trigger an early deload** (cut the current week short to deload loads) if **any** of:
  - 2+ missed top sets in a cycle,
  - FSL bar speed visibly slows two sessions running,
  - shoulder pain > 5/10 or any night pain,
  - readiness down 4+ days (poor sleep, elevated resting HR, motivation crash).

### 6.5 Phase transitions
| Phase | Window | What runs | Exit criteria |
|---|---|---|---|
| **Phase 1 — Rebuild** | ~Weeks 1–8 | 5/3/1 FSL as above; bench in rehab progression | TMs climbing steadily; barbell bench pain-free at prescribed loads; work capacity solid |
| **Phase 2 — Intensify** | ~Weeks 9–20 | FSL → **SSL** (Second-Set-Last, slightly heavier back-off) or add a 2nd lighter squat/DL exposure; **reintroduce overhead pressing IF shoulder cleared**; optionally switch to an **SBS RPE template** | TMs approaching old working levels; shoulder cleared; front split near-flat |
| **Phase 3 — Specialize/Peak** | ~Month 5–6+ | Powerlifting-specific block (**SBS RPE**, **JuggernautAI PL**, or **Sheiko** if sport trimmed); re-test maxes via **RPE-capped singles, never cold** | Re-approach 250 kg DL; choose competition or maintenance |

---

## 7. Weekly schedule & session sequencing

5 training days + sport, **but only 3–4 are truly HARD**. The rest are deliberately easy.

| Day | Session | Intensity | Content |
|---|---|---|---|
| **Mon** | Squat (hard) + push | **HARD** | Squat 5/3/1 top set @ RPE 7–8 + FSL 5×5 @ 65%. Bench 4×5 @ RPE 6–7 (reps in reserve, no AMRAP). |
| **Tue** | Martial arts (technical) | Easy–Mod | Skill / drilling, light rounds. |
| **Wed** | Bench/upper (capped) + back | **HARD (upper)** | Bench top sets @ RPE 7 + back-off + heavy rows 4×6–8. Cuff + face pulls. |
| **Thu** | Zone-2 + easy technique squat | Easy | Z2 cycle/row 30–40 min. Optional light paused squat 3×3 @ 60% for skill. |
| **Fri** | Deadlift (hard) + posterior chain | **HARD** | DL 5/3/1 top set @ RPE 7–8 + FSL 4×5 @ 65%. RDL/back. Post-lift loaded split work. |
| **Sat** | Hard sparring **OR** capped run | **HARD (sport)** | ONE hard sport session, ideally standalone. |
| **Sun** | Full rest + passive mobility | Off | Daily passive PNF split holds only; no loading. |

**Sequencing rules:**
- Separate hard lifting from hard running/MA by **~24 h** where possible (min 3–6 h).
- If lifting and conditioning land in the same session, **lift first**.
- **Never** heavy squat/DL the day after hard sparring without a readiness check.
- Daily, regardless of the above: ~20 min mobility/splits + ~10 min shoulder prehab (low cost, recovery-positive).

### 7.1 Accessory work

Accessories are selected against four filters specific to this athlete: **shoulder-safe · carries over to SBD · builds the byproduct muscle · low recovery cost** (3–4 sport sessions compete for recovery). Principles: pull-biased (a recovering shoulder wants more horizontal pulling than pushing); no overhead / deep dips / behind-neck; pressing volume comes from neutral-grip / incline-DB / machine options; **face pulls + external rotation on every lifting day**.

| Day (main focus) | Movement | Sets × reps | Purpose |
|---|---|---|---|
| **Mon — Squat / push** | Leg press *or* Bulgarian split squat | 3 × 10–12 | Quad volume, low spinal load; single-leg aids MA + hip mobility |
| | Lying / seated leg curl | 3 × 12–15 | Hamstring, knee health |
| | Triceps pushdown | 3 × 12–15 | Bench lockout, elbow-friendly |
| | Hanging leg raise / ab wheel | 3 × 10–15 | Trunk / bracing |
| **Wed — Bench / back** | Chest-supported row (or seal row) | 4 × 8–12 | Back thickness, balances bench, no low-back load |
| | Neutral-grip lat pulldown | 3 × 10–12 | Vertical pull, shoulder-friendly |
| | Incline DB press, neutral grip\* | 3 × 8–12 | Upper-chest / press volume — **only if pain-free** |
| | DB hammer curl | 3 × 12 | Biceps / elbow health, mass |
| | Face pulls + band external rotation | 3–4 × 15–20 | Rear delt + cuff (prehab doubles as accessory) |
| **Fri — Deadlift / posterior** | Romanian deadlift | 3 × 8–10 | Ham / glute, DL carryover |
| | 45° back extension | 3 × 12–15 | Low-back / glute, low systemic cost |
| | Chest-supported / DB row | 3 × 10 | Upper back for lockout & posture |
| | Cable crunch / plank | 3 × 10–15 / 30–45 s | Anti-flexion / extension core |
| | (Optional) heavy carries / grip holds | 3 × 30 m / 20–30 s | Grip + trunk; nods to strongman base |

\*Defer incline press until the shoulder tolerates the full bench ladder ([§8](#8-shoulder-management-protocol-runs-in-parallel-symptom-gated)).

**Accessory progression = double progression** (independent of the main-lift TM engine): pick a rep range; when you hit the **top** of the range on all sets at RIR ≥ 2, add **2.5–5 kg** and return to the **bottom** of the range. **All accessories at RPE 7–8, never to failure.** Cap volume so it doesn't eat main-lift or sport recovery — Wendler guideline ~25–50 reps per movement category per session.

---

## 8. Shoulder management protocol (runs in parallel, symptom-gated)

- **Bench ladder — advance only when the current stage is pain-free:** DB floor press → DB bench → machine press → pin/board press → **full barbell bench**.
- **Overhead barbell = DEFERRED** until full **pain-free overhead flexion**. Reintroduce via: **landmine → bottoms-up KB → neutral-grip DB → barbell.** (Unlocks in Phase 2 only with clearance.)
- **Bench you *can* do safely:** grip narrower than 1.5× biacromial width, hard scapular retraction, slight tuck, modest arch to stay out of the painful deep bottom.
- **Prehab dosing:**
  - *Light scapular/motor-control* (band face pulls with end-range external rotation, serratus/wall slides, prone Y/T): **near-daily, 2–3 × 15–25 reps.**
  - *Loaded rotator-cuff* (band/cable external rotation): **3–4×/week with rest** (not daily).
- **Pain rule:** ≤5/10 during the set, no rep-to-rep escalation, back to baseline by next morning, no night pain — else cut load/volume.
- **RED FLAGS → stop, see a physio:** night pain that wakes you, true weakness, numbness/tingling down the arm, the shoulder slipping, pain radiating to chest/neck.
- **Clearance is non-negotiable before heavy/overhead pressing.** This plan assumes rotator-cuff-type pain; a labral/cuff tear or instability changes the progression. Get a loading clearance from a physio/sports-med professional.

---

## 9. Flexibility / splits protocol

**Realistic timeline:** front split **6–9 months**; side/middle split **12+ months and may never go fully flat** (hip anatomy). "Splits in 4 weeks" is marketing.

- **Mode A — backbone (daily):** passive/PNF on warm muscle (post-session or after warm-up; external heat helps). **2–3 × 60–120 s per position** — front split each leg, side split, pancake/straddle. ~15–20 min/day.
- **Mode B — complement (2×/week, lower body only):** loaded end-range — weighted straddle/pancake, Cossack squats, deep ATG split squats, Jefferson curls. Progress in order: **sets → reps → hold → load.** Keep loaded stretching away from the recovering shoulder until cleared.
- **Squat-depth / kick carryover (prioritize the real limiters):** ankle dorsiflexion (**target knee-to-wall ≥12 cm**), hip flexors, adductors/groin, hip external rotation (90/90 PAILs/RAILs). Restore this **before** loading ATG depth.
- **Timing (firm):** **never** long static stretching (>60 s/muscle) before lifting — it cuts strength/power **4–7.5%**. Pre-lift = dynamic warm-up only. All real split work = **post-session or separate sessions**. ATG squatting counts as a hard session — it is not "free" mobility.
- **Track:** floor gap per split, knee-to-wall cm, pancake/straddle depth. Checkpoints at 3 months (deeper) and 6 months (front split near-flat).

---

## 10. Conditioning: martial arts + running integration

- **The interference effect is NOT the main risk** — it's smaller than feared and mostly blunts explosive strength (not the SBD goal). The real risks are **total systemic fatigue** and **tissue tolerance**.
- **Count hard sparring/rolling as a HARD neuromuscular session** that *also* loads the shoulder — not as "cardio."
- **Weekly conditioning target:** ~150 min as a **soft anchor** (martial arts eats most of it). Favor **cycle/row/ski-erg** over hard running (less eccentric damage); reserve hard running for **≤1 capped session** away from leg days. Use Zone-2 for recovery.
- Cap of **1–2 hard sport sessions/week** alongside the 3–4 hard lifts.

---

## 11. Machine-readable config (JSON)

The executing agent can parse this to build the sheet/calendar deterministically. **Units = kg.**

```json
{
  "units": "kg",
  "rounding_kg": 2.5,
  "athlete": { "age": 40, "bodyweight_kg": 70, "status": "mid-comeback, recovering shoulder" },
  "formulas": {
    "e1rm": "weight * (1 + (reps + rir) / 30)",
    "training_max": "round(e1rm * tm_pct / rounding_kg) * rounding_kg",
    "set_weight": "round(tm * set_pct / rounding_kg) * rounding_kg"
  },
  "tm_pct": { "deadlift": 0.85, "squat": 0.85, "bench": 0.80 },
  "seed_inputs": {
    "deadlift": { "weight": 210, "reps": 1, "rir": 1, "tm": 190, "confirmed": true },
    "squat":    { "weight": null, "reps": null, "rir": null, "tm": null, "confirmed": false, "note": "REQUIRED: recent solid 5RM" },
    "bench":    { "weight": null, "reps": null, "rir": null, "tm": null, "confirmed": false, "note": "REQUIRED: pain-free top set" }
  },
  "cycle_weeks": [
    { "name": "5s",     "sets": [ {"pct":0.65,"reps":"5"}, {"pct":0.75,"reps":"5"}, {"pct":0.85,"reps":"5+","top":true,"min":5} ], "fsl": {"pct":0.65,"sets":5,"reps":5} },
    { "name": "3s",     "sets": [ {"pct":0.70,"reps":"3"}, {"pct":0.80,"reps":"3"}, {"pct":0.90,"reps":"3+","top":true,"min":3} ], "fsl": {"pct":0.65,"sets":5,"reps":5} },
    { "name": "531",    "sets": [ {"pct":0.75,"reps":"5"}, {"pct":0.85,"reps":"3"}, {"pct":0.95,"reps":"1+","top":true,"min":1} ], "fsl": {"pct":0.65,"sets":5,"reps":5} },
    { "name": "deload", "sets": [ {"pct":0.40,"reps":"5"}, {"pct":0.50,"reps":"5"}, {"pct":0.60,"reps":"5"} ], "fsl": null }
  ],
  "deadlift_fsl_sets": 4,
  "amrap_cap": { "squat_dl": "stop at RPE 8 (>=2 RIR), bar fast, never to failure", "bench": "no AMRAP; stop 2-3 reps short" },
  "accessories": {
    "principles": "shoulder-safe; SBD carryover; build byproduct muscle; low recovery cost; pull-biased; no overhead/deep dips/behind-neck; face pulls + external rotation every lifting day",
    "progression": "double progression: top of rep range on all sets at RIR>=2 -> +2.5-5 kg, back to bottom; RPE 7-8, never to failure; ~25-50 reps per movement category per session",
    "mon": [
      { "movement": "Leg press OR Bulgarian split squat", "sets_reps": "3x10-12" },
      { "movement": "Lying/seated leg curl", "sets_reps": "3x12-15" },
      { "movement": "Triceps pushdown", "sets_reps": "3x12-15" },
      { "movement": "Hanging leg raise / ab wheel", "sets_reps": "3x10-15" }
    ],
    "wed": [
      { "movement": "Chest-supported row (or seal row)", "sets_reps": "4x8-12" },
      { "movement": "Neutral-grip lat pulldown", "sets_reps": "3x10-12" },
      { "movement": "Incline DB press, neutral grip", "sets_reps": "3x8-12", "condition": "only if pain-free" },
      { "movement": "DB hammer curl", "sets_reps": "3x12" },
      { "movement": "Face pulls + band external rotation", "sets_reps": "3-4x15-20" }
    ],
    "fri": [
      { "movement": "Romanian deadlift", "sets_reps": "3x8-10" },
      { "movement": "45-degree back extension", "sets_reps": "3x12-15" },
      { "movement": "Chest-supported / DB row", "sets_reps": "3x10" },
      { "movement": "Cable crunch / plank", "sets_reps": "3x10-15 / 30-45s" },
      { "movement": "Heavy carries / grip holds", "sets_reps": "3x30m / 20-30s", "optional": true }
    ]
  },
  "progression_bands_ordered": [
    { "id": "reset",    "if": "missed min reps on any top set OR bench pain>5", "tm_delta": "-10% then round", "extra": "add deload" },
    { "id": "hold",     "if": "any top set RIR<=1 / grind",                    "tm_delta_kg": 0 },
    { "id": "standard", "if": "all top sets hit min at RIR>=2, fast bar",      "tm_delta_kg": { "lower": 5,   "upper": 2.5 } },
    { "id": "double",   "if": "every top set min+>=2 reps at RIR>=2, fast, recovered", "tm_delta_kg": { "lower": 7.5, "upper": 5 } }
  ],
  "bench_rule": "never progress with any pain; progress only if fully pain-free all cycle",
  "stall_reset": "2 consecutive hold/reset cycles -> TM = 0.90*current, rebuild",
  "within_session": {
    "hit_target_rir_ge2": "proceed as written",
    "hit_target_rir_le1": "next set -1 rep OR -10% load; do not add load",
    "missed_target": "next set -10% load; never grind a 2nd failed set",
    "too_easy_rir_ge4": "keep prescribed reps/load; log 'raise TM next cycle'"
  },
  "deload": { "scheduled": "every week 4", "early_triggers": ["2+ missed top sets", "FSL bar speed slows 2 sessions", "shoulder pain>5 or night pain", "readiness down 4+ days"] },
  "phases": [
    { "id": 1, "name": "Rebuild",    "weeks": "1-8",   "exit": "TMs climbing; bench pain-free at prescribed loads" },
    { "id": 2, "name": "Intensify",  "weeks": "9-20",  "exit": "near old working levels; shoulder cleared; overhead reintroduced" },
    { "id": 3, "name": "Specialize", "weeks": "21+",   "exit": "re-approach 250kg DL; choose peak/maintenance" }
  ],
  "weekly_schedule": [
    { "day": "MO", "title": "Squat (HARD) + bench submax", "hard": true,  "duration_min": 75 },
    { "day": "TU", "title": "Martial arts (technical)",    "hard": false, "duration_min": 60 },
    { "day": "WE", "title": "Bench/upper (capped) + back", "hard": true,  "duration_min": 60 },
    { "day": "TH", "title": "Zone-2 + easy technique squat","hard": false, "duration_min": 45 },
    { "day": "FR", "title": "Deadlift (HARD) + posterior",  "hard": true,  "duration_min": 75 },
    { "day": "SA", "title": "Hard sparring OR capped run",  "hard": true,  "duration_min": 60 },
    { "day": "SU", "title": "Rest + passive mobility",      "hard": false, "duration_min": 20 }
  ],
  "daily_blocks": [
    { "title": "Mobility / splits", "duration_min": 20 },
    { "title": "Shoulder prehab",   "duration_min": 10 }
  ],
  "goals_targets": {
    "3_month":  { "deadlift_tm_kg": "190-200", "knee_to_wall_cm": ">=12", "bench": "pain-free, TM +10-15kg" },
    "6_month":  { "deadlift_e1rm_kg": "230-240", "overhead": "reintroduced if cleared", "front_split": "near-flat" },
    "12_month": { "deadlift_e1rm_kg": ">=250", "side_split": "in progress" }
  }
}
```

---

## 12. Build spec — Google Sheets

Create a spreadsheet titled **"Ultimate Workout Plan — 5/3/1 FSL"** with these tabs. (A reference Excel implementation already exists at `/home/odin/workout-plan/FSL-comeback-program.xlsx` — mirror its formulas.)

**Tab `Setup`** — input + calc:
- Columns: `Lift | Recent weight | Reps | RIR | Est.1RM | TM% | Training Max`.
- Rows: Deadlift (210/1/1/—/0.85), Squat (input), Bench (input/0.80).
- `Est.1RM = weight*(1+(reps+RIR)/30)`; `TM = ROUND(Est1RM*TM%/$rounding,0)*$rounding`.
- A `rounding` cell (default 2.5). **Mark input cells with a fill color**; everything else is formula.

**Tab `Cycle`** — read-only, formula-driven:
- For each lift, a block referencing its `Setup` TM cell.
- For each of the 4 weeks, rows per set: `Week | Set | %TM | Target reps | Weight | Note`.
- `Weight = ROUND(Setup!TM * pct / Setup!rounding, 0) * Setup!rounding`.
- Note column carries the AMRAP-cap text from [§5.3](#53-the-amrap-cap-policy-critical--this-is-not-standard-531).

**Tab `Accessories`** — static reference from [§7.1](#71-accessory-work): `Day | Movement | Sets×reps | Purpose`, plus the double-progression note.

**Tab `Log`** — one row per top set:
- Columns: `Date | Cycle | Week | Lift | Target min | Reps done | RIR | Bar speed (1-5) | Shoulder pain (0-10) | Notes`.

**Tab `Progression`** — implements [§6.2](#62-level-2--cycle-to-cycle-tm-adjustment):
- Pull each cycle's top-set logs, compute the band, and output the **recommended next-cycle TM**. Example formula (lower-body lift; adapt cell refs), returning a kg delta:
```
=IFS(
   MIN(reps_range) < min_required, -ROUND(TM*0.10/2.5,0)*2.5,
   MIN(rir_range) <= 1, 0,
   AND(MIN(rir_range) >= 2, MIN(reps_range) >= min_required + 2), 7.5,
   AND(MIN(rir_range) >= 2), 5,
   TRUE, 0)
```
  Upper-body: replace `7.5→5`, `5→2.5`, and gate on a pain flag (`IF(MAX(pain_range)>5, MIN(delta,0), delta)`).
- `Suggested next TM = ROUND((current_TM + delta)/2.5,0)*2.5`. Add a flag for the **stall reset** (2 consecutive hold/reset → ×0.90).

**Tab `Dashboard`** — goal targets ([§2](#2-goals-targets--timelines)) vs current e1RMs, flexibility metrics (knee-to-wall, split gaps), and a phase indicator.

---

## 13. Build spec — Google Calendar

Confirm **start date, session time, time zone** first. Create a dedicated calendar **"Ultimate Workout Plan."**

**Weekly recurring training events** (use the durations in the JSON; set a 2 h reminder on HARD days):
```
Mon  Squat (HARD) + bench submax        RRULE:FREQ=WEEKLY;BYDAY=MO
Tue  Martial arts (technical)           RRULE:FREQ=WEEKLY;BYDAY=TU
Wed  Bench/upper (capped) + back        RRULE:FREQ=WEEKLY;BYDAY=WE
Thu  Zone-2 + easy technique squat      RRULE:FREQ=WEEKLY;BYDAY=TH
Fri  Deadlift (HARD) + posterior        RRULE:FREQ=WEEKLY;BYDAY=FR
Sat  Hard sparring OR capped run        RRULE:FREQ=WEEKLY;BYDAY=SA
Sun  Rest + passive mobility            RRULE:FREQ=WEEKLY;BYDAY=SU
```
Put the day's prescribed top-set weights (from the `Cycle` tab, for the current week) **and that day's accessories** ([§7.1](#71-accessory-work)) in each event's **description**, so the athlete sees the numbers on their phone.

**Daily blocks:**
```
Mobility / splits  20 min   RRULE:FREQ=DAILY
Shoulder prehab    10 min   RRULE:FREQ=DAILY
```

**Loaded stretching** (Mode B, 2×/week): `RRULE:FREQ=WEEKLY;BYDAY=TU,FR` (after the session).

**Cycle / milestone events** (anchor INTERVAL rules to the confirmed start date):
```
Deload week banner (all-day, Mon-Sun)        RRULE:FREQ=WEEKLY;INTERVAL=4   (every 4th week)
"Update TMs + run Progression tab"           every 4 weeks, end of cycle
Week-8 review: phase transition check        one-time
Week-8+ : reintroduce overhead IF shoulder cleared   one-time, conditional
"Book physio shoulder assessment"            one-time reminder (do this early)
3-month & 6-month checkpoint reviews         one-time (goals + flexibility metrics)
```

> **Calendar should reflect, not override, the plan.** If the athlete logs an early-deload trigger ([§6.4](#64-deload-rule)), the agent should be able to shift the deload banner earlier.

---

## 14. Sources

Verified during research (full list available on request):
- **Programs:** [PowerliftingToWin – Juggernaut review](https://www.powerliftingtowin.com/the-juggernaut-method/), [JuggernautAI](https://www.juggernautai.app/), [5/3/1 Forever](https://www.jimwendler.com/products/5-3-1-forever-book), [SBS – Autoregulation](https://www.strongerbyscience.com/autoregulation/), [PowerliftingToWin – Sheiko](https://www.powerliftingtowin.com/sheiko/).
- **Masters / returning:** [Starting Strength – Volume & the Masters Lifter](https://startingstrength.com/article/volume-and-the-masters-lifter), [JTS – Masters Lifters](https://www.jtsstrength.com/considerations-for-masters-lifters/), [SBS – Detraining](https://www.strongerbyscience.com/detraining/).
- **Concurrent training:** [SBS – Interference effect](https://www.strongerbyscience.com/research-spotlight-interference-effect/), [Schumann et al. 2021 meta-analysis](https://link.springer.com/article/10.1007/s40279-021-01426-9).
- **Shoulder:** [Physio Network – Pressing with shoulder pain](https://www.physio-network.com/blog/pressing-exercises-shoulder-pain/), [Barbell Rehab – Overhead press pain](https://barbellrehab.com/overhead-press-pain/).
- **Flexibility:** [2025 Delphi stretching consensus](https://pmc.ncbi.nlm.nih.gov/articles/PMC12305623/), [Acute static stretching & strength (Frontiers 2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6895680/), [Emmet Louis – Loaded stretching](https://emmetlouis.com/knowledge-base/emmets-blackboard/loaded-stretching/).

---

## 15. Safety & medical caveat

This plan is general training information, not a medical or clinical prescription. The shoulder protocol assumes **rotator-cuff-type pain**; a different diagnosis (labral tear, significant cuff tear, instability, AC pathology) requires a different progression. **A physio / sports-medicine assessment and explicit loading clearance is the single highest-value action before heavy or overhead pressing**, and overrides anything written here. "Cleared" is symptom- and capacity-based, not calendar-based.
