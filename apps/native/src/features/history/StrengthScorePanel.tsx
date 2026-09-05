import type { User } from '@supabase/supabase-js'
import type { HistoryInsights, InsightGating } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import { selectScoreTrend } from '@sheetless/domain/history/insight-selectors'
import { strengthScoreKindLabels } from '@sheetless/domain/history/dots'
import { formatTotalMetricValue } from '@sheetless/domain/history/total-metric'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { Badge, Caption, LineChart, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { BodyweightPrompt } from './BodyweightPrompt'

export function StrengthScorePanel({ insights, range, gating, user }: {
  insights: HistoryInsights; range: InsightRange; gating: InsightGating; user: User
}) {
  const score = insights.strengthScore
  const { metric, points } = selectScoreTrend(insights, range)
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>{gating.staleWelcomeBack ? 'Recorded strength score' : 'Strength score'}</SectionLabel>
      <Badge tone={score.kind === 'dots' ? 'success' : 'neutral'}>{strengthScoreKindLabels[score.kind]}</Badge>
      <Text size="xl" weight={900}>{score.value === null ? '—' : formatTotalMetricValue(score.value, metric, insights.units)}</Text>
      {score.asOfDate ? <Caption>Training total as of {score.asOfDate}</Caption> : null}
      <Caption>{score.kind === 'insufficient'
        ? 'Log loaded squat, bench, and deadlift sets to build your powerlifting total.'
        : score.kind === 'dots' ? 'Powerlifting total adjusted for bodyweight.'
        : score.kind === 'bw_multiple' ? 'Add sex to convert your bodyweight multiple into DOTS.'
        : 'Add bodyweight to compare strength relative to size.'}</Caption>
      <LineChart inspectable showPoints points={points.map((point) => ({ ...point, label: formatCompactDate(point.date) }))}
        formatValue={(value) => formatTotalMetricValue(value, metric, insights.units)}
        accessibilityLabel="Strength score history" emptyMessage="No strength score readings in this range." />
      {insights.lifetime.sessions >= 2 ? <BodyweightPrompt key={user.id} insights={insights} user={user} /> : null}
    </Panel>
  )
}
