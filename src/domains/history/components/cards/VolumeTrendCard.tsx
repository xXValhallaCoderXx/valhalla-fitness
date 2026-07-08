import { AreaChart } from '@mantine/charts'
import { Badge } from '@mantine/core'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { resolveVolumeTrendSignal, volumeTrendExplanation, volumeTrendLabels } from '~/domains/history/lib/insight-state'
import type { HistoryInsights, InsightGating, VolumeTrendSignal } from '~/shared/types'
import { Caption, InfoHint, Panel, SectionLabel, Text } from '~/components'
import { formatLoad, formatNumber } from '../insight-format'

const TREND_BADGE_COLOR: Record<VolumeTrendSignal, string> = {
  rising: 'success',
  flat: 'neutral',
  declining: 'warning',
  deload_planned: 'accent',
  insufficient: 'neutral',
}

export function VolumeTrendCard({
  insights,
  gating,
  range,
}: {
  insights: HistoryInsights
  gating: InsightGating
  range: InsightRange
}) {
  const weeks = filterToRange(insights.weeklyVolume, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.generatedAt,
    getDate: (week) => week.weekStart,
  })
  const signal = resolveVolumeTrendSignal(weeks, gating)
  const rangeTotal = weeks.reduce((total, week) => total + week.volume, 0)
  const deloadWeeks = weeks.filter((week) => week.isDeload).length
  const chartData = weeks.map((week) => ({ week: week.weekLabel, volume: Math.round(week.volume) }))

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1">
            <SectionLabel>Weekly volume</SectionLabel>
            <InfoHint label="About this metric">{volumeTrendExplanation}</InfoHint>
          </span>
          <Text mt={4} size="sm" fw={900}>
            {formatLoad(rangeTotal, insights.units)} in range
          </Text>
        </div>
        <Badge color={TREND_BADGE_COLOR[signal]} variant="light">
          {volumeTrendLabels[signal]}
        </Badge>
      </div>

      {chartData.length >= 2 ? (
        <div className="mt-3">
          <AreaChart
            h={180}
            data={chartData}
            dataKey="week"
            series={[{ name: 'volume', label: 'Volume', color: 'var(--vf-action-text)' }]}
            curveType="linear"
            withDots
            fillOpacity={0.18}
            strokeWidth={2}
            valueFormatter={(value) => formatNumber(value)}
            yAxisProps={{ width: 52 }}
            xAxisProps={{ minTickGap: 24 }}
          />
          {deloadWeeks > 0 ? (
            <Caption mt={6}>
              {deloadWeeks} deload {deloadWeeks === 1 ? 'week' : 'weeks'} in range — lighter on purpose.
            </Caption>
          ) : null}
        </div>
      ) : (
        <Caption mt="sm">Weekly volume trend appears once you have two training weeks in this range.</Caption>
      )}
    </Panel>
  )
}
