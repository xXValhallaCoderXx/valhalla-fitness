import type {
  E1rmPoint,
  E1rmTrendSignal,
  LiftE1rmSeries,
  Movement,
  RepMaxBest,
  RepMaxBests,
  StallSignal,
  StallStatus,
  TotalPoint,
  Unit,
} from '~/shared/types'
import { e1rm, mround, convertWeight } from '~/shared/lib/math'
import { parseDate, type HistorySessionInput } from '~/domains/history/lib/history'
import { getMovementName, movementCatalog } from '~/domains/movement/lib/movements'

export const E1RM_MAX_REPS = 12
export const OUTLIER_MIN_PRIOR_POINTS = 3
export const OUTLIER_MEDIAN_WINDOW = 5
export const OUTLIER_HIGH_FACTOR = 1.5
export const TREND_MIN_POINTS = 4
export const TREND_MIN_SPAN_DAYS = 21
export const TREND_SLOPE_PCT_PER_WEEK = 0.3
export const DETRAINING_WEEKS = 4
export const STALL_WATCH_WEEKS = 3
export const STALL_STALLED_WEEKS = 6
export const STALL_MIN_SESSIONS = 5
export const VELOCITY_MIN_POINTS = 4
export const VELOCITY_MIN_SPAN_DAYS = 28

export const STRENGTH_LIFTS = ['squat', 'bench_press', 'deadlift', 'overhead_press', 'barbell_row'] as const
export const POWERLIFTING_TOTAL_LIFTS = ['squat', 'bench_press', 'deadlift'] as const

export type StrengthLiftId = (typeof STRENGTH_LIFTS)[number]

export const e1rmTrendLabels: Record<E1rmTrendSignal, string> = {
  rising: 'Trending up',
  flat: 'Holding steady',
  declining: 'Trending down',
  detraining: 'Been a while',
  insufficient: 'Building baseline',
}

export const estimatedMaxExplanation =
  'e1RM is the heaviest single rep we estimate you could lift right now, worked out from the weights and reps you actually log. A rising line means you are getting stronger.'

export const stallSignalLabels: Record<StallSignal, string> = {
  progressing: 'Progressing',
  watch: 'Watch',
  stalled: 'Stalled',
  insufficient: 'Building baseline',
}

const DAY_MS = 86_400_000
const DAYS_PER_MONTH = 30.44

const strengthLiftSet = new Set<string>(STRENGTH_LIFTS)

type EligibleSet = {
  load: number
  reps: number
  rir: number | null
  value: number
}

type LiftSessionEntry = {
  sessionId: string
  date: string
  time: number
  sets: EligibleSet[]
}

type TimedPoint = {
  date: string
  time: number
  e1rm: number
}

/**
 * One e1RM point per session per strength lift (exact movement-id match, so
 * variations like front_squat never enter the squat series), ascending by
 * date, with a fat-finger outlier pass and rep-max bests computed from the
 * non-outlier sessions. Sessions may arrive in any order (server sends
 * newest-first).
 */
export function buildLiftE1rmSeries(
  sessions: HistorySessionInput[],
  options?: { catalog?: Record<string, Movement> },
): LiftE1rmSeries[] {
  const catalog = options?.catalog ?? movementCatalog
  const byLift = new Map<string, LiftSessionEntry[]>()

  for (const session of sessions) {
    const date = session.completedAt ?? session.scheduledDate
    const time = parseDate(date)?.getTime()
    if (time == null) continue

    const liftSets = new Map<string, EligibleSet[]>()
    for (const exercise of session.exercises) {
      if (!strengthLiftSet.has(exercise.performedMovementId)) continue
      for (const set of exercise.sets) {
        if (!set.completed) continue
        if (typeof set.actualLoad !== 'number' || set.actualLoad <= 0) continue
        if (typeof set.actualReps !== 'number' || set.actualReps < 1 || set.actualReps > E1RM_MAX_REPS) continue
        const eligible: EligibleSet = {
          load: set.actualLoad,
          reps: set.actualReps,
          rir: set.actualRir ?? null,
          value: mround(e1rm(set.actualLoad, set.actualReps, set.actualRir ?? 0), 0.5),
        }
        const existing = liftSets.get(exercise.performedMovementId)
        if (existing) existing.push(eligible)
        else liftSets.set(exercise.performedMovementId, [eligible])
      }
    }

    for (const [liftId, sets] of liftSets) {
      const entry: LiftSessionEntry = { sessionId: session.id, date, time, sets }
      const existing = byLift.get(liftId)
      if (existing) existing.push(entry)
      else byLift.set(liftId, [entry])
    }
  }

  const series: LiftE1rmSeries[] = []
  for (const liftId of STRENGTH_LIFTS) {
    const entries = byLift.get(liftId)
    if (!entries?.length) continue
    entries.sort((a, b) => a.time - b.time)

    const points: E1rmPoint[] = []
    const priorValues: number[] = []
    const nonOutlierEntries: LiftSessionEntry[] = []
    for (const entry of entries) {
      const best = entry.sets.reduce((max, set) => (set.value > max.value ? set : max))
      const outlier =
        priorValues.length >= OUTLIER_MIN_PRIOR_POINTS &&
        best.value > OUTLIER_HIGH_FACTOR * median(priorValues.slice(-OUTLIER_MEDIAN_WINDOW))
      points.push({
        date: entry.date,
        sessionId: entry.sessionId,
        e1rm: best.value,
        load: best.load,
        reps: best.reps,
        rir: best.rir,
        outlier,
      })
      if (!outlier) {
        priorValues.push(best.value)
        nonOutlierEntries.push(entry)
      }
    }

    series.push({
      movementId: liftId,
      movementName: catalog[liftId]?.name ?? getMovementName(liftId),
      points,
      repMaxBests: buildRepMaxBests(nonOutlierEntries),
    })
  }

  return series
}

export function classifyE1rmTrend(points: E1rmPoint[], now: string): E1rmTrendSignal {
  const usable = toTimedPoints(points)
  if (!usable.length) return 'insufficient'

  const nowTime = parseDate(now)?.getTime()
  const newest = usable[usable.length - 1]
  if (nowTime != null && (nowTime - newest.time) / DAY_MS > DETRAINING_WEEKS * 7) return 'detraining'

  const spanDays = (newest.time - usable[0].time) / DAY_MS
  if (usable.length < TREND_MIN_POINTS || spanDays < TREND_MIN_SPAN_DAYS) return 'insufficient'

  const slopePerDay = leastSquaresSlopePerDay(usable)
  const mean = usable.reduce((total, point) => total + point.e1rm, 0) / usable.length
  const slopePctPerWeek = mean > 0 ? (slopePerDay * 7 * 100) / mean : 0
  if (Math.abs(slopePctPerWeek) < TREND_SLOPE_PCT_PER_WEEK) return 'flat'
  return slopePctPerWeek > 0 ? 'rising' : 'declining'
}

/**
 * PR = point strictly above every previous non-outlier e1RM (first point
 * counts). Thresholds compare exact days-since-PR against week boundaries so
 * "6 weeks + 1 day" reads stalled even though the reported weeksSincePr
 * floors to 6.
 */
export function detectStall(points: E1rmPoint[], now: string): StallStatus {
  const usable = toTimedPoints(points)
  if (usable.length < STALL_MIN_SESSIONS) {
    return { signal: 'insufficient', weeksSincePr: null, lastPrDate: null }
  }

  let best = Number.NEGATIVE_INFINITY
  let lastPr = usable[0]
  for (const point of usable) {
    if (point.e1rm > best) {
      best = point.e1rm
      lastPr = point
    }
  }

  const nowTime = parseDate(now)?.getTime() ?? lastPr.time
  const daysSincePr = Math.max(0, (nowTime - lastPr.time) / DAY_MS)
  const signal: StallSignal =
    daysSincePr < STALL_WATCH_WEEKS * 7 ? 'progressing' : daysSincePr <= STALL_STALLED_WEEKS * 7 ? 'watch' : 'stalled'

  return {
    signal,
    weeksSincePr: Math.floor(daysSincePr / 7),
    lastPrDate: lastPr.date,
  }
}

/** e1RM change per month (30.44 days), least-squares over non-outlier points. */
export function computeVelocity(points: E1rmPoint[], now: string): number | null {
  // `now` keeps the shared signal signature; velocity has no recency gate.
  void now
  const usable = toTimedPoints(points)
  if (usable.length < VELOCITY_MIN_POINTS) return null
  const spanDays = (usable[usable.length - 1].time - usable[0].time) / DAY_MS
  if (spanDays < VELOCITY_MIN_SPAN_DAYS) return null
  return Math.round(leastSquaresSlopePerDay(usable) * DAYS_PER_MONTH * 10) / 10
}

/**
 * Running best-so-far squat+bench+deadlift total: one point per union date
 * once all three lifts have a non-outlier e1RM. DOTS/bodyweight decoration
 * happens in dots.ts.
 */
export function buildPowerliftingTotal(
  series: LiftE1rmSeries[],
  units: Unit | null,
): Array<Pick<TotalPoint, 'date' | 'total' | 'totalKg'>> {
  const lifts = POWERLIFTING_TOTAL_LIFTS.map((liftId) => {
    const match = series.find((entry) => entry.movementId === liftId)
    return toTimedPoints(match?.points ?? [])
  })
  if (lifts.some((points) => !points.length)) return []

  const unionDates = new Map<string, number>()
  for (const points of lifts) {
    for (const point of points) {
      if (!unionDates.has(point.date)) unionDates.set(point.date, point.time)
    }
  }
  const dates = [...unionDates.entries()].sort((a, b) => a[1] - b[1])

  const cursors = lifts.map(() => 0)
  const bests = lifts.map(() => Number.NEGATIVE_INFINITY)
  const totals: Array<Pick<TotalPoint, 'date' | 'total' | 'totalKg'>> = []

  for (const [date, time] of dates) {
    lifts.forEach((points, index) => {
      while (cursors[index] < points.length && points[cursors[index]].time <= time) {
        bests[index] = Math.max(bests[index], points[cursors[index]].e1rm)
        cursors[index] += 1
      }
    })
    if (bests.some((value) => !Number.isFinite(value))) continue
    const total = mround(
      bests.reduce((sum, value) => sum + value, 0),
      0.5,
    )
    totals.push({ date, total, totalKg: convertWeight(total, units ?? 'kg', 'kg') })
  }

  return totals
}

function buildRepMaxBests(entries: LiftSessionEntry[]): RepMaxBests {
  return {
    oneRm: bestAtReps(entries, 1),
    threeRm: bestAtReps(entries, 3),
    fiveRm: bestAtReps(entries, 5),
  }
}

function bestAtReps(entries: LiftSessionEntry[], minReps: number): RepMaxBest | null {
  let best: RepMaxBest | null = null
  for (const entry of entries) {
    for (const set of entry.sets) {
      if (set.reps < minReps) continue
      if (!best || set.load > best.load) {
        best = { load: set.load, reps: set.reps, date: entry.date }
      }
    }
  }
  return best
}

function toTimedPoints(points: E1rmPoint[]): TimedPoint[] {
  const timed: TimedPoint[] = []
  for (const point of points) {
    if (point.outlier) continue
    const time = parseDate(point.date)?.getTime()
    if (time == null) continue
    timed.push({ date: point.date, time, e1rm: point.e1rm })
  }
  return timed.sort((a, b) => a.time - b.time)
}

function leastSquaresSlopePerDay(points: TimedPoint[]): number {
  const origin = points[0].time
  const xs = points.map((point) => (point.time - origin) / DAY_MS)
  const meanX = xs.reduce((total, x) => total + x, 0) / xs.length
  const meanY = points.reduce((total, point) => total + point.e1rm, 0) / points.length
  let numerator = 0
  let denominator = 0
  for (let index = 0; index < points.length; index += 1) {
    const dx = xs[index] - meanX
    numerator += dx * (points[index].e1rm - meanY)
    denominator += dx * dx
  }
  return denominator === 0 ? 0 : numerator / denominator
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
