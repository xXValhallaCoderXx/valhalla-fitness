# Sheetless Agent Guidelines

Use these instructions for all work in this repository. For the detailed file-scoped rules, also follow `.github/instructions/project-standards.instructions.md` and `AGENTS.md`.

## Project shape

- This is `sheetless`, a TanStack Start/Vite React 19 + TypeScript app backed by Supabase.
- Code is organized by domain:
  - `src/domains/{account,program,session,history,movement}/components` for domain UI.
  - `src/domains/*/server` for `createServerFn` handlers and domain data access.
  - `src/domains/*/lib` for pure domain logic.
  - `src/domains/*/queries.ts` for React Query options.
  - `src/shared/{lib,server,types}` for cross-domain helpers.
- `src/routes/` must stay as thin TanStack file-route wrappers. Never edit `src/routeTree.gen.ts`.

## UI architecture

- Mantine is the only styling system. Tailwind is for layout only.
- Shared atomic UI primitives live in `src/components/atoms`; shared compositions live in `src/components/molecules`.
- Import shared UI from `~/components`. Do not use old `~/components/ui`, `~/components/workout`, or `src/features/*` patterns.
- Use atoms/molecules for text and surfaces: `Text`, `Heading`, `SectionLabel`, `Caption`, `StatValue`, `Panel`, `StatCard`, `Page`, `PageHeader`, `EmptyState`, and `ConfirmDialog`.
- Raw Mantine components are appropriate for controls and layout primitives, but do not use ad-hoc `<p>`, `<h*>`, or `<span>` plus Tailwind typography/color in touched code.
- Tailwind classes may express structure only: flex/grid, gap, spacing, sizing, position, overflow, alignment.
- Do not use Tailwind typography/color/background/border-color utilities in touched code: font-weight classes, text-size classes, arbitrary CSS-variable text/background/border classes, leading/tracking classes, or `vf-section-label`.

## Component boundaries

- Route files should normally be 40 lines or less: route declaration, loader, params/context extraction, and one domain component render.
- Domain page components should orchestrate state and compose smaller components. Do not keep cards, lists, modals, timeline rows, and helper renderers in one file.
- If a touched component is approaching 250-300 lines, split by concern before adding more code.
- Do not simply move an oversized route file into `src/domains/*/components`; split it as part of the same change.
- Do not place `createServerFn` implementations inside presentational components.
- Public barrels must not re-export server-only modules.

## Routing and data

- Keep route files in `src/routes/` using TanStack Router file-route naming.
- Never edit `src/routeTree.gen.ts` manually.
- Follow existing React Query and server-function patterns for data fetching and mutations.
- Keep Dexie/offline/session-cache details in domain or shared lib modules, not scattered through route components.

## Commands and validation

- Use pnpm and preserve lockfile conventions.
- Prefer the narrowest relevant checks first, then broader checks:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - `pnpm playwright`
- For UI work, `pnpm lint` warnings in files you touched are not acceptable unless you explicitly document why they are pre-existing and outside the requested scope.
- If Playwright is blocked by missing local browser binaries or environment setup, say so clearly and continue with the other validation checks.

## Safety

- Do not expose secrets. Use local `.env` placeholders for required environment variables.
- For Supabase/database changes, create new timestamped migrations under `supabase/migrations/`; do not rewrite applied migrations unless explicitly requested.
- Prefer small, incremental edits that preserve public APIs during migrations.
