---
description: "Use when editing this sheetless app. Enforces domain-first structure, TypeScript/React standards, TanStack Router conventions, Supabase migrations, Mantine styling, testing, and pnpm commands."
name: "Project Standards"
applyTo: "**"
---

# Project Standards

- Treat this as a TanStack Start/Vite + React 19 + TypeScript app using TanStack Router, React Query, Supabase, Dexie, Tailwind CSS 4, Zod, and pnpm.
- Use `pnpm` scripts and lockfile conventions. Prefer `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm playwright`.
- Keep route files in `src/routes/` using TanStack Router file-route naming. Never edit `src/routeTree.gen.ts` manually; update route files and let the router tooling regenerate it. Route files should be thin adapters only.
- Keep domain UI, server functions, pure logic, and query options in `src/domains/{account,program,session,history,movement}/`. Keep reusable UI in `src/components/atoms` and `src/components/molecules`. Promote cross-domain helpers to `src/shared/*` only when 3+ domains need them.
- Use the `~/` path alias for imports from `src/` when it improves clarity. Preserve strict TypeScript settings and avoid introducing JavaScript files.
- For UI, Mantine owns the styling system and Tailwind is layout only. Use atoms/molecules from `~/components` for text and surfaces: `Text`, `Heading`, `SectionLabel`, `Caption`, `StatValue`, `Panel`, `StatCard`, `Page`, `PageHeader`, `EmptyState`, and `ConfirmDialog`.
- Do not use Tailwind typography/color/background/border-color utilities in touched code: font-weight classes, text-size classes, arbitrary CSS-variable text/background/border classes, leading/tracking classes, or `vf-section-label`.
- Raw Mantine controls are fine for buttons, badges, inputs, modals, and layout helpers, but text/caption/heading/stat/surface presentation should go through atoms/molecules or Mantine props, not ad-hoc class strings.
- If a touched route file grows beyond roughly 40 lines, move behavior into the owning domain. If a touched domain component approaches roughly 250-300 lines, split it by concern before adding more behavior.
- For data fetching and mutations, follow existing React Query and server function patterns. Keep query option helpers in domain `queries.ts` files, with compatibility barrels only where needed.
- For offline/local behavior, keep Dexie/session-cache logic in domain or shared lib modules and avoid scattering persistence details into route components.
- For database changes, create new timestamped SQL migrations under `supabase/migrations/`; do not rewrite applied migrations unless explicitly requested. Match existing UUID, `timestamptz`, foreign-key, and permission-grant patterns.
- Never expose secrets. Keep environment-specific values in local `.env` files with safe placeholders when needed.
- Put unit/domain tests in `tests/` or `*.test.ts` files using Vitest. Keep browser flows in `tests/e2e/` using Playwright.
- After meaningful code changes, validate with the narrowest relevant checks first, then broader checks when appropriate: typecheck, lint, tests, build, or Playwright.
- For UI changes, inspect `pnpm lint` output for files you touched. Existing warnings elsewhere can remain during migration, but warnings introduced or preserved in touched code should be fixed before completion.
