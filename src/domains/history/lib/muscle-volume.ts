import type { BalanceSignal, BalanceSummary, BodyRegionId, Movement, WeeklyRegionSets } from '~/shared/types'
import { movementCatalog } from '~/domains/movement/lib/movements'
import { resolveRegionWeights } from '~/domains/history/lib/body-load'
import {
  formatDateKey,
  formatWeekLabel,
  parseDate,
  startOfWeek,
  type HistorySessionInput,
} from '~/domains/history/lib/history'

export const BALANCE_MIN_SETS = 20
export const BALANCE_SKEW_FACTOR = 1.6

export const PUSH_REGIONS: BodyRegionId[] = ['chest', 'shoulders', 'triceps']
export const PULL_REGIONS: BodyRegionId[] = ['upper_back', 'biceps']
export const LEG_REGIONS: BodyRegionId[] = ['quads', 'hamstrings', 'glutes', 'calves']
export const CORE_REGIONS: BodyRegionId[] = ['core']

export const balanceSignalLabels: Record<BalanceSignal, string> = {
  balanced: 'Well balanced',
  push_heavy: 'Push-heavy',
  pull_heavy: 'Pull-heavy',
  legs_light: 'Legs need love',
  insufficient: 'Building picture',
}

/**
 * Weekly fractional sets-per-muscle-group. Region weights are normalized per
 * movement so each completed set contributes exactly 1.0 across regions;
 * movements with no weight map and no category fallback still count toward
 * totalSets but attribute nothing.
 */
export function buildWeeklyRegionSets(
  sessions: HistorySessionInput[],
  options: { catalog?: Record<string, Movement> } = {},
): WeeklyRegionSets[] {
  const catalog = options.catalog ?? movementCatalog
  const buckets = new Map<string, { weekStart: Date; regionSets: Partial<Record<BodyRegionId, number>>; totalSets: number }>()

  for (const session of sessions) {
    const date = parseDate(session.completedAt ?? session.scheduledDate)
    if (!date) continue
    const weekStart = startOfWeek(date)
    const key = formatDateKey(weekStart)

    for (const exercise of session.exercises) {
      const completedSetCount = exercise.sets.filter((set) => set.completed).length
      if (!completedSetCount) continue

      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { weekStart, regionSets: {}, totalSets: 0 }
        buckets.set(key, bucket)
      }
      bucket.totalSets += completedSetCount

      const weights = resolveRegionWeights(
        exercise.performedMovementId,
        catalog[exercise.performedMovementId]?.category,
      )
      const entries = Object.entries(weights) as Array<[BodyRegionId, number]>
      const weightSum = entries.reduce((sum, [, weight]) => sum + (weight ?? 0), 0)
      if (weightSum <= 0) continue

      for (const [regionId, weight] of entries) {
        if (!weight) continue
        bucket.regionSets[regionId] = (bucket.regionSets[regionId] ?? 0) + (completedSetCount * weight) / weightSum
      }
    }
  }

  return Array.from(buckets.values())
    .sort((left, right) => left.weekStart.getTime() - right.weekStart.getTime())
    .map((bucket) => ({
      weekStart: formatDateKey(bucket.weekStart),
      weekLabel: formatWeekLabel(bucket.weekStart),
      regionSets: Object.fromEntries(
        (Object.entries(bucket.regionSets) as Array<[BodyRegionId, number]>).map(([regionId, value]) => [
          regionId,
          roundTwo(value),
        ]),
      ),
      totalSets: bucket.totalSets,
    }))
}

export function buildMovementBalance(weekly: WeeklyRegionSets[], rangeWeeks: number | null): BalanceSummary {
  const buckets = rangeWeeks == null ? weekly : weekly.slice(-rangeWeeks)

  const pushSets = roundOne(sumRegions(buckets, PUSH_REGIONS))
  const pullSets = roundOne(sumRegions(buckets, PULL_REGIONS))
  const legSets = roundOne(sumRegions(buckets, LEG_REGIONS))
  const coreSets = roundOne(sumRegions(buckets, CORE_REGIONS))
  const totalSets = buckets.reduce((sum, bucket) => sum + bucket.totalSets, 0)

  let signal: BalanceSignal
  if (totalSets < BALANCE_MIN_SETS) signal = 'insufficient'
  else if (pushSets > pullSets * BALANCE_SKEW_FACTOR) signal = 'push_heavy'
  else if (pullSets > pushSets * BALANCE_SKEW_FACTOR) signal = 'pull_heavy'
  else if (legSets * BALANCE_SKEW_FACTOR < (pushSets + pullSets) / 2) signal = 'legs_light'
  else signal = 'balanced'

  return { signal, pushSets, pullSets, legSets, coreSets, totalSets, weeks: buckets.length }
}

function sumRegions(buckets: WeeklyRegionSets[], regions: BodyRegionId[]) {
  return buckets.reduce(
    (sum, bucket) => sum + regions.reduce((regionSum, regionId) => regionSum + (bucket.regionSets[regionId] ?? 0), 0),
    0,
  )
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100
}
