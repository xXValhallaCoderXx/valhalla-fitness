import { LineChart } from '@mantine/charts'
import { Badge } from '@mantine/core'
import { formatCompactDate } from '~/shared/lib/dates'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { calibrationSignalLabels } from '~/domains/history/lib/calibration'
import { strengthScoreKindLabels } from '~/domains/history/lib/dots'
import { dataLifecycleLabels } from '~/domains/history/lib/insight-state'
import { formatTotalMetricValue, totalMetricFor, totalMetricLabel, totalMetricValue } from '~/domains/history/lib/total-metric'
import type { HistoryInsights, InsightGating, StrengthScoreKind, TotalPoint } from '~/shared/types'
import { Caption, EmptyState, Heading, Panel, SectionLabel, StatValue, Text } from '~/components'
import { BodyweightPromptCard } from '../BodyweightPromptCard'
import { LiftTrendCard } from '../cards/LiftTrendCard'
import { formatLoad, formatNumber } from '../insight-format'

const SCORE_BADGE_COLOR: Record<StrengthScoreKind, string> = {
  dots: 'success',
  bw_multiple: 'action',
  total: 'warning',
  insufficient: 'neutral',
}

export function StrengthTab({
  insights,
  gating,
  range,
}: {
  insights: HistoryInsights
  gating: InsightGating
  range: InsightRange
}) {
  if (insights.lifetime.sessions === 0) {
    return (
      <EmptyState centered title="No strength history yet">
        Complete workouts with logged loads and reps to build strength trends.
      </EmptyState>
    )
  }

  const totalPoints = filterToRange(insights.totalSeries, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.generatedAt,
    getDate: (point) => point.date,
  })
  const hasBodyweight = insights.bodyweight.entries.length > 0
  const hasSex = insights.bodyweight.sex !== null
  const shouldPromptForDots = insights.strengthScore.totalKg !== null && (!hasBodyweight || !hasSex)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <StrengthScorePanel
          insights={insights}
          totalPoints={totalPoints}
          hasBodyweight={hasBodyweight}
          hasSex={hasSex}
          showPrompt={shouldPromptForDots}
        />
        <TrainingHealthPanel insights={insights} gating={gating} />
      </div>

      {insights.liftSeries.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {insights.liftSeries.map((series) => (
            <LiftTrendCard key={series.movementId} series={series} insights={insights} gating={gating} range={range} />
          ))}
        </div>
      ) : (
        <Panel p="md">
          <Text size="sm" tone="dimmed">
            Strength lift trends unlock after loaded sets for squat, bench press, deadlift, overhead press, or barbell row.
          </Text>
        </Panel>
      )}
    </div>
  )
}

function StrengthScorePanel({
  insights,
  totalPoints,
  hasBodyweight,
  hasSex,
  showPrompt,
}: {
  insights: HistoryInsights
  totalPoints: TotalPoint[]
  hasBodyweight: boolean
  hasSex: boolean
  showPrompt: boolean
}) {
  const score = insights.strengthScore
  const metric = totalMetricFor(score.kind)
  const chartPoints = totalPoints
    .map((point) => ({ date: formatCompactDate(point.date), value: totalMetricValue(point, metric) }))
    .filter((point): point is { date: string; value: number } => typeof point.value === 'number' && Number.isFinite(point.value))

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>Strength score</SectionLabel>
          <StatValue size="xl" mt={4}>
            {formatStrengthScore(score.kind, score.value, insights.units)}
          </StatValue>
          <Caption mt={3}>{strengthScoreCaption(score.kind)}</Caption>
        </div>
        <Badge color={SCORE_BADGE_COLOR[score.kind]} variant="light">
          {strengthScoreKindLabels[score.kind]}
        </Badge>
      </div>

      {chartPoints.length >= 2 ? (
        <div className="mt-4">
          <LineChart
            h={190}
            data={chartPoints}
            dataKey="date"
            series={[{ name: 'value', label: totalMetricLabel(metric, insights.units), color: 'var(--vf-action-text)' }]}
            curveType="linear"
            strokeWidth={2}
            dotProps={{ r: 3 }}
            valueFormatter={(value) => formatTotalMetricValue(value, metric, insights.units)}
            yAxisProps={{ domain: ['auto', 'auto'], width: 48 }}
            xAxisProps={{ minTickGap: 24 }}
          />
        </div>
      ) : (
        <Caption mt="md">Total trend unlocks once squat, bench, and deadlift all have logged strength points.</Caption>
      )}

      {showPrompt ? <BodyweightPromptCard units={insights.units} hasBodyweight={hasBodyweight} hasSex={hasSex} /> : null}
    </Panel>
  )
}

function TrainingHealthPanel({ insights, gating }: { insights: HistoryInsights; gating: InsightGating }) {
  const calibration = insights.calibration
  const nextMilestone = insights.milestones.nextUp

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>Training read</SectionLabel>
          <Heading order={3} size="h4" mt={4}>
            {dataLifecycleLabels[gating.lifecycle]}
          </Heading>
        </div>
        <Badge color={gating.suppressWeekComparison ? 'warning' : 'success'} variant="light">
          {gating.planState === 'active_deload' ? 'Deload week' : calibrationSignalLabels[calibration.signal]}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Avg sessions" value={nullableNumber(insights.consistency.avgSessionsPerWeek)} caption="per week" />
        <MiniStat label="Current streak" value={String(insights.consistency.currentStreakWeeks)} caption="weeks" />
        <MiniStat label="Logged reps" value={formatNumber(insights.lifetime.reps)} caption={`${insights.lifetime.sets} sets`} />
        <MiniStat
          label="RIR match"
          value={calibration.meanGap === null ? '-' : signedNumber(calibration.meanGap)}
          caption={`${calibration.pairedSetCount} paired sets`}
        />
      </div>

      {nextMilestone ? (
        <Panel surface="inset" p="sm" mt="sm">
          <SectionLabel>Next milestone</SectionLabel>
          <Text mt={4} size="sm" fw={800}>
            {nextMilestone.label}
          </Text>
          <Caption mt={2}>{nextMilestone.progressPercent}% complete</Caption>
        </Panel>
      ) : insights.milestones.earned.length ? (
        <Caption mt="sm">All tracked lifetime milestones are earned.</Caption>
      ) : null}
    </Panel>
  )
}

function MiniStat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <Panel surface="inset" p="xs">
      <SectionLabel>{label}</SectionLabel>
      <Text mt={2} size="sm" fw={900}>
        {value}
      </Text>
      <Caption mt={1}>{caption}</Caption>
    </Panel>
  )
}

function formatStrengthScore(kind: StrengthScoreKind, value: number | null, units: HistoryInsights['units']) {
  if (value === null) return '-'
  if (kind === 'dots') return formatNumber(value)
  if (kind === 'bw_multiple') return `${formatNumber(value)}x`
  if (kind === 'total') return formatLoad(value, units)
  return '-'
}

function strengthScoreCaption(kind: StrengthScoreKind) {
  if (kind === 'dots') return 'Powerlifting total adjusted for bodyweight.'
  if (kind === 'bw_multiple') return 'Add sex to convert this bodyweight multiple into DOTS.'
  if (kind === 'total') return 'Add bodyweight to compare strength relative to size.'
  return 'Squat, bench, and deadlift all need logged loaded work.'
}

function nullableNumber(value: number | null) {
  return value === null ? '-' : formatNumber(value)
}

function signedNumber(value: number) {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`
}
