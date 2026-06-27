# In-Session Workout Onboarding — implemented

## Context

The live workout screen is the highest-value, most-forgettable part of onboarding — it's where a
beginner has to understand logging weight/reps, rating effort (RIR), completing sets, and finishing.

There is a live walkthrough (`buildLiveSessionSteps` — a 5-step driver.js spotlight tour). It used to
auto-run once, forced, the first time you opened a fresh session. That has been replaced with an
in-session onboarding card that is **optional** (you can ignore it and just train) and **permanently
dismissible** ("never show again").

**The implemented change:** replace the forced auto-pop with a small, dismissible **intro card** at the top of the
live session. The card offers the walkthrough *on demand* and a permanent dismiss. Nothing is forced;
nothing is shown again once dismissed.

This reuses everything we already built — only the *trigger* changes (auto-pop → opt-in card) plus a
new persistence flag.

---

## What already exists (reuse, don't rebuild)

- **The walkthrough itself**: `buildLiveSessionSteps()` in `src/domains/onboarding/onboarding-tour.ts`
  (movement → weight → RIR → complete → finish, over `data-tour="live-*"` anchors on
  `LiveMovementCard`/`LiveSetRow`/`LiveSession`), driven by `useOnboardingTour(buildLiveSessionSteps, 'live')`.
- **The trigger**: `LiveSessionOnboarding.tsx` launches it on demand. `SessionPage.tsx` keeps only the
  `?tour=live` replay trigger for Settings → Data & Sync and e2e.
- **The dismissible-card pattern**: `GettingStartedCard.tsx` + `OnboardingPanel.tsx` (themed `Panel`,
  subtle dismiss button, reads `me`, fires a server mutation, hides when a flag is set).
- **The server-flag pattern**: `profile-functions.ts` — `getMeFn` returns `onboardingCompleted`,
  `completeOnboardingFn` sets `profiles.onboarding_completed = true`; migration
  `supabase/migrations/202606270001_add_onboarding_completed.sql`; `UserProfile.onboardingCompleted`
  in `src/shared/types/training.ts`.

---

## Design

A self-contained **`LiveSessionOnboarding`** card rendered at the top of the live session's main column.

- **Shown when** the user hasn't dismissed it — `me.liveOnboardingDismissed === false` (a new, dedicated
  flag; *separate* from `onboardingCompleted`, since a user can finish the Today checklist yet still be
  new to live logging). Hidden entirely once dismissed.
- **Optional & non-blocking**: it's a compact `Panel` (action-bordered, like the getting-started card),
  not a spotlight overlay. The user can ignore it and log their workout.
- **Content**: a one-line intro + the three things that matter ("Type your weight & reps · rate effort
  with RIR · tap ✓ to log each set, then Finish to save").
- **Actions**:
  - **"Show me around"** → launches the existing `buildLiveSessionSteps` walkthrough via
    `useOnboardingTour(buildLiveSessionSteps, 'live')`. (The `data-tour="live-*"` anchors are in the DOM
    because the card lives inside the session.)
  - **"Don't show again"** → calls `dismissLiveOnboardingFn()` → sets the flag → card never returns.
- **Always-available replay**: keep Settings → "Replay walkthrough" (`?tour=live`) so anyone — including
  users who dismissed the card — can re-run it.

> Persistence choice: use a **server flag** (`profiles.live_onboarding_dismissed`), mirroring
> `onboarding_completed`, so "never again" is true across devices and survives a cache clear — and it
> matches the existing onboarding model.

---

## Implementation

**1. Persistence flag** (mirror `onboarding_completed` exactly)
- Migration `supabase/migrations/<ts>_add_live_onboarding_dismissed.sql`:
  `alter table public.profiles add column if not exists live_onboarding_dismissed boolean not null default false;`
- `profile-functions.ts`: add `liveOnboardingDismissed: Boolean(profile.live_onboarding_dismissed)` to
  `getMeFn`'s return; add `dismissLiveOnboardingFn` (POST) that sets the column and returns `getMeFn()`.
- `src/shared/types/training.ts`: add `liveOnboardingDismissed: boolean` to `UserProfile`.
- Apply with `pnpm db:migrate:local`.

**2. The card** — new `src/domains/session/components/LiveSessionOnboarding.tsx`
- Self-contained (mirror `OnboardingPanel`): `const me = useQuery(meQueryOptions()).data`; if
  `me?.liveOnboardingDismissed !== false` → `return null`.
- `const { start } = useOnboardingTour(buildLiveSessionSteps, 'live')` for "Show me around".
- `dismissMutation = useMutation({ mutationFn: dismissLiveOnboardingFn, onSuccess: profile =>
  queryClient.setQueryData(['me'], profile) })` for "Don't show again" (optimistic-hide like the
  snooze in `OnboardingPanel`).
- Emit analytics via `track()` (`live_onboarding_start_tour`, `live_onboarding_dismiss`) — the
  abstraction already exists.

**3. Placement** — `src/domains/session/components/LiveSession.tsx`
- Render `<LiveSessionOnboarding />` at the top of the `<main>` content column in `LiveSessionFrame`
  (above the movements list, below the sticky `SessionContextBar`).

**4. Retire the forced auto-pop** — `src/domains/session/components/SessionPage.tsx`
- Remove the `sheetless.liveTourAutorun` auto-run effect (lines ~52–74) and the `sessionWasFresh`
  capture. **Keep a slim `?tour=live` force trigger** (so Settings "Replay walkthrough" and e2e still
  launch the tour, independent of the card/flag) — e.g. a one-shot effect that calls `startLiveTour()`
  when `search.tour === 'live'`, guarded by a ref + a `querySelector('[data-tour="live-movement"]')`
  check (same timer pattern, no localStorage/fresh gating).

**5. Tests**
- e2e (`tests/e2e/live-coach-marks.spec.ts`): rework to the new model —
  - card shows on a session for a non-dismissed user; "Show me around" opens the `.driver-popover`;
  - "Don't show again" hides the card and (re-navigating) it stays hidden;
  - `?tour=live` still launches the walkthrough (Settings replay path).
- Any onboarding e2e that currently clears `sheetless.liveTourAutorun` no longer needs to (autorun is
  gone) — simplify those.
- Add a demo/seed note if we want a demo account that still shows the card (`live_onboarding_dismissed:
  false`), or rely on `demo.new`.

---

## Verification — definition of done

```bash
pnpm typecheck && pnpm lint            # 0 errors
pnpm test                              # unit (flag-gated visibility logic if extracted as pure)
pnpm db:migrate:local                  # apply the new flag column
pnpm e2e                               # live onboarding card: show / start tour / dismiss / replay
```
Manual: log in as `demo.new` (`DemoPass123!`), set estimates, choose a plan, start a workout →
the in-session card appears (not a forced overlay); **Show me around** runs the spotlight walkthrough;
**Don't show again** removes it and it stays gone on the next session; Settings → **Replay walkthrough**
still works. Confirm the workout is fully usable while ignoring the card.

## Critical files
- new `src/domains/session/components/LiveSessionOnboarding.tsx`
- `src/domains/session/components/LiveSession.tsx` (placement), `SessionPage.tsx` (drop auto-pop, keep `?tour=live`)
- `src/domains/account/server/profile-functions.ts` (`getMeFn` + `dismissLiveOnboardingFn`), `src/shared/types/training.ts`
- new `supabase/migrations/<ts>_add_live_onboarding_dismissed.sql`
- `tests/e2e/live-coach-marks.spec.ts` (+ touch onboarding e2e that referenced the autorun flag)
- reuse: `onboarding-tour.ts` (`buildLiveSessionSteps`), `useOnboardingTour.ts`, `GettingStartedCard.tsx` (pattern), `shared/lib/analytics.ts`
```
