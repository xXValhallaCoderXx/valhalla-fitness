---
description: "Use when editing this workout-comeback app. Enforces project coding structure, TypeScript/React standards, TanStack Router conventions, Supabase migrations, styling, testing, and pnpm commands."
name: "Project Standards"
applyTo: "**"
---

# Project Standards

- Treat this as a Vite + React 19 + TypeScript app using TanStack Router, React Query, Supabase, Dexie, Tailwind CSS 4, Zod, and pnpm.
- Use `pnpm` scripts and lockfile conventions. Prefer `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm playwright`.
- Keep route files in `src/routes/` using TanStack Router file-route naming. Never edit `src/routeTree.gen.ts` manually; update route files and let the router tooling regenerate it.
- Keep reusable UI primitives in `src/components/`, shared app/business logic in `src/lib/`, server/Supabase helpers in `src/server/`, shared domain types in `src/types/`, and global styling in `src/styles/`.
- Use the `~/` path alias for imports from `src/` when it improves clarity. Preserve strict TypeScript settings and avoid introducing JavaScript files.
- For UI, prefer existing primitives from `src/components/ui.tsx`, compose class names with `cn()`, and use Tailwind utilities plus existing CSS variables such as `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--action`, `--success`, `--warning`, and `--danger`.
- For data fetching and mutations, follow the existing React Query and server function patterns. Keep query option helpers in `src/lib/query-options.ts` when shared.
- For offline/local behavior, keep Dexie/session-cache logic in `src/lib/` and avoid scattering persistence details into route components.
- For database changes, create new timestamped SQL migrations under `supabase/migrations/`; do not rewrite applied migrations unless explicitly requested. Match existing UUID, `timestamptz`, foreign-key, and permission-grant patterns.
- Never expose secrets. Keep environment-specific values in local `.env` files with safe placeholders when needed.
- Put unit/domain tests in `tests/` or `*.test.ts` files using Vitest. Keep browser flows in `tests/e2e/` using Playwright.
- After meaningful code changes, validate with the narrowest relevant checks first, then broader checks when appropriate: typecheck, lint, tests, build, or Playwright.
