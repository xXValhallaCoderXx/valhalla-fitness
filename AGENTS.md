# Repository Guidelines

## Project Structure & Module Organization

This is `sheetless`, a TanStack Start/Vite React 19 + TypeScript app backed by Supabase. Application code lives in `src/`: routes use TanStack file-route naming in `src/routes/`, server functions stay in `src/server/`, shared logic lives in `src/lib/`, and shared types live in `src/types/`. Shared UI belongs in `src/components/`; domain UI belongs in `src/features/{feature}/components/`. Global styles are in `src/styles/`. Tests are in `tests/`, browser specs in `tests/e2e/`, assets in `public/pwa/`, and migrations in `supabase/migrations/`.

## Build, Test, and Development Commands

- `pnpm dev` starts the local Vite/TanStack Start dev server.
- `pnpm build` creates the production build and runs TypeScript checks.
- `pnpm typecheck` runs strict TypeScript checks without building.
- `pnpm lint` runs ESLint across the repository.
- `pnpm test` runs Vitest once; `pnpm test:watch` runs it interactively.
- `pnpm playwright` runs Playwright tests in `tests/e2e/`.
- `pnpm db:migrate:local` applies Supabase migrations to the local stack.
- `pnpm db:migrate:dry-run` previews remote migration changes using `SUPABASE_DB_URL`.

## Coding Style & Naming Conventions

Use strict TypeScript, ES modules, React JSX, two-space indentation, single quotes, and the existing semicolon-free style. Prefer the `~/` alias for imports from `src/`. Do not edit `src/routeTree.gen.ts` manually. Follow existing React Query and `createServerFn` patterns. Mantine is the primary UI layer; Tailwind may be used for layout. Keep compatibility shims such as `src/components/ui.tsx` stable unless a migration explicitly touches them.

## Testing Guidelines

Use Vitest with `jsdom` for unit and domain tests. Name tests `*.test.ts` and keep e2e specs under `tests/e2e/*.spec.ts`. Add tests near the changed behavior, especially for template generation, progression, history, session cache, and server APIs. Run narrow checks first, then broaden to `pnpm test`, `pnpm lint`, and `pnpm build` for shared changes.

## Commit & Pull Request Guidelines

Recent history mixes imperative summaries with Conventional Commit prefixes, for example `feat: add custom program template functionality` and `Refactor program state management`. Use short imperative subjects; add `feat:`, `fix:`, or `refactor:` when helpful. PRs should describe the user-visible change, mention migrations or env changes, link related plans, include screenshots for UI work, and list validation commands.

## Security & Configuration Tips

Never commit real secrets. Keep local values in `.env` and mirror required keys in `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_ORIGIN`, and `SUPABASE_DB_URL`. For schema changes, add a new timestamped SQL file under `supabase/migrations/`; do not rewrite applied migrations unless explicitly requested.
