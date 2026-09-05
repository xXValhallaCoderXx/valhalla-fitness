import { Pressable } from 'react-native'
import type { HistoryDashboardWithInsights, RecentHistoryEntry } from '@sheetless/domain/history/types'
import type { HistoryTab } from '@sheetless/domain/history/history-tabs'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function InsightRecentLinks({ data, recent, onOpenSession, onNavigate }: {
  data: HistoryDashboardWithInsights; recent: RecentHistoryEntry[]
  onOpenSession: (id: string) => void; onNavigate: (tab: HistoryTab) => void
}) {
  return <>
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Latest sessions</SectionLabel>
      {recent.slice(0, 3).map((session) => <Pressable key={session.id} accessibilityRole="button" onPress={() => onOpenSession(session.id)}>
        <Text weight={800}>{session.title}</Text><Caption>{session.scheduledDate} · {session.completedSetCount}/{session.plannedSetCount} sets · Open summary</Caption>
      </Pressable>)}
      <Button label="Browse latest 20 sessions" variant="subtle" onPress={() => onNavigate('sessions')} />
    </Panel>
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Latest records · available workouts</SectionLabel>
      {data.bestSets.slice(0, 3).map((set) => <Pressable key={`${set.movementId}-${set.id}`} accessibilityRole="button" onPress={() => onOpenSession(set.sessionId)}>
        <Text weight={800}>{set.movementName}</Text><Caption>{set.load === null ? 'Bodyweight' : formatWeight(set.load, set.units)} × {set.reps ?? '—'} · {set.performedAt?.slice(0, 10)}</Caption>
      </Pressable>)}
      <Button label="See records" variant="subtle" onPress={() => onNavigate('records')} />
    </Panel>
    {data.substitutions.length ? <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Substitutions</SectionLabel>
      {data.substitutions.slice(0, 3).map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => onOpenSession(item.sessionId)}>
        <Text size="sm">{item.plannedMovementName} → {item.performedMovementName}</Text>
        <Caption>{item.reason.replaceAll('_', ' ')} · {item.performedAt?.slice(0, 10)}</Caption>
      </Pressable>)}
    </Panel> : null}
  </>
}
