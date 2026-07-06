import { LineChart } from '@mantine/charts'
import { Badge } from '@mantine/core'
import { formatCompactDate } from '~/shared/lib/dates'
import type { E1rmPoint, E1rmTrendSignal, HistoryInsights, InsightGating, LiftE1rmSeries, RepMaxBest } from '~/shared/types'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { classifyE1rmTrend, computeVelocity, detectStall, e1rmTrendLabels } from '~/domains/history/lib/strength'
import { Caption, Heading, Panel, SectionLabel, StatValue, Text } from '~/components'
import { formatLoad, formatNumber } from '../insight-format'

const TREND_BADGE_COLOR: Record<E1rmTrendSignal, string> = {
  rising: 'success',
  flat: 'neutral',
  declining: 'warning',
  detraining: 'accent',
  insufficient: 'neutral',
}

const OUTLIER_FOOTNOTE = "Hollow points look like typos (way above your recent best) — they're shown but not counted."

function bestOf(points: E1rmPoint[]): E1rmPoint | null {
  let best: E1rmPoint | null = null
  for (const point of points) {
    if (!best || point.e1rm > best.e1rm) best = point
  }
  return best
}

function formatChartValue(value: number) {
  return Number.isFinite(value) ? formatNumber(value) : '—'
}

export function LiftTrendCard({
  series,
  insights,
  gating,
  range,
}: {
  series: LiftE1rmSeries
  insights: HistoryInsights
  gating: InsightGating
  range: InsightRange
}) {
  const units = insights.units
  const slicedPoints = filterToRange(series.points, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.generatedAt,
    getDate: (point) => point.date,
  })
  const trend = classifyE1rmTrend(slicedPoints, insights.generatedAt)
  const velocity = computeVelocity(slicedPoints, insights.generatedAt)

  const slicedClean = slicedPoints.filter((point) => !point.outlier)
  const allClean = series.points.filter((point) => !point.outlier)
  const latestPoint = slicedClean[slicedClean.length - 1] ?? allClean[allClean.length - 1] ?? null
  const allTimeBest = bestOf(allClean)
  const headlinePoint = gating.staleWelcomeBack ? (bestOf(slicedClean) ?? allTimeBest) : latestPoint

  // Stall reads the FULL series (PRs are absolute, not range-relative); welcome-back framing replaces it.
  const stallLine = (() => {
    if (gating.staleWelcomeBack) return null
    const stall = detectStall(series.points, insights.generatedAt)
    const weeks = stall.weeksSincePr ?? 0
    if (stall.signal === 'progressing') {
      return { text: weeks === 0 ? 'Last PR this week' : `Last PR ${weeks}w ago`, tone: 'success' as const }
    }
    if (stall.signal === 'watch') return { text: `No PR in ${weeks} weeks`, tone: 'warning' as const }
    if (stall.signal === 'stalled') {
      return { text: `No PR in ${weeks} weeks — time to shake things up`, tone: 'danger' as const }
    }
    return null
  })()

  const hasOutliers = slicedPoints.some((point) => point.outlier)
  const chartData = slicedPoints.map((point) => ({
    date: formatCompactDate(point.date),
    e1rm: point.outlier ? null : point.e1rm,
    flagged: point.outlier ? point.e1rm : null,
  }))
  const chartSeries = [
    { name: 'e1rm', label: 'e1RM', color: 'var(--vf-action-text)' },
    ...(hasOutliers ? [{ name: 'flagged', label: 'Looks like a typo', color: 'var(--mantine-color-dimmed)' }] : []),
  ]

  const repMaxItems = [
    { label: '1RM', best: series.repMaxBests.oneRm },
    { label: '3RM', best: series.repMaxBests.threeRm },
    { label: '5RM', best: series.repMaxBests.fiveRm },
  ].filter((item): item is { label: string; best: RepMaxBest } => item.best !== null)

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading order={4}>{series.movementName}</Heading>
        <Badge color={TREND_BADGE_COLOR[trend]} variant="light">
          {e1rmTrendLabels[trend]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <SectionLabel>{gating.staleWelcomeBack ? 'Best e1RM' : 'Current e1RM'}</SectionLabel>
          <StatValue size="xl" mt={2}>
            {headlinePoint ? formatLoad(headlinePoint.e1rm, units) : '—'}
          </StatValue>
          {gating.staleWelcomeBack && headlinePoint ? (
            <Caption mt={2}>as of {formatCompactDate(headlinePoint.date)} — log a session for a fresh read</Caption>
          ) : null}
          {allTimeBest ? <Caption mt={2}>All-time best {formatLoad(allTimeBest.e1rm, units)}</Caption> : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {velocity != null ? (
            <Text size="xs" fw={700} tone={velocity > 0 ? 'success' : velocity < 0 ? 'warning' : 'dimmed'}>
              {velocity > 0 ? '+' : ''}
              {formatLoad(velocity, units)}/mo
            </Text>
          ) : null}
          {stallLine ? (
            <Text size="xs" fw={700} tone={stallLine.tone}>
              {stallLine.text}
            </Text>
          ) : null}
        </div>
      </div>

      {slicedPoints.length < 2 ? (
        <Caption mt="sm">
          Trend unlocks after a few more sessions — {slicedPoints.length} logged so far in this range.
        </Caption>
      ) : (
        <div className="mt-3">
          <LineChart
            h={220}
            data={chartData}
            dataKey="date"
            series={chartSeries}
            curveType="linear"
            strokeWidth={2}
            dotProps={{ r: 3 }}
            valueFormatter={formatChartValue}
            yAxisProps={{ domain: ['auto', 'auto'], width: 48 }}
            xAxisProps={{ minTickGap: 24 }}
            lineProps={(chartLine) =>
              chartLine.name === 'flagged'
                ? {
                    strokeWidth: 0,
                    dot: { r: 4, fill: 'var(--mantine-color-body)', stroke: 'var(--mantine-color-dimmed)', strokeWidth: 1.5 },
                    activeDot: { r: 5, fill: 'var(--mantine-color-body)', stroke: 'var(--mantine-color-dimmed)' },
                  }
                : {}
            }
          />
          {hasOutliers ? <Caption mt={6}>{OUTLIER_FOOTNOTE}</Caption> : null}
        </div>
      )}

      {repMaxItems.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {repMaxItems.map((item) => (
            <Panel key={item.label} surface="inset" p="xs">
              <SectionLabel>{item.label} best</SectionLabel>
              <Text mt={2} size="sm" fw={800}>
                {formatLoad(item.best.load, units)}
              </Text>
              <Caption mt={1}>{formatCompactDate(item.best.date)}</Caption>
            </Panel>
          ))}
        </div>
      ) : null}
    </Panel>
  )
}
