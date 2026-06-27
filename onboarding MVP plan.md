# Onboarding MVP — plan & hand-off

Status: **MVP shipped** (Sprint 7); **iteration 2 shipped** (in-session coach-marks, checklist
deep-links, reduced redundancy, funnel analytics, reduced-motion/a11y, soft "Skip for now"). This
doc is the hand-off for the next agent: what exists, how to test it (incl. the demo accounts seeded
for each state), and what's left.

> Read `CLAUDE.md` first for project commands + the **validation requirement** (UI changes must be
> verified in a real browser with Playwright). `release-cleanup.md` has the broader roadmap.

---

## What shipped (MVP)

A first-run onboarding experience on the **Today** page, made of two parts:

1. **Getting-started checklist** (`GettingStartedCard`) — 3 steps whose done-state is **derived from
   real account data** (nothing per-step is stored):
   - **Set your strength estimates** *(shown first — a workout needs maxes)* — done when **every** main-lift `*_one_rep_max` is saved (all 5 — squat/bench/deadlift/OHP/row, via `hasAllStrengthEstimates`) → "Set estimates" (→ Settings, opens the estimates coach-marks)
   - **Choose a training plan** — done when an active program exists → "Choose a plan" (→ Plans)
   - **Finish your first workout** — done when ≥1 completed session exists
   - All done → "You're all set 🎉"; **Dismiss/Done** marks onboarding complete.
2. **Guided tour** (driver.js) — welcome → spotlights each nav item (Today / Your Plan / Insights /
   Plans) → "your first steps". Viewport-aware (desktop top-nav vs mobile bottom-bar).

**Durable state**: `profiles.onboarding_completed` (server). Onboarding is *active* when
`user && (!onboardingCompleted || forced)`. The tour **auto-runs once per device** for genuine new
users (guarded by a `localStorage` flag); it's always replayable.

### Flows
- **Brand-new user** → checklist (all empty) + tour auto-runs once.
- **Mid-onboarding** → checklist persists with live progress; tour won't re-pop (button still works).
- **All steps done** → "You're all set" + Done.
- **Dismiss/Done** → `completeOnboardingFn` sets the flag true → onboarding hidden (syncs across devices).
- **Replay** → Settings → Data & Sync → "Replay tour".
- **Force (QA/e2e)** → `/today?onboarding=force` or `/today?tour=1` shows it regardless of the flag.

---

## Architecture / files

| Area | Files |
|---|---|
| Onboarding domain | `src/domains/onboarding/` — `onboarding-progress.ts` (pure: progress + `isOnboardingSnoozed`), `onboarding-tour.ts` (`buildOnboardingSteps` + `buildLiveSessionSteps`), `useOnboardingTour.ts` (instrumented hook, takes a step builder), `useOnboardingActive.ts` *(new — shared active/forced/snooze gate)*, `GettingStartedCard.tsx`, `OnboardingPanel.tsx` |
| Shared utils *(new)* | `src/shared/lib/analytics.ts` (`track` + `setAnalyticsSink`), `src/shared/lib/reduced-motion.ts` (`prefersReducedMotion`) |
| Live coach-marks *(new)* | `data-tour="live-*"` anchors on `LiveMovementCard`/`LiveSetRow`/`LiveSession`; first-session trigger + `?tour=live` in `SessionPage.tsx`; "Replay walkthrough" in `SettingsPage.tsx` |
| Deep-links *(new)* | `validateSearch` on `/templates` (`find`) + `/settings` (`focus`) + `/sessions/$sessionId/` (`tour`); handlers in `TemplateCatalogue.tsx` / `SettingsPage.tsx` |
| Server flag | migration `supabase/migrations/202606270001_add_onboarding_completed.sql`; `UserProfile.onboardingCompleted` (`src/shared/types/training.ts`); `getMeFn` + `completeOnboardingFn` (`src/domains/account/server/profile-functions.ts`) |
| Tour anchors | `src/components/AppShell.tsx` — `data-tour="nav-*"` (desktop) + `data-tour="mnav-*"` (mobile) |
| Tour theme | `src/styles/app.css` — `@import "driver.js/dist/driver.css"` + `.driver-popover.vf-tour` overrides |
| Wiring | `TodayPage.tsx` renders `<OnboardingPanel />` (all 3 Today states); `SettingsPage.tsx` "Replay tour" |
| Tests | `tests/onboarding-progress.test.ts` (unit), `tests/e2e/onboarding.spec.ts` (Playwright, desktop+mobile) |

Dependency added: **driver.js** `^1.6.0` (zero-dependency, framework-agnostic — chosen to avoid React-19 peer-dep risk).

---

## Demo accounts for testing each state

All use password **`DemoPass123!`**. Recreate with `pnpm demo:seed` (defined in `scripts/demo-data.mjs`).

| Account | Onboarding | Checklist state |
|---|---|---|
| `demo.linear@sheetless.local` (Maya) | **completed** (hidden) | populated, clean demo |
| `demo.wave@sheetless.local` (Alex) | completed | populated |
| `demo.power@sheetless.local` (Jordan) | completed | populated |
| `demo.new@sheetless.local` (Sam) | **active** | all empty → first-run + tour auto-runs |
| `demo.estimates@sheetless.local` (Riley) | active | estimates ✓ only (no plan/sessions) |
| `demo.started@sheetless.local` (Casey) | active | plan ✓ + estimates ✓, workout ✗ (program, 0 completed) |
| `demo.ready@sheetless.local` (Jamie) | active | all ✓ → "You're all set" (6 completed, not yet dismissed) |

**View a state quickly:**
```bash
# log in as a specific account and screenshot (overrides the cached session)
rm -f tests/e2e/.auth/user.json
E2E_DEMO_EMAIL=demo.new@sheetless.local pnpm shot /today fresh.png
# ...then restore the default session for the e2e suite:
rm -f tests/e2e/.auth/user.json && pnpm e2e:auth
```
Or just sign in through the UI, or use `/today?onboarding=force` on any account.

---

## How to verify

```bash
pnpm typecheck && pnpm lint && pnpm test     # 138 unit tests
pnpm e2e                                      # 21 e2e (onboarding + live-coach-marks, desktop + mobile)
pnpm shot "/today?onboarding=force"           # eyeball the checklist
```
Prereqs: local Supabase up (project `sheetless`), `pnpm demo:seed` run, dev server on :3000.

---

## Iteration 2 — shipped (the former beyond-MVP backlog)

- **In-session coach-marks** — `buildLiveSessionSteps()` drives a 5-step live tour (movement →
  weight → RIR → complete → finish) over the `data-tour="live-*"` anchors. It is launched from the
  optional `LiveSessionOnboarding` card, permanently dismissed with
  `profiles.live_onboarding_dismissed`, forceable with `?tour=live`, and replayable from Settings →
  Data & Sync ("Replay walkthrough" — navigates to the active session, disabled when there's none).
- **Step deep-links** — "Choose a plan" → `/templates?find=true` (auto-opens Find-my-plan); "Set
  estimates" → `/settings?focus=estimates` (scrolls to `#programme-loads` **and runs the estimates
  coach-marks** — `buildEstimatesSteps` spotlights the inputs `data-tour="settings-estimates"` then the
  "Calculate from known sets" button `data-tour="settings-e1rm-calc"`). Both handlers clear the
  param after firing.
- **Reduced redundancy** — `TodayPage` hides the "No active program" empty state when
  `useOnboardingActive()` is true; the checklist's "Choose a plan" CTA covers it.
- **Funnel analytics** — provider-agnostic `track(event, props)` (no-op/console until
  `setAnalyticsSink` is wired). Events: `onboarding_tour_{start,step_view,complete,skip}` (`tour:
  'app'|'live'`), `onboarding_checklist_cta`, `onboarding_{dismiss,snooze}`, `onboarding_deeplink`,
  `live_onboarding_{start_tour,dismiss}`.
  Complete-vs-skip is read from driver.js `onDestroyStarted` + `isLastStep()`.
- **A11y / reduced-motion** — tour `animate`/`smoothScroll` + the estimates scroll honour
  `prefersReducedMotion()`; an `@media (prefers-reduced-motion)` guard in `app.css` kills tour
  transitions; the RIR control gained `role="group"` + `aria-label`. driver.js keyboard/focus left on.
- **Mobile tour QA** — every onboarding + live-coach-marks e2e runs under the `mobile-chrome`
  (Pixel 5) project; the tour advances via `mnav-*` there.
- **Soft "Skip for now"** — the checklist shows **Skip for now** (snooze, localStorage
  `sheetless.onboardingSnoozeUntil`, `ONBOARDING_SNOOZE_MS` = 7 days, read SSR-safely via
  `useSyncExternalStore`) next to **Don't show again** (the permanent server-flag path).

## Remaining / future (next agent: pick up here)

- **Wire a real analytics provider** — call `setAnalyticsSink(...)` (PostHog/Plausible/…) once one is
  chosen; the event names and call sites are already in place. No provider is shipped.
- **Per-step tour illustrations** — copy is consistent and polished; optional imagery is still open.
- **Snooze re-surface nudge** — after 7 days the checklist simply returns; a subtle "resume setup"
  affordance could be friendlier.

**Decisions & gotchas (so they aren't re-litigated)**
- driver.js over react-joyride (React-19 peer-dep risk) / NextStep (Next.js-only) / onboardjs (headless flow engine).
- Durable state is the **server flag**; `localStorage` is only a transient *don't-re-pop* / snooze guard.
- **TanStack search coercion**: `?find=1` parses to the *number* `1`, so onboarding flag params use
  booleans/strings (`?find=true`, `?tour=live`) and the `?tour=1` force now uses `String(...) === '1'`.
- **driver.js teardown**: the public `instance.destroy()` does *not* re-fire `onDestroyStarted`, so the
  unmount-cleanup destroy is silent — only user closes emit complete/skip. No guard flag needed.
- **`react-hooks/set-state-in-effect`** (eslint v7): forbids `setState` in an effect body. Read
  client-only/URL state with `useSyncExternalStore` or seed `useState`; the Find-my-plan auto-open is
  the one justified exception (URL→modal sync, scoped `eslint-disable`).
- **SSR hydration race**: clicks/fills before hydration silently no-op. Use the retry pattern
  (`expect.toPass`) — see `tests/e2e/support/auth.ts` and `onboarding.spec.ts`.
- **Client-nav double-mount**: a client-side route transition mounts the destination component
  **twice while preserving refs** (a fresh `page.goto`/SSR hydration does not). A one-shot effect
  guarded by a `useRef` flag breaks: the throwaway mount consumes the guard and the surviving mount
  skips. The estimates coach-marks trigger therefore keys off the (stable) `?focus` param + a
  self-clearing timer with **no ref guard** (SettingsPage), and e2e covers the **client-nav** path
  (click the CTA), not just `goto`.
