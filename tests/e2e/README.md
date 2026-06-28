# End-to-end tests (Playwright)

Browser tests that drive the real app as a signed-in user. The project uses
**Playwright** (not Puppeteer).

## Prerequisites

1. Local Supabase running for **this** project (`pnpm exec supabase start`).
2. Demo users seeded: **`pnpm demo:seed`** (creates `demo.linear@sheetless.local` / `DemoPass123!`).
3. Dev server on `http://localhost:3000` (`pnpm dev`) — Playwright reuses it if already running, otherwise starts one.
4. A Chromium-based browser. On macOS the config auto-detects Google Chrome, so no
   `playwright install` download is needed. To force a specific binary, set
   `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Running

```bash
pnpm e2e                       # full suite (headless)
pnpm e2e --project=desktop-chrome
pnpm e2e tests/e2e/login.spec.ts
pnpm e2e:auth                  # just refresh the saved login session
```

### Watching the browser (headed)

```bash
pnpm e2e --headed              # visible browser  (alias: pnpm e2e:headed)
pnpm e2e --ui                  # interactive UI mode — best for watching/debugging (alias: pnpm e2e:ui)
pnpm e2e --debug               # headed + step-through inspector
HEADED=1 pnpm e2e              # same as --headed (env form)
```

Slow it down to actually follow along: `pnpm e2e --headed -- --workers=1` and add
`use: { launchOptions: { slowMo: 300 } }` or pass per-run via the UI.

## How auth works (the resilient bit)

- `auth.setup.ts` logs in **once** via the UI and saves the session to
  `tests/e2e/.auth/user.json` (git-ignored).
- The `desktop-chrome` / `mobile-chrome` projects `dependencies: ['setup']` and
  load that `storageState`, so every test **starts already logged in** — fast,
  and no repeated login flakiness.
- Tests that need the logged-out state (the login flow, the auth screen) opt out
  with `test.use({ storageState: { cookies: [], origins: [] } })`.
- `support/auth.ts` exports `login(page)` and `DEMO_USER`. `login()` re-fills the
  form until React hydrates and enables the submit button — the auth form is
  server-rendered, so a single `fill()` can land before hydration and get reset.

## Stateful profile flags

- Some e2e flows mutate server-backed profile flags. Reset those flags in `beforeEach` instead of
  relying on a freshly seeded database.
- `live-coach-marks.spec.ts` resets `profiles.live_onboarding_dismissed` through a separate Supabase
  client before testing the in-session onboarding card and `?tour=live` replay. Do not sign out that
  helper client after the reset; with Supabase auth, doing so can invalidate the shared browser
  storage state used by the test projects.

## Agent / ad-hoc screenshots

Eyeball any route as the logged-in demo user:

```bash
pnpm shot                      # /today   -> agent-shot.png
pnpm shot /program             # /program -> agent-shot.png
pnpm shot /history insights.png
pnpm shot /program --headed    # watch the browser (or HEADED=1)
```

It reuses the saved session (logging in + caching it if missing/expired). Handy
for verifying a UI change in the real app during development.
