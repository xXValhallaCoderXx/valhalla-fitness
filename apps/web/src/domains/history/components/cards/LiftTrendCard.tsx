import { LineChart } from '@mantine/charts'
import { Badge } from '@mantine/core'
import { formatCompactDate } from '~/shared/lib/dates'
import type {
  E1rmTrendSignal,
  HistoryInsights,
  InsightGating,
  LiftE1rmSeries,
} from '~/domains/history'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { classifyE1rmTrend, computeVelocity, detectStall, e1rmTrendLabels, estimatedMaxExplanation } from '~/domains/history/lib/strength'
import { Caption, Heading, InfoHint, Panel } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { formatLoad, formatNumber } from '../insight-format'
import { buildLiftStats } from '~/domains/history/lib/lift-stats'
import { InsightStatCell } from '../insights/InsightStatCell'
import { InsightStatStrip } from '../insights/InsightStatStrip'
import { LiftRepRecordsTable } from '../strength/LiftRepRecordsTable'

const TREND_BADGE_COLOR: Record<E1rmTrendSignal, string> = {
  rising: 'success',
  flat: 'neutral',
  declining: 'warning',
  detraining: 'accent',
  insufficient: 'neutral',
}

const OUTLIER_FOOTNOTE = "Hollow points look like typos (way above your recent best) — they're shown but not counted."


function formatChartValue(value: number) {
  return Number.isFinite(value) ? formatNumber(value) : '—'
}

export function LiftTrendCard({
  series,
  insights,
  gating,
  range,
  trainingMax = null,
}: {
  series: LiftE1rmSeries
  insights: HistoryInsights
  gating: InsightGating
  range: InsightRange
  /** The programme's training max for this lift, when it programmes one off it. */
  trainingMax?: { value: number; updatedAt?: string | null; changedBy?: number | null } | null
}) {
  const { mode } = useExperienceMode()
  const units = insights.units
  const slicedPoints = filterToRange(series.points, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.today,
    getDate: (point) => point.date,
  })
  const trend = classifyE1rmTrend(slicedPoints, insights.today)
  const velocity = computeVelocity(slicedPoints, insights.today)


  // Stall reads the FULL series (PRs are absolute, not range-relative); welcome-back framing replaces it.
  const stallLine = (() => {
    if (gating.staleWelcomeBack) return null
    const stall = detectStall(series.points, insights.today)
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


  return (
    <Panel p="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading order={4}>{series.movementName}</Heading>
        <Badge color={TREND_BADGE_COLOR[trend]} variant="light">
          {e1rmTrendLabels[trend]}
        </Badge>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <InfoHint label="About this metric">{estimatedMaxExplanation}</InfoHint>
        {velocity != null ? (
          <Caption fw={700} tone={velocity > 0 ? 'success' : velocity < 0 ? 'warning' : 'dimmed'}>
            {velocity > 0 ? '+' : ''}
            {formatLoad(velocity, units)}/mo
          </Caption>
        ) : null}
        {stallLine ? <Caption fw={700} tone={stallLine.tone}>{stallLine.text}</Caption> : null}
      </div>

      {/* 08a's four figures: where the lift is, what it lifted, what it is programmed off, and how
          far it moved. A cell with nothing behind it is dropped by `buildLiftStats`, not dashed. */}
      <div className="mt-3">
        <InsightStatStrip
          cells={buildLiftStats({
            points: slicedPoints,
            trainingMax,
            units,
            mode,
            staleWelcomeBack: gating.staleWelcomeBack,
          }).map((stat) => (
            <InsightStatCell key={stat.key} label={stat.label} value={stat.value} subline={stat.detail ?? ''} />
          ))}
        />
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

      <LiftRepRecordsTable bests={series.repMaxBests} units={units} />

    </Panel>
  )
}
