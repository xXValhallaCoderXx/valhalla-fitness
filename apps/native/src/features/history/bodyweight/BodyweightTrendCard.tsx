import { useRouter } from 'expo-router'
import { buildBodyweightTrend } from '@sheetless/domain/history/bodyweight-trend'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import type { HistoryInsights } from '@sheetless/domain/history/types'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, LineChart, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function BodyweightTrendCard({ insights, range }: { insights: HistoryInsights; range: InsightRange }) {
  const router = useRouter()
  const units = insights.bodyweight.units
  const trend = buildBodyweightTrend({ entries: insights.bodyweight.entries, range, today: insights.today, units })
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Bodyweight</SectionLabel>
      {trend.latest ? (
        <>
          <Text size="xl" weight={900}>{formatWeight(trend.latest.value, units)}</Text>
          <Caption>Latest recorded · {trend.latest.date}{trend.latestOutsideRange ? ' · outside selected range' : ''}</Caption>
          <Caption>{trend.count} {trend.count === 1 ? 'measurement' : 'measurements'} in range · {trend.totalCount} recorded</Caption>
          {trend.change !== null ? <Text>Change in range: {trend.change > 0 ? '+' : ''}{formatWeight(trend.change, units)}</Text> : null}
          <LineChart tone="default" inspectable showPoints
            points={trend.points.map((point) => ({ ...point, label: formatCompactDate(point.date) }))}
            formatValue={(value) => formatWeight(value, units) ?? '—'} accessibilityLabel="Bodyweight measurements"
            emptyMessage="No measurements in this range. Select a wider range or log bodyweight." />
          {trend.count === 1 ? <Caption>One measurement in range. Log another to see a change.</Caption> : null}
        </>
      ) : <Caption>No bodyweight recorded yet. Log your first measurement in Settings.</Caption>}
      <Caption>Actual measurements, spaced by calendar date. All includes your full bodyweight history.</Caption>
      <Button label="Log bodyweight" variant="default" onPress={() => router.push('/settings')} />
    </Panel>
  )
}
