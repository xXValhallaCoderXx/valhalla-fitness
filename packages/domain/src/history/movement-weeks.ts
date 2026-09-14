import type { Movement } from '@sheetless/domain/movement/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { convertWeight } from '@sheetless/domain/shared/math'
import { isPositiveLoad } from '@sheetless/domain/shared/load'
import { movementCatalog } from '@sheetless/domain/movement/movements'
import {
  formatDateKey,
  parseDate,
  startOfWeek,
  type HistorySessionInput,
} from '@sheetless/domain/history/history'

export type WeeklyMovementTotal = {
  weekStart: string
  movementId: string
  completedSets: number
  /** Load × reps over completed sets, in the account's display units. */
  volume: number
  /** Heaviest completed load in the week, for a range-scoped "best" without the full set list. */
  bestLoad: number | null
  bestReps: number | null
}

/**
 * Per-movement work, bucketed by Monday-UTC week.
 *
 * `movementSummaries` on the dashboard are lifetime aggregates built server-side, so the Movements
 * table could never answer "the last eight weeks" — the client had nothing to re-aggregate from.
 * These buckets are the smallest thing that fixes it, and they follow `buildWeeklyRegionSets`'
 * shape so the range helpers already work on them.
 */
export function buildWeeklyMovementTotals(
  sessions: HistorySessionInput[],
  options: { units?: Unit | null; catalog?: Record<string, Movement> } = {},
): WeeklyMovementTotal[] {
  const units = options.units ?? 'kg'
  const catalog = options.catalog ?? movementCatalog
  const buckets = new Map<string, WeeklyMovementTotal>()

  for (const session of sessions) {
    const date = parseDate(session.scheduledDate)
    if (!date) continue
    const weekStart = formatDateKey(startOfWeek(date))

    for (const exercise of session.exercises) {
      const movementId = exercise.performedMovementId
      if (!movementId) continue
      const key = `${weekStart}::${movementId}`
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { weekStart, movementId, completedSets: 0, volume: 0, bestLoad: null, bestReps: null }
        buckets.set(key, bucket)
      }

      for (const set of exercise.sets) {
        if (!set.completed) continue
        bucket.completedSets += 1
        // Bodyweight movements complete sets without a load; they count as work, not as volume.
        if (!isPositiveLoad(set.actualLoad) || !set.actualReps) continue
        const load = convertWeight(set.actualLoad, session.units ?? 'kg', units)
        bucket.volume += load * set.actualReps
        if (bucket.bestLoad === null || load > bucket.bestLoad) {
          bucket.bestLoad = load
          bucket.bestReps = set.actualReps
        }
      }
    }
  }

  return Array.from(buckets.values()).sort(
    (left, right) => left.weekStart.localeCompare(right.weekStart) || left.movementId.localeCompare(right.movementId),
  )
}

export type RangedMovementTotals = {
  completedSets: number
  volume: number
  bestLoad: number | null
  bestReps: number | null
  lastWeekStart: string | null
}

/** Collapse a range-filtered slice of buckets back to one row per movement. */
export function totalsByMovement(weeks: WeeklyMovementTotal[]): Map<string, RangedMovementTotals> {
  const totals = new Map<string, RangedMovementTotals>()
  for (const week of weeks) {
    const current = totals.get(week.movementId) ?? {
      completedSets: 0,
      volume: 0,
      bestLoad: null,
      bestReps: null,
      lastWeekStart: null,
    }
    current.completedSets += week.completedSets
    current.volume += week.volume
    if (week.bestLoad !== null && (current.bestLoad === null || week.bestLoad > current.bestLoad)) {
      current.bestLoad = week.bestLoad
      current.bestReps = week.bestReps
    }
    if (!current.lastWeekStart || week.weekStart > current.lastWeekStart) current.lastWeekStart = week.weekStart
    totals.set(week.movementId, current)
  }
  return totals
}
