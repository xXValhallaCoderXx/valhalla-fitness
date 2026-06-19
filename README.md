# Workout Comeback — 5/3/1 FSL Tracker

A simple, single-user, installable PWA for tracking a 5/3/1 First-Set-Last strength
comeback. Open → see today's session with auto-calculated weights → tap-log the top
set → get auto-suggested progression. Built to be effortless one-handed in the gym.

The full program spec lives in [`docs/Ultimate-workout-plan.md`](docs/Ultimate-workout-plan.md).

## Run it

```bash
npm install      # first time only
npm run dev      # dev server (http://localhost:5173)
npm run build    # typecheck + production build → dist/
npm test         # watch mode
npm run test:run # one-shot tests
```

## How it works

- **`src/engine/`** — the pure, fully-tested program logic (no React, no IO):
  `math` (e1RM/TM/weights), `cycle` (session generation), `progression`
  (end-of-cycle TM bands), `hints` (within-session advice), `accessories`,
  `schedule`. `program-config.ts` is the canonical program definition.
- **`src/state/`** — the single JSON state document: `types`, `schema` (zod +
  seed + migrate), `persistence` (IndexedDB cache), `store` (zustand), `selectors`.
- **`src/routes/`** — screens: `Today` (core loop), `Progress`, `Accessories`,
  `Mobility`, `Settings`, `Onboarding` (first-run TM wizard).

Data currently lives **on-device** (IndexedDB) with JSON export/import backup in
Settings. Cross-device sync behind a password (Vercel + KV) is Phase 3.

## Status

- ✅ Phase 0 — scaffold (Vite + React + TS + Tailwind v4)
- ✅ Phase 1 — engine + 33 passing tests
- ✅ Phase 2 — state layer + core loop UI (local-only)
- ⬜ Phase 3 — auth + cross-device sync (Vercel KV)
- ⬜ Phase 4 — PWA (installable + offline)
- ⬜ Phase 5–7 — progress charts, accessory logging, mobility metrics
- ⬜ Phase 8 — hardening + deploy

## Deploy (planned, Phase 3+)

Standalone Vercel project. Auth = single password validated server-side against an
env var (`APP_PASSWORD`), issuing an HttpOnly JWT. State stored as one JSON doc in
Vercel KV (Upstash). See the spec for the full build plan.
