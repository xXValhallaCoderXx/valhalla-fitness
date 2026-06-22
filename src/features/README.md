# Feature boundaries

Feature folders hold domain-specific UI and client-side behavior that is larger than shared atoms or molecules.

Shared UI follows a small atomic-design split:

- `src/components/atoms/` — reusable Mantine-backed primitives such as buttons, cards, inputs, and chips.
- `src/components/molecules/` — reusable non-domain compositions such as page headers, empty states, and confirm dialogs.
- `src/features/{feature}/components/` — larger, stateful, or domain-specific UI that would traditionally be called organisms.

Server implementation stays in `src/server/`. Feature folders may consume server functions or expose light client-facing barrels, but should not hide `createServerFn` implementations inside presentational UI.
