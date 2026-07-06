# Insights Overhaul (DOTS + strength trends) — COMPLETE

_Last updated: 2026-07-06. Branch: `develop`. Status: **done, validated**._

## 1. Why this existed

The Insights surface (the `/history` route, nav-labeled **Insights**) showed generic
descriptive aggregates — total volume, set counts, a 4-week volume chart — neither
motivating for beginners nor useful for advanced lifters. The app is data-rich (every
set stores target + actual load/reps/RIR; sessions carry `hardness` incl. `Deload`), so
real insights are computable. Hard rule throughout: honest empty states, never fake/
inferred trends (`main-app-spec.md:306`).

### Approved decisions (all shipped)
1. **DOTS** via a new `bodyweight_entries` time-series table + optional `profiles.sex`;
   fallback chain **DOTS → bodyweight-multiple (×BW) → raw total → insufficient**.
2. Overhaul the **Overview** tab into an insight dashboard **+** add a new **Strength** tab;
   keep Muscle Fatigue / Movements / Records / Sessions.
3. Global time-range switch **8W / 3M / 1Y / All**, clamped to real history; all-time stats
   ignore it.
4. Add **`@mantine/charts`** (Recharts wrapper) for real line/area charts.

### Architecture
One wider server fetch → pure-lib computation → **client-side range slicing**. The
dashboard server fn returns `HistoryDashboard` **plus** `insights: HistoryInsights`
(full-range series + all-time aggregates, never raw sets). Every user-facing verdict comes
from a **tested signal enum**; components never judge inline. All "weeks since" / range math
keys off a serialized `insights.generatedAt`, never `new Date()` in render.

---

## 2. What shipped

Commits on `develop`:
- `af7265d` — split HistoryPage into shell + per-tab files (mechanical).
- `62bcaa9` — insights foundation (engines, bodyweight log, wider fetch).
- `e70c24a` — Strength tab + bodyweight/sex inputs + trend visualizations.
- `6d34273` — Overview overhauled into the signal-driven dashboard.
- e2e spec (`tests/e2e/insights.spec.ts`).

### Data layer
- Migration `202607060001_add_bodyweight_and_sex.sql`: `bodyweight_entries` (canonical kg,
  one row/day), nullable `profiles.sex`, RLS + grants. Demo seed: demo.linear (female/63 kg),
  demo.power (male/84 kg), **demo.wave intentionally without** (exercises the prompt card).

### Pure lib modules (`src/domains/history/lib/`) — all unit-tested
`dots`, `strength` (E1RM series + outlier guard + trend/stall/velocity/rep-max +
powerlifting total), `consistency`, `calibration`, `muscle-volume`, `milestones`,
`insight-state` (lifecycle + plan gating + volume-trend signal), `insight-ranges`,
`build-insights` (orchestrator). Signal enums + label maps colocated per module.

### Server
`chunkedIn` helper (150/chunk, URL-safe); `getHistoryDashboardFn` fetches 520 sessions +
bodyweight + sex in parallel, returns `HistoryDashboardWithInsights`. Bodyweight get/log/
delete fns; `sex` on getMe/updateSettings.

### UI (screenshot-verified as demo.linear)
- **Strength tab** — DOTS score, per-lift LineChart trend cards (current/best e1RM, trend
  badge, velocity, stall line, 1/3/5RM bests), powerlifting-total/DOTS panel, training-read
  panel, range switch. Charts render correctly.
- **Overview tab** — KPI strip + 8 signal-driven cards (StrengthScore w/ inline bodyweight
  prompt, VolumeTrend AreaChart, Consistency, StallWatch, MuscleSets, Calibration, PlanPulse,
  Milestones) + lifecycle gating (empty / cold-start checklist / stale welcome-back) + kept
  Recent Sessions / Latest Records / Substitutions.
- **Settings** — "Body & Strength Score": sex select + bodyweight logger + recent entries.

### Note on the earlier "blank charts"
Not a bug. The `pnpm shot` helper waits only 1s; recharts' `ResponsiveContainer` needs ~1–2s
to measure after hydration. With a proper settle the charts paint fully (verified: valid
paths, visible stroke, correct axes). The container reserves height, so there is no layout
shift — just a brief pre-settle paint on first load.

---

## 3. Validation (all green)

- `pnpm typecheck` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — 49 files, **490 tests** pass (incl. all new lib modules).
- `pnpm build` — Vite SSR + tsc pass; `@mantine/charts`/recharts bundle cleanly under Vite 8.
- `pnpm exec playwright test insights.spec.ts` — **6 pass on desktop-chrome and mobile-chrome**:
  Strength tab (DOTS + chart mounts), range switch toggles, Overview cards render, Settings
  bodyweight round-trip, prompt card for demo.wave.
- Migration applied locally + `pnpm demo:seed`; DOTS renders for seeded users.

Reminders for a full-suite run: reseed (`pnpm demo:seed`) before `pnpm e2e` — the wider suite
is non-idempotent (memory: estimates/session-finish specs consume demo state).

---

## 4. Possible follow-ups (not required for this feature)
- Onboarding capture of bodyweight/sex (today it's Settings + the inline prompt only).
- DOTS-over-time as a second chart on the Overview StrengthScoreCard (Strength tab already
  has the total/DOTS trend).
- If the pre-settle chart flash ever feels rough on slow devices, gate charts behind a mount
  check or a skeleton.
