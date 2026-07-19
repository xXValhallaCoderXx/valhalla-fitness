# Sheetless

Strength training tracker with a TanStack Start web application, an Expo native application, shared
TypeScript packages, and a Supabase backend.

The app is focused on a reliable gym workflow:
- pick or start a structured program,
- see what is planned for today,
- log sets quickly (load/reps/RIR/RPE),
- finish the session,
- review progression and history.

## Current status

This repository is in active MVP development and architecture cleanup.

- The app works end-to-end for auth, program start, live session logging, optional onboarding walkthroughs, summary, program view, and history.
- The full-stack SSR web app and mobile API live in `apps/web`.
- The Expo Router development app lives in `apps/mobile`.
- Platform-neutral logic, API contracts, and design tokens live in `packages/*`.

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

- **Web/runtime**: TanStack Start + Vite, React 19, TypeScript
- **Native**: Expo Router + React Native
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
- `pnpm dev:web` / `pnpm dev:mobile` — run a specific application
- `pnpm build` — production build + typecheck
- `pnpm start` — run Nitro server output
- `pnpm typecheck` — TypeScript checks
- `pnpm lint` — ESLint
- `pnpm test` / `pnpm test:watch` — Vitest
- `pnpm test:shared` / `pnpm test:mobile` / `pnpm test:all` — workspace suites
- `pnpm typecheck:shared` / `pnpm typecheck:mobile` — workspace typechecks
- `pnpm expo:doctor` — validate the Expo project
- `pnpm playwright` — Playwright tests
- `pnpm db:migrate:local` — apply migrations to local Supabase
- `pnpm db:migrate` — apply migrations using `SUPABASE_DB_URL`
- `pnpm db:migrate:dry-run` — dry-run remote migrations
- `pnpm demo:{seed|reset|refresh|verify|list}` — demo-data helpers

## Project layout

```text
apps/
  web/                    TanStack Start SSR app + /api/v1 mobile routes
    src/                  Routes, domains, shared web code, and styles
    tests/                Vitest, API integration, and Playwright tests
  mobile/                 Expo Router native app
packages/
  api/                    API schemas, query keys, and typed fetch client
  core/                   Platform-neutral session types and pure helpers
  tokens/                 Shared semantic design tokens
supabase/                 Local configuration and migrations
scripts/                  Repository-level database and admin tooling
```

## UI conventions

- Mantine is the primary styling system.
- Tailwind is reserved for **layout** concerns (grid/flex/spacing/sizing/position/overflow).
- Avoid inline Tailwind typography/color/background/border-color utilities in app code.
- Prefer shared atoms/molecules + Mantine props and theme tokens.

## Onboarding

- Today-page onboarding shows while the server flag `profiles.onboarding_completed` is false and the account has zero completed sessions; "Don't show again" confirms via a dialog before setting the flag.
- Live-session onboarding is separate and uses `profiles.live_onboarding_dismissed`, so dismissing the workout card persists across devices.
- The live workout walkthrough is opt-in from the live session card. Settings can still replay it by navigating to an active session with `?tour=live`.

See `AGENTS.md` for the latest contributor/developer rules.

## Deployment (Render)

Deployment guidance lives in `RENDER.md`. Key points:

- Leave Render's Root Directory empty so the full pnpm workspace is available.
- Build with `pnpm install --frozen-lockfile && pnpm build`; start with `pnpm start`.
- Run migrations as a **pre-deploy step**:
  - `pnpm run db:migrate`
- Ensure `APP_ORIGIN` matches the canonical public Render domain.
- Configure Supabase auth callback URL:
  - `https://<your-domain>/auth/callback`

## Reference docs

- `main-app-spec.md` — canonical product scope, training model, and implementation spec
- `release-checklist.md` — production go-live checklist (sign-ups, Supabase, Resend, Render)
- `RENDER.md` — monorepo deployment details + required environment variables
- `AGENTS.md` — repository structure and coding conventions
- `CLAUDE.md` — agent/contributor guide (commands, validation, conventions)
