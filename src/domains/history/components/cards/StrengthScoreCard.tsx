import { LineChart } from '@mantine/charts'
import { Badge } from '@mantine/core'
import { ArrowRight } from 'lucide-react'
import { formatCompactDate } from '~/shared/lib/dates'
import { strengthScoreKindLabels } from '~/domains/history/lib/dots'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { formatTotalMetricValue, totalMetricFor, totalMetricLabel, totalMetricValue } from '~/domains/history/lib/total-metric'
import type { HistoryInsights, StrengthScoreKind } from '~/shared/types'
import { Caption, Panel, SectionLabel, StatValue, Text } from '~/components'
import { BodyweightPromptCard } from '../BodyweightPromptCard'
import { formatLoad, formatNumber, type HistoryTab } from '../insight-format'

const SCORE_BADGE_COLOR: Record<StrengthScoreKind, string> = {
  dots: 'success',
  bw_multiple: 'action',
  total: 'warning',
  insufficient: 'neutral',
}

/** Compact Overview teaser for the relative-strength score; the Strength tab has the full trend + panel. */
export function StrengthScoreCard({
  insights,
  completedSessions,
  range,
  onNavigate,
}: {
  insights: HistoryInsights
  completedSessions: number
  range: InsightRange
  onNavigate: (tab: HistoryTab) => void
}) {
  const score = insights.strengthScore
  const hasBodyweight = insights.bodyweight.entries.length > 0
  const hasSex = insights.bodyweight.sex !== null
  // Prompt once there's real training to reward, even before a full S/B/D total exists.
  const showPrompt = (!hasBodyweight || !hasSex) && completedSessions >= 2

  // Honest history: chart only the metric matching score.kind, and only with >= 2 real points.
  const metric = totalMetricFor(score.kind)
  const chartPoints = filterToRange(insights.totalSeries, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.generatedAt,
    getDate: (point) => point.date,
  })
    .map((point) => ({ date: formatCompactDate(point.date), value: totalMetricValue(point, metric) }))
    .filter((point): point is { date: string; value: number } => typeof point.value === 'number' && Number.isFinite(point.value))

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>Strength score</SectionLabel>
          <StatValue size="xl" mt={4}>
            {formatScore(score.kind, score.value, insights.units)}
          </StatValue>
          <Caption mt={3}>{scoreCaption(score.kind, score, insights.units)}</Caption>
        </div>
        <Badge color={SCORE_BADGE_COLOR[score.kind]} variant="light">
          {strengthScoreKindLabels[score.kind]}
        </Badge>
      </div>

      {chartPoints.length >= 2 ? (
        <div className="mt-4">
          <LineChart
            h={150}
            data={chartPoints}
            dataKey="date"
            series={[{ name: 'value', label: totalMetricLabel(metric, insights.units), color: 'var(--vf-action-text)' }]}
            curveType="linear"
            strokeWidth={2}
            dotProps={{ r: 3 }}
            valueFormatter={(value) => formatTotalMetricValue(value, metric, insights.units)}
            yAxisProps={{ domain: ['auto', 'auto'], width: 44 }}
            xAxisProps={{ minTickGap: 24 }}
          />
        </div>
      ) : null}

      {score.kind !== 'insufficient' ? (
        <button type="button" onClick={() => onNavigate('strength')} className="mt-3 inline-flex items-center gap-1">
          <Text component="span" size="xs" fw={700} c="var(--vf-action-text)">
            See your lift trends
          </Text>
          <ArrowRight size={13} color="var(--vf-action-text)" />
        </button>
      ) : null}

      {showPrompt ? <BodyweightPromptCard units={insights.units} hasBodyweight={hasBodyweight} hasSex={hasSex} /> : null}
    </Panel>
  )
}

function formatScore(kind: StrengthScoreKind, value: number | null, units: HistoryInsights['units']) {
  if (value === null) return '—'
  if (kind === 'dots') return formatNumber(value)
  if (kind === 'bw_multiple') return `${formatNumber(value)}×`
  if (kind === 'total') return formatLoad(value, units)
  return '—'
}

function scoreCaption(kind: StrengthScoreKind, score: HistoryInsights['strengthScore'], units: HistoryInsights['units']) {
  if (kind === 'dots') {
    const bw = score.bodyweightKg
    return `Total ${formatLoad(score.total ?? 0, units)}${bw ? ` · ${formatNumber(bw)} kg bodyweight` : ''}`
  }
  if (kind === 'bw_multiple') return 'Add sex in Settings to turn this into a DOTS score.'
  if (kind === 'total') return 'Bodyweight-adjusted scoring unlocks with your bodyweight.'
  return 'Your powerlifting total appears once squat, bench, and deadlift are logged.'
}
