# Valhalla Fitness Agent Guidelines

Use these instructions for all work in this repository. For the detailed file-scoped rules, also follow `.github/instructions/project-standards.instructions.md`.

## Project shape

- This is a Vite + React 19 + TypeScript app using TanStack Router, React Query, React Start server functions, Supabase, Dexie, Tailwind CSS 4, Zod, and pnpm.
- The repo contains both frontend and server code. Keep those boundaries explicit:
  - Frontend/routes/components live under `src/routes/`, `src/components/`, and `src/features/`.
  - React Start server functions and Supabase server helpers stay under `src/server/`.
  - Shared domain types stay under `src/types/` unless a feature split is deliberate.
  - Shared business logic and infrastructure helpers stay under `src/lib/` when used across features.

## UI architecture

- Mantine is the current component-library target. Use local wrappers instead of importing Mantine throughout route files.
- Shared atomic UI primitives live in `src/components/atoms/`.
- Shared non-domain compositions live in `src/components/molecules/`.
- Larger stateful/domain UI that would traditionally be called organisms should be feature-scoped under `src/features/{feature}/components/`.
- `src/components/ui.tsx` and `src/components/workout.tsx` are compatibility shims. Prefer direct imports from `~/components/atoms`, `~/components/molecules`, or `~/features/{feature}` for new code.
- Tailwind is still allowed as a transition/layout utility. Preserve existing semantic CSS variables such as `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--action`, `--success`, `--warning`, and `--danger`.

## Feature boundaries

- Use `src/features/` for domain-specific UI and client behavior. Current feature directions include `auth`, `program`, `workout`, `history`, and `settings`.
- Do not place `createServerFn` implementations inside presentational feature components.
- Feature barrels may re-export server functions from `~/server/*` when it improves imports, but the server implementation should remain in `src/server/` unless there is a deliberate architecture change.
- Keep React Query option helpers centralized in `src/lib/query-options.ts` while query keys span multiple features.

## Routing and data

- Keep route files in `src/routes/` using TanStack Router file-route naming.
- Never edit `src/routeTree.gen.ts` manually.
- Follow existing React Query and server-function patterns for data fetching and mutations.
- Keep Dexie/offline/session-cache details in `src/lib/` or feature-specific logic, not scattered through route components.

## Commands and validation

- Use pnpm and preserve lockfile conventions.
- Prefer the narrowest relevant checks first, then broader checks:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - `pnpm playwright`
- If Playwright is blocked by missing local browser binaries or environment setup, say so clearly and continue with the other validation checks.

## Safety

- Do not expose secrets. Use local `.env` placeholders for required environment variables.
- For Supabase/database changes, create new timestamped migrations under `supabase/migrations/`; do not rewrite applied migrations unless explicitly requested.
- Prefer small, incremental edits that preserve public APIs during migrations.
