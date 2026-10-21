import { View } from 'react-native'
import type { HistoryInsights, InsightGating, LiftE1rmSeries } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import { selectLiftTrend } from '@sheetless/domain/history/insight-selectors'
import { e1rmTrendLabels, estimatedMaxExplanation } from '@sheetless/domain/history/strength'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Badge, Caption, LineChart, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function LiftTrendPanel({ series, insights, gating, range, advanced, onOpenSession }: {
  series: LiftE1rmSeries; insights: HistoryInsights; gating: InsightGating; range: InsightRange; advanced: boolean; onOpenSession: (id: string) => void
}) {
  const view = selectLiftTrend(series, insights, gating, range)
  const format = (value: number) => formatWeight(value, insights.units) ?? '—'
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <Text weight={900}>{series.movementName}</Text>
      <Badge tone={view.trend === 'rising' ? 'success' : view.trend === 'declining' ? 'warning' : 'neutral'}>{e1rmTrendLabels[view.trend]}</Badge>
      <SectionLabel>{gating.staleWelcomeBack ? 'Best recorded e1RM' : advanced ? 'Latest recorded e1RM' : 'Latest recorded estimate'}</SectionLabel>
      <Text size="xl" weight={900}>{view.current ? format(view.current.e1rm) : '—'}</Text>
      {view.current ? <Caption>As of {view.current.date}</Caption> : null}
      {view.best ? <Caption>Best in available workouts: {format(view.best.e1rm)} · {view.best.date}</Caption> : null}
      {advanced && view.velocity !== null ? <Text size="sm">Improvement rate: {view.velocity > 0 ? '+' : ''}{format(view.velocity)}/month</Text> : null}
      {advanced && view.stall?.lastPrDate ? <Caption>Best estimate recorded {view.stall.weeksSincePr === 0 ? 'this week' : `${view.stall.weeksSincePr} weeks ago`} · {view.stall.lastPrDate}</Caption> : null}
      <LineChart inspectable showPoints onOpenPoint={index => onOpenSession(view.points[index].sessionId)}
        points={view.points.map((point) => ({ date: point.date, x: Date.parse(point.date), label: formatCompactDate(point.date), value: point.outlier ? null : point.e1rm }))}
        markers={view.points.map((point) => ({ date: point.date, x: Date.parse(point.date), label: formatCompactDate(point.date), value: point.outlier ? point.e1rm : null }))}
        formatValue={format} accessibilityLabel={`${series.movementName} estimated max`}
        emptyMessage="No loaded readings in this range. Log more sessions to build a trend." />
      <Caption>{estimatedMaxExplanation}</Caption>
      {view.points.some((point) => point.outlier) ? <Caption>Hollow points are unusual values. They remain inspectable and in the original logs, and are excluded from estimates and trend readiness.</Caption> : null}
      {advanced ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {([{ label: 'At least 1 rep', best: series.repMaxBests.oneRm }, { label: 'At least 3 reps', best: series.repMaxBests.threeRm },
          { label: 'At least 5 reps', best: series.repMaxBests.fiveRm }]).map(({ label, best }) => (
          <Panel key={label} surface="inset" style={{ flexGrow: 1, padding: spacing.sm }}>
            <SectionLabel>{label} best</SectionLabel><Text weight={800}>{best ? format(best.load) : '—'}</Text>
            {best ? <Caption>{best.date}</Caption> : null}
          </Panel>
        ))}
      </View> : null}
    </Panel>
  )
}
