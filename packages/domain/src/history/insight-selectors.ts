import { filterToRange, filterWeeksToRange, type InsightRange } from './insight-ranges'
import { totalMetricFor, totalMetricValue } from './total-metric'
import { classifyE1rmTrend, computeVelocity, detectStall } from './strength'
import type { E1rmPoint, HistoryInsights, InsightGating, LiftE1rmSeries } from './types'

export function selectScoreTrend(insights: HistoryInsights, range: InsightRange) {
  const metric = totalMetricFor(insights.strengthScore.kind)
  const points = filterToRange(insights.totalSeries, range, {
    firstDataDate: insights.firstSessionDate, now: insights.today, getDate: (point) => point.date,
  }).map((point) => ({ date: point.date, value: totalMetricValue(point, metric) }))
  return { metric, points }
}

/** The score's readable points in range — the non-finite ones are gaps, not zeroes. */
function scorePoints(insights: HistoryInsights, range: InsightRange) {
  return selectScoreTrend(insights, range).points.filter(
    (point): point is { date: string; value: number } => point.value !== null && Number.isFinite(point.value),
  )
}

/**
 * How far the score moved across the visible window — the design's "+20.1 in range".
 *
 * Deliberately last − first rather than against an all-time baseline: the figure sits under a range
 * switch, so it has to answer "in this window", or changing the range would leave it unchanged and
 * look broken.
 */
export function selectScoreDelta(insights: HistoryInsights, range: InsightRange): number | null {
  const points = scorePoints(insights, range)
  if (points.length < 2) return null
  return Math.round((points[points.length - 1].value - points[0].value) * 10) / 10
}

/**
 * First, middle and last readings for the caption under the trend chart.
 *
 * At most three and never duplicated, so a two-point series reads as two points rather than
 * repeating its ends.
 */
export function selectScoreReadings(
  insights: HistoryInsights,
  range: InsightRange,
): Array<{ date: string; value: number }> {
  const points = scorePoints(insights, range)
  if (points.length <= 3) return points
  return [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]]
}

export function selectInsightWeeks<T extends { weekStart: string }>(weeks: T[], insights: HistoryInsights, range: InsightRange) {
  return filterWeeksToRange(weeks, range, { firstDataDate: insights.firstSessionDate, now: insights.today })
}

const bestOf = (points: E1rmPoint[]) => points.reduce<E1rmPoint | null>((best, point) =>
  !best || point.e1rm > best.e1rm ? point : best, null)

export function selectLiftTrend(series: LiftE1rmSeries, insights: HistoryInsights, gating: InsightGating, range: InsightRange) {
  const points = filterToRange(series.points, range, {
    firstDataDate: insights.firstSessionDate, now: insights.today, getDate: (point) => point.date,
  })
  const clean = points.filter((point) => !point.outlier)
  const allClean = series.points.filter((point) => !point.outlier)
  const best = bestOf(allClean)
  return {
    points, best,
    current: gating.staleWelcomeBack ? bestOf(clean) ?? best : clean.at(-1) ?? allClean.at(-1) ?? null,
    trend: classifyE1rmTrend(points, insights.today),
    velocity: computeVelocity(points, insights.today),
    stall: gating.staleWelcomeBack ? null : detectStall(series.points, insights.today),
  }
}
