import { View } from 'react-native'
import type { HistoryInsights, InsightGating } from '@sheetless/domain/history/types'
import { calibrationSignalLabels } from '@sheetless/domain/history/calibration'
import { dataLifecycleLabels } from '@sheetless/domain/history/insight-state'
import { Badge, Caption, Panel, SectionLabel, StatCard, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function TrainingHealth({ insights, gating }: { insights: HistoryInsights; gating: InsightGating }) {
  const { consistency, calibration } = insights
  return <>
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Consistency · available workouts</SectionLabel>
      <Badge tone="neutral">{dataLifecycleLabels[gating.lifecycle]}</Badge>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <StatCard label="Sessions / week" value={String(consistency.avgSessionsPerWeek ?? '—')} />
        <StatCard label="Current streak" value={`${consistency.currentStreakWeeks} wk`} />
        <StatCard label="Longest streak" value={`${consistency.longestStreakWeeks} wk`} />
      </View>
      {consistency.totalWeeks >= 2 ? <Caption>Weeks trained: {consistency.weeksTrained} of {consistency.totalWeeks} ({consistency.percentWeeksTrained ?? 0}%)</Caption>
        : <Caption>Your consistency picture builds over your first few weeks.</Caption>}
    </Panel>
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Effort calibration · last 6 weeks</SectionLabel>
      <Badge tone={calibration.signal === 'leaning_hard' ? 'warning' : 'neutral'}>{calibrationSignalLabels[calibration.signal]}</Badge>
      <Text size="sm">{calibration.meanGap === null ? 'Log prescribed and actual RIR to compare effort with the plan.'
        : `Average actual minus prescribed RIR: ${calibration.meanGap > 0 ? '+' : ''}${calibration.meanGap}. Positive means more reps left than prescribed.`}</Text>
      <Caption>{calibration.pairedSetCount} paired sets. This six-week window stays fixed when the chart range changes.</Caption>
      {calibration.rirFatigue === 'fatigue_rising' ? <Text tone="warning" size="sm">Effort has climbed for 3+ weeks. Consider an easier week.</Text> : null}
    </Panel>
  </>
}
