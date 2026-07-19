# Repository Guidelines

## Project Structure & Module Organization

This is the `sheetless` pnpm workspace: a TanStack Start/Vite React 19 web app, an Expo native app,
shared TypeScript packages, and Supabase. Web code is organized **by domain**, not by file type.

- `apps/web/src/domains/{account,program,session,history,movement,onboarding}/` — each web domain owns its slice end to end:
  - `components/` — domain UI (organisms), PascalCase files.
  - `server/` — `createServerFn` handlers + Supabase data access (kebab-case files).
  - `lib/` — pure domain logic (kebab-case files).
  - `types.ts` — domain types shared by that domain's server and client.
  - `queries.ts` — React Query `queryOptions` for the domain.
  - `index.ts` — public barrel (types, queries, components). Never re-export server-only modules here so the client never bundles server code.
- `apps/web/src/components/atoms` + `apps/web/src/components/molecules` — shared, non-domain web UI (PascalCase).
- `apps/web/src/shared/{lib,server,types}` — web cross-cutting helpers used by 3+ domains.
- `apps/web/src/routes/` — thin TanStack file-route wrappers over domain components. Never edit `apps/web/src/routeTree.gen.ts`.
- `apps/mobile/` — Expo Router routes, native features, and Jest tests.
- `packages/{api,core,tokens}/` — platform-neutral contracts, logic, and semantic design tokens.
- `apps/web/src/styles/` — Mantine theme + global CSS. Web tests are in `apps/web/tests/`; migrations stay in `supabase/migrations/`.

Where to add new web code: put it in the owning domain. Promote to `apps/web/src/shared/*` only when
3+ web domains need it. Promote platform-neutral code to `packages/*` only when web and native both
consume it. New shared web UI primitives go in `atoms`/`molecules`; domain-specific UI goes in that
domain's `components/`.

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
- `pnpm playwright` runs Playwright tests in `apps/web/tests/e2e/`.
- `pnpm dev:mobile`, `pnpm typecheck:mobile`, and `pnpm test:mobile` operate on the Expo app.
- `pnpm typecheck:shared` and `pnpm test:shared` validate the platform-neutral packages.
- `pnpm db:migrate:local` applies Supabase migrations to the local stack.
- `pnpm db:migrate:dry-run` previews remote migration changes using `SUPABASE_DB_URL`.

## Coding Style & Naming Conventions

Use strict TypeScript, ES modules, React JSX, two-space indentation, single quotes, and the existing semicolon-free style. In the web package, prefer the `~/` alias for imports from `apps/web/src/`. Do not edit `apps/web/src/routeTree.gen.ts` manually. Follow existing React Query and `createServerFn` patterns.

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

Use Vitest with `jsdom` for web unit and domain tests. Name tests `*.test.ts` and keep e2e specs under `apps/web/tests/e2e/*.spec.ts`. Native tests use Jest Expo under `apps/mobile/tests/`; shared packages use their package-local Vitest configs. Add tests near changed behavior, then broaden to the root validation commands.

### Onboarding and walkthroughs

- First-run Today onboarding is controlled by `profiles.onboarding_completed`; the live-session onboarding card is controlled separately by `profiles.live_onboarding_dismissed`.
- The live workout walkthrough is optional. Do not auto-run it from localStorage or on fresh sessions; launch it from `LiveSessionOnboarding` or force replay with `/sessions/$sessionId?tour=live`.
- Keep live-session onboarding non-blocking: the user must be able to ignore the card and log the workout normally.
- Cover live walkthrough changes with Playwright. `apps/web/tests/e2e/live-coach-marks.spec.ts` resets `live_onboarding_dismissed` before asserting card show, tour start, dismiss persistence, and `?tour=live` replay.

## Commit & Pull Request Guidelines

Recent history mixes imperative summaries with Conventional Commit prefixes, for example `feat: add custom program template functionality` and `Refactor program state management`. Use short imperative subjects; add `feat:`, `fix:`, or `refactor:` when helpful. PRs should describe the user-visible change, mention migrations or env changes, link related plans, include screenshots for UI work, and list validation commands.

## Security & Configuration Tips

Never commit real secrets. Keep local values in `.env` and mirror required keys in `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_ORIGIN`, and `SUPABASE_DB_URL`. For schema changes, add a new timestamped SQL file under `supabase/migrations/`; do not rewrite applied migrations unless explicitly requested.
