import { LineChart } from '@mantine/charts'
import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { buildBodyweightTrend } from '@sheetless/domain/history/bodyweight-trend'
import type { HistoryInsights } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import { formatCompactDate } from '~/shared/lib/dates'
import { formatWeight } from '~/shared/lib/set-notation'
import { Caption, Panel, SectionLabel, StatValue, Text } from '~/components'

export function BodyweightTrendCard({ insights, range }: { insights: HistoryInsights; range: InsightRange }) {
  const units = insights.bodyweight.units
  const trend = buildBodyweightTrend({ entries: insights.bodyweight.entries, range, today: insights.today, units })
  const dateLabel = (value: number) => formatCompactDate(new Date(value).toISOString().slice(0, 10))
  return <Panel p="md" data-testid="bodyweight-trend">
    <SectionLabel>Bodyweight</SectionLabel>
    {trend.latest ? <>
      <StatValue size="xl" mt={4}>{formatWeight(trend.latest.value, units)}</StatValue>
      <Caption mt={4}>Latest recorded · {trend.latest.date}{trend.latestOutsideRange ? ' · outside selected range' : ''}</Caption>
      <Caption mt={4}>{trend.count} {trend.count === 1 ? 'measurement' : 'measurements'} in range · {trend.totalCount} recorded</Caption>
      {trend.change !== null ? <Text size="sm" mt="sm">Change in range: {trend.change > 0 ? '+' : ''}{formatWeight(trend.change, units)}</Text> : null}
      {trend.count ? <div className="mt-4" aria-label="Bodyweight measurements">
        <LineChart h={210} data={trend.points} dataKey="x"
          series={[{ name: 'value', label: `Bodyweight (${units})`, color: 'var(--mantine-color-text)' }]}
          curveType="linear" strokeWidth={2} withDots dotProps={{ r: 4 }}
          valueFormatter={(value) => formatWeight(value, units) ?? '—'}
          xAxisProps={{ type: 'number', domain: ['dataMin', 'dataMax'], tickFormatter: dateLabel, minTickGap: 36 }}
          yAxisProps={{ domain: ['auto', 'auto'], width: 65 }}
          tooltipProps={{ labelFormatter: (value) => dateLabel(Number(value)) }} />
      </div> : <Caption mt="sm">No measurements in this range. Select a wider range or log bodyweight.</Caption>}
      {trend.count === 1 ? <Caption mt="sm">One measurement in range. Log another to see a change.</Caption> : null}
    </> : <Caption mt="sm">No bodyweight recorded yet. Log your first measurement in Settings.</Caption>}
    <Caption mt="sm">Actual measurements, spaced by calendar date. All includes your full bodyweight history.</Caption>
    <Button component={Link} to="/settings" variant="default" size="xs" mt="sm">Log bodyweight</Button>
  </Panel>
}
