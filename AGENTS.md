# Repository Guidelines

This file contains machine-facing implementation instructions. `README.md` is the sole
human-facing source for product scope, release state, architecture, the DSL, testing, and
deployment.

## Project Structure & Module Organization

This is `sheetless`, a TanStack Start/Vite React 19 + TypeScript app backed by Supabase. Code is organized **by domain**, not by file type.

- `src/domains/{account,program,session,history,movement,onboarding}/` — each domain owns its slice end to end:
  - `components/` — domain UI (organisms), PascalCase files.
  - `server/` — `createServerFn` handlers + Supabase data access (kebab-case files).
  - `lib/` — pure domain logic (kebab-case files).
  - `types.ts` — domain types shared by that domain's server and client.
  - `queries.ts` — React Query `queryOptions` for the domain.
  - `index.ts` — public barrel (types, queries, components). Never re-export server-only modules here so the client never bundles server code.
- `src/components/atoms` + `src/components/molecules` — shared, non-domain UI (PascalCase).
- `src/shared/{lib,server,types}` — cross-cutting helpers used by 3+ domains (e.g. `cn`, `dates`, `api-error`, `math`, `supabase`, `require-user`).
- `src/routes/` — thin TanStack file-route wrappers over domain components (this is the one folder that stays file-type based; required by the router). Never edit `src/routeTree.gen.ts`.
- `src/styles/` — Mantine theme + global base CSS. Tests in `tests/` (unit) and `tests/e2e/` (Playwright); migrations in `supabase/migrations/`.

Where to add new code: put it in the owning domain. Promote to `src/shared/*` only when 3+ domains need it. New shared UI primitives go in `atoms`/`molecules`; domain-specific UI goes in that domain's `components/`.

### Component size & ownership gates

- Route files should be adapters only: route declaration, loader, params/context extraction, and rendering one domain component. If a route file grows beyond roughly 40 lines, move the behavior into the owning domain before finishing.
- Domain page components should orchestrate data state and compose smaller components. Do not leave mixed query state, cards, lists, modals, and helper renderers in one large file.
- When a touched component approaches roughly 250-300 lines, split it by concern before adding more behavior. Prefer `ProgramTimeline.tsx`, `ProgramLoads.tsx`, `ProgramRecentSessions.tsx`, etc. over a single `ProgramPage.tsx` with many private components.
- Do not hide oversized route files by moving them whole into `domains/*/components`. Moving code is only the first step; split the component surface as part of the same change when the file remains large.

## Build, Test, and Development Commands

- `pnpm dev` starts the local Vite/TanStack Start dev server.
- `pnpm build` creates the production build and runs TypeScript checks.
- `pnpm typecheck` runs strict TypeScript checks without building.
- `pnpm lint` runs ESLint across the repository.
- `pnpm test` runs Vitest once; `pnpm test:watch` runs it interactively.
- `pnpm playwright` runs Playwright tests in `tests/e2e/`.
- `pnpm db:migrate:local` applies Supabase migrations to the local stack.
- `pnpm db:test` runs pgTAP database contracts against the local stack.
- `pnpm db:audit` runs the read-only release-integrity preflight against `SUPABASE_DB_URL`.
- `pnpm db:migrate:dry-run` previews remote migration changes using `SUPABASE_DB_URL`.
- `pnpm verify` runs the complete static, unit, build, PWA, bundle, architecture, documentation, and
  database-contract suite.

## Coding Style & Naming Conventions

Use strict TypeScript, ES modules, React JSX, two-space indentation, single quotes, and the existing semicolon-free style. Prefer the `~/` alias for imports from `src/`. Do not edit `src/routeTree.gen.ts` manually. Follow existing React Query and `createServerFn` patterns.

Naming: React components use PascalCase for both the file and the export (`PendingReview.tsx`). Utility, server, lib, query, and type files use kebab-case (`program-overview.ts`, `require-user.ts`). Hooks are `useThing.ts`. Routes keep TanStack file-route names.

### UI & styling (enforced)

Mantine is the only styling system. Use Mantine components, theme tokens, and the shared `atoms`/`molecules`.

- Tailwind is for **layout only**: flex/grid, `gap`, margin/padding, sizing, position, overflow, alignment.
- Do **not** use Tailwind/inline utilities for typography (`font-*`, `text-<size>`, leading/tracking), color, background, or border-color. An ESLint rule warns on these.
- Replace those with atoms/molecules and Mantine props: `Text` (with `tone`/`fw`/`size`/`truncate`), `Heading`, `SectionLabel`, `StatValue`, `Caption`, `Panel`, `StatCard`, and Mantine props like `c`, `bg`, `fw`, `size`, `variant`.
- `--vf-*` are theme tokens; consume them through components/Mantine props, never as inline arbitrary Tailwind color classes.
- Import shared UI from `~/components` (atoms + molecules). There are no `~/components/ui` or `~/components/workout` shims.
- For text, labels, captions, headings, metric values, and repeated inset surfaces, start with atoms/molecules before reaching for raw Mantine or ad-hoc markup.
- Acceptable Tailwind examples: `grid`, `flex`, `gap-3`, `mt-4`, `px-3`, `min-w-0`, `overflow-x-auto`, `items-center`, `justify-between`.
- Unacceptable Tailwind examples in touched code: text-size utilities, arbitrary CSS-variable text/background/border utilities, `font-bold`, `leading-relaxed`, `tracking-wide`, and `vf-section-label`.
- Before finalizing UI work, run `pnpm lint` and inspect warnings in files you touched. Existing repo warnings can remain, but new or moved warnings in touched files mean the UI cleanup is incomplete.

## Testing Guidelines

Use Vitest with `jsdom` for unit and domain tests. Name tests `*.test.ts` and keep e2e specs under `tests/e2e/*.spec.ts`. Add tests near the changed behavior, especially for template generation, progression, history, session cache, and server APIs. Run narrow checks first, then broaden to `pnpm test`, `pnpm lint`, and `pnpm build` for shared changes.

### Onboarding and walkthroughs

- First-run Today onboarding is controlled by `profiles.onboarding_completed`; the live-session onboarding card is controlled separately by `profiles.live_onboarding_dismissed`.
- The live workout walkthrough is optional. Do not auto-run it from localStorage or on fresh sessions; launch it from `LiveSessionOnboarding` or force replay with `/sessions/$sessionId?tour=live`.
- Keep live-session onboarding non-blocking: the user must be able to ignore the card and log the workout normally.
- Cover live walkthrough changes with Playwright. `tests/e2e/live-coach-marks.spec.ts` resets `live_onboarding_dismissed` before asserting card show, tour start, dismiss persistence, and `?tour=live` replay.

## Commit & Pull Request Guidelines

Recent history mixes imperative summaries with Conventional Commit prefixes, for example `feat: add custom program template functionality` and `Refactor program state management`. Use short imperative subjects; add `feat:`, `fix:`, or `refactor:` when helpful. PRs should describe the user-visible change, mention migrations or env changes, link related plans, include screenshots for UI work, and list validation commands.

## Security & Configuration Tips

Never commit real secrets. Keep local values in `.env` and mirror required keys in `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_ORIGIN`, and `SUPABASE_DB_URL`. For schema changes, add a new timestamped SQL file under `supabase/migrations/`; do not rewrite applied migrations unless explicitly requested.

Workout saving is online-only. Keep optimistic edits in the account-scoped React Query cache with
explicit saving/failure/retry states. Do not add a durable local database or offline replay queue
without an explicit product/architecture decision in `README.md`.

## Workspace & Data-Access Architecture (expo-refactor)

The repo is a pnpm workspace: `apps/web` (TanStack Start), `apps/native` (Expo), and shared
packages consumed as TypeScript source. Layering is `@sheetless/domain` < `@sheetless/data` <
apps, enforced by `architecture:check`:

- `packages/domain` — pure, framework-free training logic and types. May not import React,
  UI runtimes, `@supabase`, `@tanstack`, or `~/` aliases.
- `packages/data` — every data-access function, shaped `fn(ctx: UserContext, input)` where
  `UserContext = { supabase, user }`. May import `@supabase/supabase-js` **types only**.
  Auth acquisition never lives here: web builds ctx from its cookie server client
  (`requireUser`), native from its stored session.
- App server files are thin `createServerFn` wrappers. A wrapper that also exports plain
  helpers must load `@sheetless/data` via dynamic import inside function bodies — a static
  import survives the client transform and bloats the browser bundle.
- Old `apps/web` import paths resolve through one-line re-export shims onto the packages;
  retire shims opportunistically, never at the cost of a noisy diff.

### apps/native gates

`apps/native` has its own ESLint and Vitest setup; it is covered by the recursive `pnpm lint` and
`pnpm test`, and by `pnpm verify:native`.

- Route files under `src/app/` are adapters: params in, one feature screen out, 10 lines or fewer
  (`_layout.tsx` files are shells and exempt). Feature and component `.tsx` files cap at 300 lines.
  `src/components/**` may not import `@/features/**`. All four are enforced by `architecture:check`.
- The design system styles with inline objects resolved from `useTokens()`. `StyleSheet.create` is
  banned, as are the `window`, `document`, and `localStorage` globals outside `*.web.ts(x)` variants.
- Native tests alias `react-native` to `react-native-web`, so they cover hooks, state machines, and
  cache helpers only — never layout, `measureInWindow`, `Modal`, or SVG. Put new logic in
  `packages/domain` where it is genuinely testable, and keep native files to state plus wiring.
- `pnpm verify:native` runs a real Metro bundle. Run it after touching imports, platform variants,
  assets, or anything under `src/app/`; `tsc --noEmit` cannot see those failures.
- `react-hooks/set-state-in-effect` is a warning-level backlog (mostly the "reset a sheet's local
  state when it opens" idiom). Do not add new occurrences.
