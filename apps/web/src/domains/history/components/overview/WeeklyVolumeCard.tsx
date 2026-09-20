import { BarChart } from '@mantine/charts'
import { filterWeeksToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { resolveVolumeTrendSignal, volumeTrendExplanation, volumeTrendLabels } from '~/domains/history/lib/insight-state'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'
import type { HistoryInsights, InsightGating } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, InfoHint, Panel, Text } from '~/components'
import { formatNumber } from '../insight-format'

/**
 * Work done, week by week.
 *
 * Bars rather than an area, per the design: weekly volume is a set of discrete totals, and a line
 * between them implies a reading on the days in between.
 */
export function WeeklyVolumeCard({
  insights,
  gating,
  range,
}: {
  insights: HistoryInsights
  gating: InsightGating
  range: InsightRange
}) {
  const { mode, isFull } = useExperienceMode()
  const weeks = filterWeeksToRange(insights.weeklyVolume, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.today,
  })
  const signal = resolveVolumeTrendSignal(weeks, gating)
  const deloadWeeks = weeks.filter((week) => week.isDeload).length
  const chartData = weeks.map((week) => ({ week: week.weekLabel, volume: Math.round(week.volume) }))

  return (
    <Panel p="md" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <span className="inline-flex items-baseline gap-1.5">
          <Text component="span" size="sm" fw={700}>
            {insightCardLabel('volumeWeekly', mode)}
          </Text>
          <InfoHint label="About this metric">{volumeTrendExplanation}</InfoHint>
        </span>
        <Caption fw={700} className="shrink-0">{volumeTrendLabels[signal]}</Caption>
      </div>

      {chartData.length >= 2 ? (
        <div className="mt-3">
          <BarChart
            h={150}
            data={chartData}
            dataKey="week"
            series={[{ name: 'volume', label: 'Volume', color: 'var(--vf-action-text)' }]}
            valueFormatter={(value) => formatNumber(value)}
            yAxisProps={{ width: 52 }}
            xAxisProps={{ minTickGap: 12 }}
            barProps={{ radius: [5, 5, 2, 2] }}
          />
        </div>
      ) : (
        <Caption component="p" mt="sm">
          Weekly volume appears once you have two training weeks in this range.
        </Caption>
      )}

      {deloadWeeks > 0 ? (
        <Caption component="p" mt={6}>
          {deloadWeeks} deload {deloadWeeks === 1 ? 'week' : 'weeks'} in range — lighter on purpose.
        </Caption>
      ) : null}

      {/* Guided gets the sentence that says what the chart is for; Full reads the shape directly. */}
      {isFull ? null : (
        <Caption
          component="p"
          mt="sm"
          pt="sm"
          lh={1.5}
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          {volumeTrendExplanation}
        </Caption>
      )}
    </Panel>
  )
}
