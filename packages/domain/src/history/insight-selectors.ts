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
