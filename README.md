# Sheetless

Mobile-first strength training tracker built with TanStack Start, React Query, Mantine, and Supabase.

The app is focused on a reliable gym workflow:
- pick or start a structured program,
- see what is planned for today,
- log sets quickly (load/reps/RIR/RPE),
- finish the session,
- review progression and history.

## Current status

This repository is in active MVP development and architecture cleanup.

- The app works end-to-end for auth, program start, live session logging, optional onboarding walkthroughs, summary, program view, and history.
- A domain-colocation refactor is in progress (`src/domains/*`, `src/shared/*`), while some legacy paths still coexist (`src/lib`, `src/server`).
- UI conventions are shifting to Mantine-first primitives (`src/components/atoms`, `src/components/molecules`) with Tailwind used for layout only.

## Core routes

- `/today` — current workout, resume active session, pending progression context
- `/program` — active program overview and progression context
- `/history` — recent sessions, body-load/history analytics
- `/templates` — template/program library
- `/templates/:templateId/start` — program setup/start flow
- `/sessions/:sessionId` — live workout session with optional in-session walkthrough
- `/sessions/:sessionId/summary` — post-session summary
- `/settings` — units/theme/preferences/account settings
- `/auth` + `/auth/callback` — sign-in and auth callback

## Tech stack

- **App/runtime**: TanStack Start + Vite, React 19, TypeScript
- **Data**: Supabase Auth + Postgres (RLS-backed)
- **Client data layer**: TanStack React Query
- **UI**: Mantine + theme tokens, Tailwind v4 (layout utilities)
- **Local cache/offline helpers**: Dexie
- **Testing**: Vitest + Playwright

## Prerequisites

- Node.js 22+ (repo is pinned to Node 22 in `engines`)
- pnpm (via Corepack)
- Supabase CLI (for local migrations / local DB workflow)

## Quick start

1. Install dependencies

```sh
corepack enable
pnpm install
```

2. Configure environment

```sh
cp .env.example .env
```

3. (Optional but recommended) run local Supabase and apply local migrations

```sh
pnpm run db:migrate:local
```

4. (Optional) seed demo data

```sh
pnpm run demo:seed
```

5. Start dev server

```sh
pnpm dev
```

## Environment variables

See `.env.example` for full comments. Main variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_ORIGIN`
- `AUTH_ALLOWLIST_ENABLED` / `AUTH_PASSWORD_ENABLED` — auth policy. Production is Magic Link + Google
  sign-in (password off); see `release-checklist.md`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side scripts only)
- `SUPABASE_DB_URL` (migration scripts only)

## Useful scripts

- `pnpm dev` — run local dev server
- `pnpm build` — production build + typecheck
- `pnpm start` — run Nitro server output
- `pnpm typecheck` — TypeScript checks
- `pnpm lint` — ESLint
- `pnpm test` / `pnpm test:watch` — Vitest
- `pnpm playwright` — Playwright tests
- `pnpm db:migrate:local` — apply migrations to local Supabase
- `pnpm db:migrate` — apply migrations using `SUPABASE_DB_URL`
- `pnpm db:migrate:dry-run` — dry-run remote migrations
- `pnpm demo:{seed|reset|refresh|verify|list}` — demo-data helpers

## Project layout

```text
src/
  routes/                 TanStack file routes (thin wrappers)
  domains/                Domain-owned code (in progress)
    account/
    program/
    session/
    history/
    movement/
    onboarding/
  shared/                 Cross-domain shared code
    lib/
    server/
    types/
  components/
    atoms/                UI primitives
    molecules/            Reusable composites
  styles/                 Mantine theme + global styles
```

## UI conventions

- Mantine is the primary styling system.
- Tailwind is reserved for **layout** concerns (grid/flex/spacing/sizing/position/overflow).
- Avoid inline Tailwind typography/color/background/border-color utilities in app code.
- Prefer shared atoms/molecules + Mantine props and theme tokens.

## Onboarding

- Today-page onboarding uses the server flag `profiles.onboarding_completed`.
- Live-session onboarding is separate and uses `profiles.live_onboarding_dismissed`, so dismissing the workout card persists across devices.
- The live workout walkthrough is opt-in from the live session card. Settings can still replay it by navigating to an active session with `?tour=live`.

See `AGENTS.md` for the latest contributor/developer rules.

## Deployment (Railway)

Deployment guidance lives in `RAILWAY.md`. Key points:

- Standard commands:
  - build: `pnpm build`
  - start: `pnpm start`
- Run migrations as a **pre-deploy step**:
  - `pnpm run db:migrate`
- Ensure `APP_ORIGIN` matches your public Railway URL.
- Configure Supabase auth callback URL:
  - `https://<your-domain>/auth/callback`

## Reference docs

- `main-app-spec.md` — canonical product scope, training model, and implementation spec
- `release-checklist.md` — production go-live checklist (sign-ups, Supabase, Resend, Railway)
- `RAILWAY.md` — deployment details + required env vars
- `AGENTS.md` — repository structure and coding conventions
- `CLAUDE.md` — agent/contributor guide (commands, validation, conventions)
