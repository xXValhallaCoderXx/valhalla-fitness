import type { HistoryInsights, StrengthScoreKind, TotalPoint } from '~/shared/types'
import { formatLoad, formatNumber } from '~/domains/history/components/insight-format'

/** Which series of a TotalPoint the strength score is expressed in — mirrors StrengthScore.kind. */
export type TotalMetric = 'dots' | 'bwMultiple' | 'total'

export function totalMetricFor(kind: StrengthScoreKind): TotalMetric {
  if (kind === 'dots') return 'dots'
  if (kind === 'bw_multiple') return 'bwMultiple'
  return 'total'
}

export function totalMetricValue(point: TotalPoint, metric: TotalMetric): number | null {
  if (metric === 'dots') return point.dots
  if (metric === 'bwMultiple') return point.bwMultiple
  return point.total
}

export function totalMetricLabel(metric: TotalMetric, units: HistoryInsights['units']) {
  if (metric === 'dots') return 'DOTS'
  if (metric === 'bwMultiple') return 'x bodyweight'
  return `Total ${units ?? ''}`.trim()
}

export function formatTotalMetricValue(value: number, metric: TotalMetric, units: HistoryInsights['units']) {
  if (metric === 'dots') return formatNumber(value)
  if (metric === 'bwMultiple') return `${formatNumber(value)}x`
  return formatLoad(value, units)
}
