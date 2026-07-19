import type {
  DataLifecycle,
  HistoryWeeklyVolume,
  InsightGating,
  PlanState,
  ProgramInstance,
  SessionHardness,
  VolumeTrendSignal,
} from '~/shared/types'

export const COLD_START_MAX_SESSIONS = 1
export const ESTABLISHED_MIN_SESSIONS = 8
export const STALE_RETURNING_WEEKS = 4

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type InsightGatingInput = {
  completedSessions: number
  lastCompletedAt: string | null
  /** Injected "now" (ISO) — gating is pure; callers decide what now means. */
  now: string
  program: {
    status: ProgramInstance['status'] | null
    weekNumber: number | null
    hardness: SessionHardness | null
  } | null
}

/**
 * Single source of truth for every "don't show a misleading insight" rule:
 * cold-start/warming thresholds, the long-gap welcome-back override, and
 * plan-aware suppression (week 1 and deload weeks have no fair comparison).
 */
export function resolveInsightGating(input: InsightGatingInput): InsightGating {
  const lifecycle = resolveLifecycle(input)
  const planState = resolvePlanState(input.program)
  const suppressWeekComparison =
    planState === 'active_week1' ||
    planState === 'active_deload' ||
    lifecycle === 'empty' ||
    lifecycle === 'cold_start'
  return {
    lifecycle,
    planState,
    suppressWeekComparison,
    deloadWeek: planState === 'active_deload',
    staleWelcomeBack: lifecycle === 'stale_returning',
  }
}

function resolveLifecycle(input: InsightGatingInput): DataLifecycle {
  const { completedSessions, lastCompletedAt, now } = input
  if (completedSessions <= 0) return 'empty'
  if (completedSessions <= COLD_START_MAX_SESSIONS) return 'cold_start'
  if (completedSessions >= 2 && isStale(lastCompletedAt, now)) return 'stale_returning'
  if (completedSessions < ESTABLISHED_MIN_SESSIONS) return 'warming'
  return 'established'
}

/** Strictly more than STALE_RETURNING_WEEKS×7 days of silence counts as stale. */
function isStale(lastCompletedAt: string | null, now: string): boolean {
  if (!lastCompletedAt) return false
  const last = new Date(lastCompletedAt).getTime()
  const current = new Date(now).getTime()
  if (Number.isNaN(last) || Number.isNaN(current)) return false
  return current - last > STALE_RETURNING_WEEKS * 7 * MS_PER_DAY
}

function resolvePlanState(program: InsightGatingInput['program']): PlanState {
  if (!program || program.status === null || program.status === 'archived') return 'none'
  if (program.status === 'paused') return 'paused'
  if (program.status === 'completed') return 'completed'
  if (program.weekNumber === 1) return 'active_week1'
  if (program.hardness === 'Deload') return 'active_deload'
  return 'active'
}

/**
 * Week-over-week volume read, deload-aware: a planned deload never reads as
 * "declining", and a deload bucket is never used as the comparison baseline.
 * `weeks` are the range-sliced ascending weekly buckets.
 */
export function resolveVolumeTrendSignal(
  weeks: HistoryWeeklyVolume[],
  gating: InsightGating,
): VolumeTrendSignal {
  if (gating.deloadWeek) return 'deload_planned'
  if (gating.suppressWeekComparison) return 'insufficient'
  if (weeks.length === 0) return 'insufficient'
  const last = weeks[weeks.length - 1]
  if (last.isDeload) return 'deload_planned'
  let prior: HistoryWeeklyVolume | null = null
  for (let i = weeks.length - 2; i >= 0; i -= 1) {
    if (weeks[i].isDeload !== true) {
      prior = weeks[i]
      break
    }
  }
  if (!prior) return 'insufficient'
  if (prior.volume === 0) return 'insufficient'
  const pct = (last.volume - prior.volume) / prior.volume
  if (pct >= 0.1) return 'rising'
  if (pct <= -0.1) return 'declining'
  return 'flat'
}

export const dataLifecycleLabels: Record<DataLifecycle, string> = {
  empty: 'No workouts yet',
  cold_start: 'Just getting started',
  warming: 'Building your baseline',
  established: 'Established',
  stale_returning: 'Welcome back',
}

export const volumeTrendLabels: Record<VolumeTrendSignal, string> = {
  rising: 'Building up',
  flat: 'Steady output',
  declining: 'Backing off',
  deload_planned: 'Lighter on purpose — deload week',
  insufficient: 'Building baseline',
}

export const volumeTrendExplanation =
  'Total weight moved each week: weight × reps, added up across every completed set. A steady or gently rising line means you are doing more work over time.'
