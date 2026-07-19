---
description: "Use when editing this sheetless app. Enforces domain-first structure, TypeScript/React standards, TanStack Router conventions, Supabase migrations, Mantine styling, testing, and pnpm commands."
name: "Project Standards"
applyTo: "**"
---

# Project Standards

- Treat this as a TanStack Start/Vite + React 19 + TypeScript app using TanStack Router, React Query, Supabase, Dexie, Tailwind CSS 4, Zod, and pnpm.
- Use `pnpm` scripts and lockfile conventions. Prefer `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm playwright`.
- Keep route files in `apps/web/src/routes/` using TanStack Router file-route naming. Never edit `apps/web/src/routeTree.gen.ts` manually; update route files and let the router tooling regenerate it. Route files should be thin adapters only.
- Keep web domain UI, server functions, pure logic, and query options in `apps/web/src/domains/{account,program,session,history,movement}/`. Keep reusable web UI in `apps/web/src/components/atoms` and `apps/web/src/components/molecules`. Promote web-only cross-domain helpers to `apps/web/src/shared/*`; promote platform-neutral code used by web and native to `packages/*`.
- Use the `~/` path alias for imports from `apps/web/src/` when it improves clarity. Preserve strict TypeScript settings and avoid introducing JavaScript files.
- For UI, Mantine owns the styling system and Tailwind is layout only. Use atoms/molecules from `~/components` for text and surfaces: `Text`, `Heading`, `SectionLabel`, `Caption`, `StatValue`, `Panel`, `StatCard`, `Page`, `PageHeader`, `EmptyState`, and `ConfirmDialog`.
- Do not use Tailwind typography/color/background/border-color utilities in touched code: font-weight classes, text-size classes, arbitrary CSS-variable text/background/border classes, leading/tracking classes, or `vf-section-label`.
- Raw Mantine controls are fine for buttons, badges, inputs, modals, and layout helpers, but text/caption/heading/stat/surface presentation should go through atoms/molecules or Mantine props, not ad-hoc class strings.
- If a touched route file grows beyond roughly 40 lines, move behavior into the owning domain. If a touched domain component approaches roughly 250-300 lines, split it by concern before adding more behavior.
- For data fetching and mutations, follow existing React Query and server function patterns. Keep query option helpers in domain `queries.ts` files, with compatibility barrels only where needed.
- For offline/local behavior, keep Dexie/session-cache logic in domain or shared lib modules and avoid scattering persistence details into route components.
- For database changes, create new timestamped SQL migrations under `supabase/migrations/`; do not rewrite applied migrations unless explicitly requested. Match existing UUID, `timestamptz`, foreign-key, and permission-grant patterns.
- Never expose secrets. Keep environment-specific values in local `.env` files with safe placeholders when needed.
- Put web unit/domain tests in `apps/web/tests/` or `*.test.ts` files using Vitest. Keep browser flows in `apps/web/tests/e2e/` using Playwright; native and shared-package tests remain package-local.
- After meaningful code changes, validate with the narrowest relevant checks first, then broader checks when appropriate: typecheck, lint, tests, build, or Playwright.
- For UI changes, inspect `pnpm lint` output for files you touched. Existing warnings elsewhere can remain during migration, but warnings introduced or preserved in touched code should be fixed before completion.
