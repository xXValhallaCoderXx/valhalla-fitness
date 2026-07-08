import type { BalanceSignal, BalanceSummary, BodyRegionId, Movement, WeeklyRegionSets } from '~/shared/types'
import { movementCatalog } from '~/domains/movement/lib/movements'
import { bodyRegionLabels, resolveRegionWeights } from '~/domains/history/lib/body-load'
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

// Weekly-sets adequacy: the widely-taught ~10–20 hard sets per muscle per week
// heuristic, averaged over a recent window so one light week doesn't flip colors.
export const ADEQUACY_LOW_SETS = 10
export const ADEQUACY_HIGH_SETS = 20
export const ADEQUACY_WINDOW_WEEKS = 4

export type AdequacyTier = 'below' | 'in_range' | 'high'

export type RegionAdequacy = {
  regionId: BodyRegionId
  label: string
  /** Average sets per week over the window, one decimal. */
  weeklySets: number
  tier: AdequacyTier
}

export type AdequacySummary = {
  /** Every body region, most to least weekly sets. */
  regions: RegionAdequacy[]
  /** Weekly buckets the average was taken over (≤ ADEQUACY_WINDOW_WEEKS). */
  weeks: number
  totalSets: number
  /** Too little data in the window for the coloring to be fair. */
  insufficient: boolean
}

export function adequacyTierForSets(weeklySets: number): AdequacyTier {
  if (weeklySets < ADEQUACY_LOW_SETS) return 'below'
  if (weeklySets > ADEQUACY_HIGH_SETS) return 'high'
  return 'in_range'
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * `now` anchors the window to CALENDAR weeks: the weekly buckets only contain
 * trained weeks, so slicing the array would silently average a returning
 * user's months-old training as if it were current. Untrained weeks inside
 * the window count as zeros; a history shorter than the window is averaged
 * over the weeks the user has actually been around for.
 */
export function buildRegionAdequacy(weekly: WeeklyRegionSets[], now: string): AdequacySummary {
  const nowDate = parseDate(now)
  const firstEver = weekly.length ? parseDate(weekly[0].weekStart) : null
  if (!nowDate || !firstEver) {
    const regions = (Object.keys(bodyRegionLabels) as BodyRegionId[]).map((regionId) => ({
      regionId,
      label: bodyRegionLabels[regionId],
      weeklySets: 0,
      tier: 'below' as AdequacyTier,
    }))
    return { regions, weeks: 0, totalSets: 0, insufficient: true }
  }

  const currentWeekStart = startOfWeek(nowDate).getTime()
  const windowStart = currentWeekStart - (ADEQUACY_WINDOW_WEEKS - 1) * WEEK_MS
  const buckets = weekly.filter((bucket) => {
    const date = parseDate(bucket.weekStart)
    return date !== null && date.getTime() >= windowStart
  })
  const weeksSinceFirst = Math.floor((currentWeekStart - startOfWeek(firstEver).getTime()) / WEEK_MS) + 1
  const weeks = Math.max(1, Math.min(ADEQUACY_WINDOW_WEEKS, weeksSinceFirst))

  const totalSets = buckets.reduce((sum, bucket) => sum + bucket.totalSets, 0)
  const regions = (Object.keys(bodyRegionLabels) as BodyRegionId[])
    .map((regionId) => {
      const regionSum = buckets.reduce((sum, bucket) => sum + (bucket.regionSets[regionId] ?? 0), 0)
      const weeklySets = roundOne(regionSum / weeks)
      return { regionId, label: bodyRegionLabels[regionId], weeklySets, tier: adequacyTierForSets(weeklySets) }
    })
    .sort((left, right) => right.weeklySets - left.weeklySets)
  return { regions, weeks, totalSets, insufficient: totalSets < BALANCE_MIN_SETS }
}

export const adequacyTierLabels: Record<AdequacyTier, string> = {
  below: 'Could use more',
  in_range: 'On track',
  high: 'High',
}

export const adequacyExplanation =
  'Average sets each muscle group gets per week, over the last 4 weeks. Around 10–20 is a solid range for most people.'

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
