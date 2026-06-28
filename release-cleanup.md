# Release Cleanup — Sheetless Beginner-Friendly Overhaul

> **Purpose.** Track the multi-sprint effort to make Sheetless understandable to beginners
> without stripping the powerlifting identity advanced users rely on. This file is the
> hand-off record so any future session can continue cold. Milestone 1 is shipped; the
> remaining sprints are specified below with file pointers and the reusable building blocks
> M1 introduced.

## The north star

> **Never make jargon the only way to understand what's happening.** Plain language explains
> the action; technical language stays as quiet, scannable proof. Make every adaptive decision
> visible. Treat tough sessions as useful data, not failure.

**Design principles (apply to every screen):**
1. Plain primary, technical companion ("~2 left" with a quiet `RIR 2`).
2. Replace only genuinely unclear/internal labels — keep credible lifting terms.
3. Preserve brand terms (Wave, Base/Peak, Accessory, Variation) — explain once, don't rename.
4. Make adaptive decisions visible ("what changed next time, and why").
5. Emotional safety on hard/failed/partial sessions.

**"Each page answers one beginner question":** Today → *What do I do now?* · Your Plan → *Where am
I, what's next?* · Insights → *Am I making progress?* · Records → *What are my best lifts?* ·
Plans → *Which plan should I choose?* · Session Summary → *What happened, and what changed next time?*

## Status at a glance

| Sprint | Theme | Status |
|---|---|---|
| 1 | Term system + quiet-companion notation | ✅ Done |
| 2 | Post-session coaching receipt | ✅ Done |
| 3 | Workout-logging clarity (RIR prompt, supportive copy, target-vs-actual) | ✅ Done |
| 5 | Muscle Fatigue cleanup (rename + tier labels) | ✅ Done |
| — | Surface renames (nav + labels) | ✅ Done |
| 4 | Your Plan (Program) page | ✅ Done |
| 6 | Plan recommendation flow ("Find my plan") | ✅ Done |
| 7 | Settings & onboarding (guided tour + checklist) | ✅ Done |
| — | Brand-term explainers (cross-cutting) | ⛔ Remaining |

Sprints are a vertical-slice numbering; Milestone 1 cut across 1/2/3/5 + renames.

---

## Term decision matrix (the design-system rule)

| Term | Decision | Status / Action |
|---|---|---|
| Completed Load | Replace | ✅ "Total weight lifted" |
| Body Load | Replace | ✅ "Muscle Fatigue" |
| Program (nav) | Replace | ✅ "Your Plan" |
| Templates (nav) | Replace | ✅ "Plans" |
| RIR | Pair | ✅ "~N left" + quiet `RIR N` |
| e1RM | Pair | ✅ "estimated max" + `e1RM` |
| AMRAP / `+` | Pair | ✅ "N or more" / `+` retained |
| training max | Keep + explain | ✅ Kept the label; explained via "Why these weights?" on the Plan page (the separate "Working load" state made "working max" too confusing) |
| top set | Pair | ✅ "best set" in summary; other sites later |
| Wave, Base/Peak, Accessory, Variation | Keep + explain | ⛔ Explainers not built yet |
| Records | Keep (low-pri) | — |
| Posterior Chain | Keep, explain | ⛔ helper text later |

**Implementation rule:** no central strings file — colocate label constants in lib files (see
`bodyRegionLabels` / `bodyLoadTierLabels` in `src/domains/history/lib/body-load.ts`). Reuse the
shared notation formatter rather than re-deriving strings.

---

## ✅ Completed in Milestone 1

**Behavioral change to note:** finishing a workout now routes to the **session summary**
(`/sessions/$sessionId/summary`) so the receipt is seen, then *Done* → Today.
Previously finish skipped straight to Today (`SessionPage.tsx` `finishMutation.onSuccess`).

**Deliberate scope boundary:** navigation-adjacent labels use the "Plan(s)" vocabulary, but the
deeply program-centric domain was **not** blanket-renamed — `CustomProgramBuilder` still says
"Create programme", template-card bodies still say "program". A full program→plan sweep is listed
under Remaining.

Key changed/added files:
- `src/shared/lib/set-notation.ts` *(new)* — `describeSet` / `describeLift` / `formatWeight` / `repsLeftLabel`.
- `src/components/molecules/SetSummary.tsx` *(new)* — plain + technical display.
- `src/domains/session/lib/session-receipt.ts` *(new)* — `buildSessionReceipt`, `summarizeMovementPerformance`.
- `src/shared/types/training.ts` — `ProgressionDecision.rationale`.
- `src/domains/program/lib/progression.ts` — `rationale` populated in every evaluator.
- `src/domains/session/components/SessionSummaryPage.tsx` — "What changed, and why" receipt + target-vs-actual.
- `src/domains/session/components/LiveSetRow.tsx` / `LiveMovementCard.tsx` — RIR `0/1/2/3+` + prompt/tooltips.
- `src/domains/session/components/SessionPage.tsx` / `Session.tsx` — supportive partial/hard-session copy.
- `src/domains/history/lib/body-load.ts` — `bodyLoadTierLabels`, `bodyLoadExplanation`.
- `src/domains/history/components/HistoryPage.tsx`, `TodayPage.tsx`, `ProgramSummaryGrid.tsx` — Muscle Fatigue rename + tier labels + fresh-copy fix.
- `src/components/AppShell.tsx` — nav "Your Plan" / "Plans".
- `src/domains/program/components/TemplateCatalogue.tsx` — "Choose a plan".
- `tests/set-notation.test.ts`, `tests/session-receipt.test.ts` *(new)*.

---

## Reusable building blocks (reuse these — don't rebuild)

- **Set notation** — `describeSet(set, units)` / `describeLift(values)` from `src/shared/lib/set-notation.ts`
  return `{ plain, technical, compact }`. Use for any weight×reps display. `SetSummary` molecule
  renders plain primary + quiet technical line.
- **Coaching receipt** — `buildSessionReceipt(session, summary?)` → `ReceiptEntry[]`
  (`{ movementName, learned, change, why, tone }`). Already handles decision / missed / incomplete /
  substitution. `summarizeMovementPerformance(movement, units)` → `{ goal, didReps, result, bestSet }`.
- **Progression "why"** — each `ProgressionDecision` now carries `rationale`. New methodologies should
  set it in their evaluator in `progression.ts`.
- **Muscle fatigue tiers** — `bodyLoadTierLabels[region.tier]` + `bodyLoadExplanation`; tiers already
  computed (`fresh`/`low`/`moderate`/`high`) on `BodyLoadRegion.tier`.
- **Empty states** — `EmptyState` molecule supports `centered` + `action`.

---

## ✅ Completed in Sprint 4 — Your Plan (Program) page

- **Next-workout hero** *(new `src/domains/program/components/ProgramNextWorkout.tsx`)* — full-width
  card on top, main lift highlighted + accessories + counts + position line ("Week X of Y · phase"),
  "Open session"/"Resume session". Wired into `ProgramPage.tsx`.
- `ProgramSummaryGrid.tsx` — dropped the old next-session card; now a 2-col row (Current position +
  Muscle Fatigue); Current-position info hint rewritten to explain **waves** in plain language.
- **"Why these weights?"** plain explainer on `CurrentLoadsCard` (`ProgramLoads.tsx`); kept the
  accurate "Training max"/"Working load" labels.
- **Locked → "Upcoming"** in `ProgramTimeline.tsx` with a reframe hint (loads open as you go).
- **Customization copy** reworded to "Tailored to you" (`ProgramLoads.tsx`).
- Decisions: hero on top · plain explainer (no per-lift math) · keep "Training max" + explain.

## ✅ Completed in Sprint 6 — Plan recommendation flow ("Find my plan")

- **Recommender** *(new `src/domains/program/lib/recommend-plan.ts`)* — pure `recommendPlan(templates, answers)`
  scoring built-in plans on experience level, training days, and goal (tag overlap). Unit-tested
  against the real catalog (`tests/recommend-plan.test.ts`).
- **Modal** *(new `src/domains/program/components/FindMyPlanModal.tsx`)* — 3 questions, live
  recommendation card (name / level / days / method / reason), "Start this plan" → setup flow.
- `TemplateCatalogue.tsx` — prominent "Find my plan" banner; built-in plans ordered beginner-first.
- **Validated in-browser with Playwright** (`tests/e2e/find-my-plan.spec.ts`) — caught and fixed an
  SSR hydration race on the open click (now a documented pattern in `CLAUDE.md`).
- Deferred: equipment matching (templates don't carry equipment metadata — would need to derive it
  from each plan's movements; not needed for a first pass).

## Testing / validation

Browser-based validation is now part of "done" — see `CLAUDE.md` and `tests/e2e/README.md`.
`pnpm shot <route>` screenshots any route as the logged-in demo user; `pnpm e2e` runs the suite
(login once → reuse session). Agents should validate UI changes this way, not just typecheck + unit.

## ✅ Completed in Sprint 7 — Onboarding (guided tour + getting-started checklist)

- **driver.js guided tour** *(new `src/domains/onboarding/`)* — `onboarding-tour.ts` (viewport-aware
  nav spotlights) + `useOnboardingTour.ts`; popover themed via `app.css` (`.vf-tour`). `data-tour`
  anchors added to `AppShell` (desktop + mobile nav).
- **Getting-started checklist** — `GettingStartedCard` + `OnboardingPanel` on Today; steps derive
  from real state via the pure, unit-tested `onboarding-progress.ts` (plan / estimates / first workout).
- **Server flag** — migration `…_add_onboarding_completed.sql`, `UserProfile.onboardingCompleted`,
  `completeOnboardingFn`; demo seed sets it true. Auto-runs once (localStorage guard); replayable from
  Settings ("Replay tour") and via `?onboarding=force` / `?tour=1` (used by the e2e).
- **Validated with Playwright** (`tests/e2e/onboarding.spec.ts`, desktop + mobile) — checklist renders,
  tour launches and steps through.
- Note: the original Sprint-7 "estimate from a set / start conservatively / explain adaptation" scope
  already existed (Settings e1RM calculator, conservative TM defaults, "Why these weights?" hint), so
  this sprint delivered the missing first-run guidance.

## ⛔ Remaining work

### Cross-cutting — brand-term explainers
- Small reusable helper-text/tooltip shown **once in context** for Wave / Base–Peak phase /
  Accessory / Variation / Posterior Chain. Don't rename them.

### Deferred (only if explicitly requested)
- **Full program→plan rename** across body copy + `CustomProgramBuilder` ("Create programme").
- Beginner/Advanced toggle — intentionally avoided (use guided defaults + quiet companions).
- All-caps → title-case restyle; renaming "Records" → "Best Lifts".

---

## How to verify / run

```bash
npm run typecheck     # tsc --noEmit
npm run test          # vitest run  (118 passing as of M1)
npm run lint          # eslint .    (pre-existing inline-Tailwind warnings only; 0 errors)
npm run dev           # vite dev — sign in with an active program
```

**Manual receipt check:** complete a session and open the summary; verify the "What changed, and
why" card across cases — progressed, held (log a grinder, RIR ≤ 1), missed (reps below target),
incomplete (finish with unlogged sets), substituted (swap an exercise).

---

## Decisions log
- Receipt is presentation over existing data: `inputSummary` / `recommendation` / `previousValue` /
  `recommendedValue` already existed; we added `rationale` (the "why") and the no-decision
  reassurance paths (missed / incomplete / substitution).
- Finish now navigates to the summary route (was `/today`) so the receipt is actually surfaced.
- Body Load internal type names (`BodyLoad*`) kept; only user-facing strings changed to "Muscle Fatigue".
- Nav vocabulary aligned to "Plan(s)"; broader domain rename deliberately deferred to avoid churn.
