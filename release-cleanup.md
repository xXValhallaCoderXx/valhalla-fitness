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
| **4** | **Your Plan (Program) page** | ⛔ Remaining |
| **6** | **Plan recommendation flow ("Find my plan")** | ⛔ Remaining |
| **7** | **Settings & onboarding** | ⛔ Remaining |
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
| training max | Pair | ⚠️ Partial — still `TM` in places (Sprint 4) |
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

## ⛔ Remaining work

### Sprint 4 — Your Plan (Program) page
*Question to answer: "Where am I, and what's next?"*
- Make a **"Next workout"** card the dominant element (reuse `ProgramOverview.nextSession`).
- Add **"Why these weights?"** — explain working loads in plain terms (reuse `ProgramOverview.stateValues`
  for working max + `MovementSlot.previous` comparable; the new `rationale` pattern is the model).
- Explain **locked weeks** as adaptive planning rather than a restriction.
- Reword the customized-plan copy; explain the current **Wave** in plain language (one line).
- Pair `training max` → "working max" (with quiet `TM`) on this page.
- Files: `src/domains/program/components/ProgramPage.tsx`, `ProgramTimeline.tsx`, `ProgramLoads.tsx`
  (`CurrentLoadsCard`, `ProgramLoadChips`, `CustomizationCard`), `ProgramSummaryGrid.tsx`,
  `ProgramRecentSessions.tsx`.

### Sprint 6 — Plan recommendation flow ("Find my plan")
*Question to answer: "Which plan should I choose?"*
- Add a **"Find my plan"** entry on the Plans page: 3–4 questions (experience, days/week, goal,
  equipment) → recommend **one** plan with a one-line reason; keep the full library accessible.
- Make the beginner plan visibly prominent.
- Reuse `ProgramTemplateSummary` fields (`tags`, `complexity`, `daysPerWeek`, `progressionLabel`,
  `requiredState`) for matching; no new server data needed for a first pass.
- Files: `src/domains/program/components/TemplateCatalogue.tsx`, `TemplatesPage`, `TemplateStartPage`.

### Sprint 7 — Settings & onboarding
*Question to answer: "How do I set up Sheetless safely?"*
- Make **"Estimate from a recent set"** the primary starting-strength path (vs. typing a 1RM).
- Add a **"Start conservatively"** option and guardrails/warnings for unusual estimates.
- First-run explainer of how Sheetless adapts loads after each session.
- Files: `src/domains/account/...` `SettingsPage`, `OneRepMaxCalculatorModal`,
  `src/domains/program/components/TemplateStartValues.tsx`.

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
