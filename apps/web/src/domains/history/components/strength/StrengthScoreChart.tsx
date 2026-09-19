import { LineChart } from '@mantine/charts'
import { selectScoreReadings, selectScoreTrend } from '~/domains/history/lib/insight-selectors'
import { formatTotalMetricValue, totalMetricLabel } from '~/domains/history/lib/total-metric'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'
import type { HistoryInsights } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { formatDayMonth } from '~/shared/lib/dates'
import { Caption, Panel, SectionLabel } from '~/components'

/**
 * The score over time.
 *
 * Rendered unconditionally above its own empty caption: this is the chart the Strength tab is read
 * for, and hanging it off the per-lift cards would make it vanish on a thin range.
 */
export function StrengthScoreChart({ insights, range }: { insights: HistoryInsights; range: InsightRange }) {
  const { mode, isFull } = useExperienceMode()
  const { metric, points } = selectScoreTrend(insights, range)
  const readings = selectScoreReadings(insights, range)
  const chartPoints = points
    .filter((point): point is { date: string; value: number } => typeof point.value === 'number' && Number.isFinite(point.value))
    .map((point) => ({ date: formatDayMonth(point.date), value: point.value }))

  return (
    <Panel p="md">
      {/* The metric is already named by the badge above; Guided does not need it twice. */}
      <SectionLabel>
        {insightCardLabel('liftTrend', mode)}
        {isFull ? ` · ${totalMetricLabel(metric, insights.units)}` : ''}
      </SectionLabel>
      {chartPoints.length >= 2 ? (
        <div className="mt-3">
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
        <Caption component="p" mt="sm">
          Total trend unlocks once squat, bench, and deadlift all have logged strength points.
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
