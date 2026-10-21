import { View } from 'react-native'
import { filterToRange, type InsightRange } from '@sheetless/domain/history/insight-ranges'
import type { HistoryInsights } from '@sheetless/domain/history/types'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function LiftComparisons({ insights, range, advanced }: { insights: HistoryInsights; range: InsightRange; advanced: boolean }) {
  const rows = insights.liftSeries.map(series => ({ ...series, points: filterToRange(series.points, range, {
    firstDataDate: insights.firstSessionDate, now: insights.today, getDate: point => point.date,
  }).filter(point => !point.outlier) })).filter(series => series.points.length)
  if (!rows.length) return null
  return <Panel style={{ padding: spacing.md, gap: spacing.md }}>
    <SectionLabel>{advanced ? 'Estimated max · first to latest in range' : 'Your lifts, then and later'}</SectionLabel>
    {rows.map(series => {
      const first = series.points[0]
      const last = series.points.at(-1)!
      const change = last.e1rm - first.e1rm
      return <View key={series.movementId} style={{ gap: spacing.xs }}>
        <Text weight={800}>{series.movementName}</Text>
        <Text>{formatWeight(last.e1rm, insights.units)}{series.points.length > 1 ? ` · ${change > 0 ? '+' : ''}${formatWeight(change, insights.units)}` : ' · Baseline'}</Text>
        <Caption>{series.points.length > 1 ? `${first.date} → ${last.date}` : first.date}</Caption>
      </View>
    })}
    <Caption>Estimates from recorded loaded sets of 1–12 reps. Dates show when each result was logged.</Caption>
  </Panel>
}
