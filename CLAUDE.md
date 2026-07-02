# Sheetless — agent guide

Beginner-friendly strength-training app (TanStack Start + React + Mantine, Supabase backend).
The canonical product/implementation spec lives in `main-app-spec.md`; go-live steps in
`release-checklist.md` + `RAILWAY.md`.

## Commands

```bash
pnpm dev               # dev server on http://localhost:3000
pnpm typecheck         # tsc --noEmit
pnpm test              # vitest (unit)
pnpm lint              # eslint
pnpm e2e               # Playwright e2e  (see tests/e2e/README.md)
pnpm shot /program     # screenshot any route as the logged-in demo user
pnpm demo:seed         # (re)create local demo users
```

## Validation — definition of done

Before calling a change done, run and confirm green:

1. **`pnpm typecheck`** and **`pnpm lint`** (0 errors).
2. **`pnpm test`** — add/extend unit tests for any new pure logic.
3. **For any UI change, validate in the real running app with Playwright** — don't rely on
   typecheck + unit tests alone:
   - Eyeball it: `pnpm shot <route>` (logs in as the demo user, screenshots — read the PNG).
   - Add/run an e2e flow in `tests/e2e/` for new interactive features and run `pnpm e2e`.

This is a hard requirement: UI bugs (hydration races, broken nav, disabled buttons, empty
states) repeatedly slip past typecheck/unit tests and only show up in a real browser.

### Gotcha: SSR hydration race

The app is server-rendered. A Playwright action that runs **before React hydrates** silently
no-ops (filled inputs reset, buttons stay disabled, clicks don't open modals). Use the resilient
pattern — retry the action until the expected result appears:

```ts
await expect(async () => {
  await thing.click()
  await expect(target).toBeVisible({ timeout: 1000 })
}).toPass({ timeout: 15000 })
```

See `tests/e2e/support/auth.ts` (`login()`) and `find-my-plan.spec.ts` for examples.

## Local environment

- Local Supabase runs as project **`sheetless`** (`pnpm exec supabase start`). If `supabase status`
  reports a different/missing container, the wrong project's stack is on the ports — stop it
  (`supabase stop --project-id <name>`) and start this one.
- Demo login: `demo.linear@sheetless.local` / `DemoPass123!` (also `demo.wave`, `demo.power`).
  Recreate with `pnpm demo:seed`.

## Onboarding state

- Today-page onboarding shows while the server flag `profiles.onboarding_completed` is false
  AND the account has zero completed sessions (training history implies onboarding is done).
  "Don't show again" confirms via a dialog before setting the flag; the guided tour auto-runs
  once per user per device (`sheetless.onboardingTourAutorun.<userId>`).
- Live-session onboarding uses the separate server flag `profiles.live_onboarding_dismissed`.
- The live walkthrough no longer auto-runs from localStorage. It is started from the optional
  `LiveSessionOnboarding` card or replayed with `/sessions/$sessionId?tour=live` from Settings.
- Keep `tests/e2e/live-coach-marks.spec.ts` deterministic by resetting `live_onboarding_dismissed`
  before testing the card, dismissal, and replay paths.

## Conventions

- Text/color via the design-system atoms/molecules (`Text`, `Heading`, `Caption`, `SectionLabel`,
  `Panel`, `StatCard`) and Mantine props; Tailwind classes for **layout only**. Lucide icons take a
  `color` prop, not a `text-[...]` class.
- Colocate label/copy constants near their domain (e.g. `bodyLoadTierLabels` in `body-load.ts`); no
  central strings file.
