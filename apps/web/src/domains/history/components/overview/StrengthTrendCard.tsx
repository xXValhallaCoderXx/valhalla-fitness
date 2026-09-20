import { LineChart } from '@mantine/charts'
import { ArrowRight } from 'lucide-react'
import { selectScoreReadings, selectScoreTrend } from '~/domains/history/lib/insight-selectors'
import { strengthScoreExplanation, strengthScoreKindLabels } from '~/domains/history/lib/dots'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'
import { formatTotalMetricValue, totalMetricLabel } from '~/domains/history/lib/total-metric'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import type { HistoryInsights } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { formatDayMonth } from '~/shared/lib/dates'
import { Caption, InfoHint, Panel, Text } from '~/components'
import type { HistoryTab } from '../insight-format'

/**
 * How the strength score has moved.
 *
 * The chart plots whichever metric the score actually resolved to, so a lifter without a bodyweight
 * sees their × bodyweight line rather than an empty DOTS axis. Stays a `LineChart` — the comp fills
 * the area beneath it, but the fill would change the chart's root element and the e2e reads it.
 */
export function StrengthTrendCard({
  insights,
  range,
  onNavigate,
}: {
  insights: HistoryInsights
  range: InsightRange
  onNavigate: (tab: HistoryTab) => void
}) {
  const { mode, isFull } = useExperienceMode()
  const { metric, points } = selectScoreTrend(insights, range)
  const readings = selectScoreReadings(insights, range)
  const chartPoints = points
    .filter((point): point is { date: string; value: number } => typeof point.value === 'number' && Number.isFinite(point.value))
    .map((point) => ({ date: formatDayMonth(point.date), value: point.value }))

  return (
    <Panel p="md" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <span className="inline-flex items-baseline gap-1.5">
          <Text component="span" size="sm" fw={700}>
            {insightCardLabel('liftTrend', mode)}
          </Text>
          {isFull ? (
            <Caption component="span" fw={700}>· {strengthScoreKindLabels[insights.strengthScore.kind]}</Caption>
          ) : null}
          <InfoHint label="About this metric">{strengthScoreExplanation}</InfoHint>
        </span>
        <button type="button" onClick={() => onNavigate('strength')} className="inline-flex shrink-0 items-center gap-1">
          <Text component="span" size="xs" fw={700} tone="action">
            {isFull ? 'Explore' : 'See your lift trends'}
          </Text>
          <ArrowRight size={13} color="var(--vf-action-text)" />
        </button>
      </div>

      {chartPoints.length >= 2 ? (
        <div className="mt-3">
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
      ) : (
        <Caption component="p" mt="sm">
          Two scored sessions in this range draw the line.
        </Caption>
      )}

      {readings.length ? (
        <div className="mt-3 flex items-baseline justify-between gap-3">
          {readings.map((reading, index) => (
            <Caption
              key={reading.date}
              fw={index === readings.length - 1 ? 700 : undefined}
              tone={index === readings.length - 1 ? 'default' : 'dimmed'}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatDayMonth(reading.date)} · {formatTotalMetricValue(reading.value, metric, insights.units)}
            </Caption>
          ))}
        </div>
      ) : null}
    </Panel>
  )
}
