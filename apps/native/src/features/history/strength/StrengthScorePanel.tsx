import type { User } from '@supabase/supabase-js'
import type { HistoryInsights, InsightGating } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import { selectScoreDelta, selectScoreTrend } from '@sheetless/domain/history/insight-selectors'
import { nearestBodyweight, strengthScoreKindLabels } from '@sheetless/domain/history/dots'
import { formatTotalMetricValue } from '@sheetless/domain/history/total-metric'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { convertWeight } from '@sheetless/domain/shared/math'
import { Badge, Caption, LineChart, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { BodyweightPrompt } from '../bodyweight/BodyweightPrompt'

export function StrengthScorePanel({ insights, range, gating, user, compact = false, advanced = false }: {
  insights: HistoryInsights; range: InsightRange; gating: InsightGating; user: User; compact?: boolean; advanced?: boolean
}) {
  const score = insights.strengthScore
  const { metric, points } = selectScoreTrend(insights, range)
  const delta = selectScoreDelta(insights, range)
  const weight = nearestBodyweight(insights.bodyweight.entries.filter(entry => entry.recordedOn <= insights.today), insights.today)
  return <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
    <SectionLabel>{gating.staleWelcomeBack ? 'Recorded strength' : 'Your strength'}</SectionLabel>
    <Badge tone={score.kind === 'dots' ? 'success' : 'neutral'}>{strengthScoreKindLabels[score.kind]}</Badge>
    <Text size="xl" weight={900}>{score.value === null ? '—' : formatTotalMetricValue(score.value, metric, insights.units)}</Text>
    {score.asOfDate ? <Caption>Training total recorded through {score.asOfDate}</Caption> : null}
    {weight && score.kind !== 'insufficient' ? <Caption>Using bodyweight {formatWeight(convertWeight(weight.weightKg, 'kg', insights.units ?? 'kg'), insights.units)} recorded {weight.recordedOn}.</Caption> : null}
    <Caption>{score.kind === 'insufficient'
      ? 'A total needs usable loaded squat, bench and deadlift sets of 1–12 reps. There is no workout-count unlock.'
      : score.kind === 'dots' ? 'Best recorded squat, bench and deadlift estimates, adjusted for bodyweight and sex.'
      : score.kind === 'bw_multiple' ? 'Your recorded three-lift total divided by bodyweight.'
      : 'Your best recorded squat, bench and deadlift estimates added together.'}</Caption>
    <LineChart inspectable={!compact} showPoints height={compact ? 120 : 180}
      points={points.map(point => ({ ...point, label: formatCompactDate(point.date), x: Date.parse(point.date) }))}
      formatValue={value => formatTotalMetricValue(value, metric, insights.units)}
      accessibilityLabel="Strength score history" emptyMessage="No strength readings in this range." />
    {delta !== null ? <Caption>{delta > 0 ? '+' : ''}{formatTotalMetricValue(delta, metric, insights.units)} across recorded readings in range.</Caption> : null}
    {points.filter(point => point.value !== null).length === 1 ? <Caption>One reading in range. A later reading is needed for a change.</Caption> : null}
    {!compact || advanced ? <Caption>The headline pairs your recorded best total with the latest bodyweight. Chart readings pair each dated total with bodyweight recorded nearest that date, so bodyweight changes can also move the score.</Caption> : null}
    {!compact ? <BodyweightPrompt insights={insights} user={user} /> : null}
  </Panel>
}
