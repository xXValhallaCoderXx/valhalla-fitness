import { View } from 'react-native'
import type {
  HistoryDashboardWithInsights,
  InsightGating,
  RecentHistoryEntry,
} from '@sheetless/domain/history/types'
import { dataLifecycleLabels } from '@sheetless/domain/history/insight-state'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Badge, Caption, EmptyState, Panel, SectionLabel, StatCard, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { InsightSignals } from './InsightSignals'

export function InsightsOverview({
  data,
  gating,
  recent,
}: {
  data: HistoryDashboardWithInsights
  gating: InsightGating
  recent: RecentHistoryEntry[]
}) {
  if (gating.lifecycle === 'empty') {
    return (
      <EmptyState title="No workouts yet">
        Finish a workout and your recent training signals will appear here.
      </EmptyState>
    )
  }

  const units = data.overview.units ?? data.insights.units ?? 'kg'
  return (
    <>
      <Panel surface="inset" style={{ gap: 4, padding: spacing.md }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
          <Badge tone={gating.lifecycle === 'established' ? 'success' : 'warning'}>
            {dataLifecycleLabels[gating.lifecycle]}
          </Badge>
          <Caption>Recent training · up to 240 sessions</Caption>
        </View>
        {gating.staleWelcomeBack ? (
          <Text size="sm" tone="dimmed">Welcome back. Current trends will settle as you log new work.</Text>
        ) : null}
        {gating.suppressWeekComparison ? (
          <Text size="sm" tone="dimmed">Week comparisons are hidden until the baseline is fair.</Text>
        ) : null}
      </Panel>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <StatCard label="Recent sessions" value={String(data.overview.completedSessions)} />
        <StatCard label="Logged sets" value={String(data.overview.loggedSets)} />
        <StatCard label="Volume" value={`${formatNumber(data.overview.completedVolume)} ${units}`} />
        <StatCard label="Movements" value={String(data.overview.uniqueMovements)} />
      </View>

      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Consistency · recent training</SectionLabel>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatCard
            label="Current streak"
            value={`${data.insights.consistency.currentStreakWeeks} wk`}
            tone="warning"
          />
          <StatCard
            label="Per week"
            value={String(data.insights.consistency.avgSessionsPerWeek ?? '—')}
          />
        </View>
      </Panel>

      <InsightSignals insights={data.insights} gating={gating} />

      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Latest sessions · recent training</SectionLabel>
        {recent.slice(0, 3).map((session) => (
          <View key={session.id} style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" weight={800} numberOfLines={1}>{session.title}</Text>
              <Caption>{session.scheduledDate} · {session.movementCount} movements</Caption>
            </View>
            <Badge tone={session.completedSetCount >= session.plannedSetCount ? 'success' : 'warning'}>
              {session.completedSetCount}/{session.plannedSetCount}
            </Badge>
          </View>
        ))}
      </Panel>
    </>
  )
}
