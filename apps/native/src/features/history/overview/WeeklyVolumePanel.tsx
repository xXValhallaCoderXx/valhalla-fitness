import type { HistoryInsights, InsightGating } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import { selectInsightWeeks } from '@sheetless/domain/history/insight-selectors'
import { resolveVolumeTrendSignal, volumeTrendLabels } from '@sheetless/domain/history/insight-state'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { formatDateKey, startOfWeek } from '@sheetless/domain/history/history'
import { AreaChart, Badge, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function WeeklyVolumePanel({ insights, gating, range }: { insights: HistoryInsights; gating: InsightGating; range: InsightRange }) {
  const weeks = selectInsightWeeks(insights.weeklyVolume, insights, range)
  const currentWeek = formatDateKey(startOfWeek(new Date(`${insights.today}T00:00:00Z`)))
  const signal = resolveVolumeTrendSignal(weeks.filter(week => week.weekStart < currentWeek), gating)
  return <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
    <SectionLabel>Weekly volume</SectionLabel>
    <Badge tone={signal === 'rising' ? 'success' : signal === 'declining' ? 'warning' : 'neutral'}>{volumeTrendLabels[signal]}</Badge>
    <Text weight={800}>{formatWeight(weeks.reduce((sum, week) => sum + week.volume, 0), insights.units)} in visible weeks</Text>
    <AreaChart inspectable showPoints points={weeks.map((week) => ({ label: week.weekLabel, date: week.weekStart, value: week.volume }))}
      formatValue={(value) => formatWeight(value, insights.units) ?? '—'} accessibilityLabel="Weekly training volume"
      emptyMessage="Log workouts to build weekly volume." />
    <Caption>The current week is incomplete. Trend comparisons use completed calendar weeks.</Caption>
    {gating.suppressWeekComparison ? <Caption>Week comparisons are hidden while establishing a baseline or deloading.</Caption> : null}
    {weeks.some((week) => week.isDeload) ? <Caption>Includes deload weeks: lighter on purpose.</Caption> : null}
  </Panel>
}
