# Onboarding MVP — plan & hand-off

Status: **MVP shipped** (Sprint 7). This doc is the hand-off for the next agent: what exists, how
to test it (incl. the demo accounts seeded for each state), and the backlog for going beyond MVP.

> Read `CLAUDE.md` first for project commands + the **validation requirement** (UI changes must be
> verified in a real browser with Playwright). `release-cleanup.md` has the broader roadmap.

---

## What shipped (MVP)

A first-run onboarding experience on the **Today** page, made of two parts:

1. **Getting-started checklist** (`GettingStartedCard`) — 3 steps whose done-state is **derived from
   real account data** (nothing per-step is stored):
   - **Choose a training plan** — done when an active program exists → "Choose a plan" (→ Plans)
   - **Set your strength estimates** — done when any `*_one_rep_max` is saved → "Set estimates" (→ Settings)
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
| Onboarding domain *(new)* | `src/domains/onboarding/` — `onboarding-progress.ts` (pure, tested), `onboarding-tour.ts` (driver steps), `useOnboardingTour.ts` (hook), `GettingStartedCard.tsx`, `OnboardingPanel.tsx` (orchestrator) |
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
pnpm typecheck && pnpm lint && pnpm test     # 128 unit tests
pnpm e2e                                      # 11 e2e (incl. onboarding.spec.ts, desktop + mobile)
pnpm shot "/today?onboarding=force"           # eyeball the checklist
```
Prereqs: local Supabase up (project `sheetless`), `pnpm demo:seed` run, dev server on :3000.

---

## Backlog — beyond MVP (next agent: pick up here)

**High value**
- **In-session coach-marks** — the tour currently orients the app shell only. Add a one-time guided
  pass over the live session (RIR control, set row, finish button). Anchors don't exist yet on
  `LiveSetRow`/`LiveMovementCard`/`LiveSession` — add `data-tour` there. Gate on "first live session".
- **Tighter step deep-links** — "Set estimates" should open the e1RM calculator / scroll to the
  `#programme-loads` section in Settings (it already has that id); "Choose a plan" could open Find-my-plan.
- **Reduce redundancy** — for a no-program user, Today shows both the checklist *and* the "No active
  program" empty state. Consider letting the checklist replace the empty state when onboarding is active.

**Polish / robustness**
- **Funnel analytics** — emit events per step + tour start/skip/complete to see where users drop.
- **A11y / reduced-motion** — audit the driver popover (focus trap, `prefers-reduced-motion`).
- **Mobile tour QA** — confirm bottom-nav spotlight placement across devices (steps already pick
  `mnav-*` on `< 768px`).
- **"Skip for now" vs "Dismiss"** — currently one action completes onboarding; consider a softer skip
  that re-surfaces later.
- **Tour content** — copy polish / optional per-step illustrations.

**Decisions & gotchas (so they aren't re-litigated)**
- driver.js over react-joyride (React-19 peer-dep risk) / NextStep (Next.js-only) / onboardjs (headless flow engine).
- Durable state is the **server flag**; `localStorage` is only a transient *don't-re-pop* guard.
- The original Sprint-7 "estimate from a set / conservative defaults / how it adapts" scope **already
  existed** (Settings e1RM calculator, `TemplateStartValues` % sliders default 90% TM, the "Why these
  weights?" hint) — MVP delivered the missing *first-run guidance*, not those.
- **SSR hydration race**: clicks/fills before hydration silently no-op. Use the retry pattern
  (`expect.toPass`) — see `tests/e2e/support/auth.ts` and `onboarding.spec.ts`.
