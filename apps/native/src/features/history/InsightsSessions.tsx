import { Pressable, ScrollView, View } from 'react-native'
import {
  availableIntensities,
  filterSessions,
  hasAdHocSessions,
  intensityColor,
  type SessionFilter,
} from '@sheetless/domain/history/insights'
import type { RecentHistoryEntry } from '@sheetless/domain/history/types'
import { createAccountClock, describeWorkoutDate } from '@sheetless/domain/shared/dates'
import { Badge, Button, Caption, EmptyState, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function InsightsSessions({
  sessions,
  filter,
  onFilterChange,
  onOpen,
}: {
  sessions: RecentHistoryEntry[]
  filter: SessionFilter
  onFilterChange: (filter: SessionFilter) => void
  onOpen: (sessionId: string) => void
}) {
  const filters: SessionFilter[] = [
    'all',
    ...availableIntensities(sessions),
    ...(hasAdHocSessions(sessions) ? (['adhoc'] as const) : []),
  ]
  const visible = filterSessions(sessions, filter)
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Sessions · recent training</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {filters.map((value) => (
          <Button
            key={value}
            label={value === 'all' ? 'All' : value === 'adhoc' ? 'Ad-hoc' : value}
            variant={filter === value ? 'filled' : 'default'}
            onPress={() => onFilterChange(value)}
          />
        ))}
      </ScrollView>
      {visible.length === 0 ? (
        <EmptyState title="No matching sessions">Try another intensity.</EmptyState>
      ) : visible.map((session) => {
        const clock = createAccountClock({ timeZone: session.timeZone })
        const date = describeWorkoutDate({
          scheduledDate: session.scheduledDate,
          completedAt: session.completedAt,
          timeZone: session.timeZone,
          today: clock.today,
        })
        return (
          <Pressable key={session.id} onPress={() => onOpen(session.id)}>
            {({ pressed }) => (
              <Panel style={{ gap: 5, opacity: pressed ? 0.7 : 1, padding: spacing.sm }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight={800} numberOfLines={1}>{session.title}</Text>
                    <Caption>{date.compactDate} · {date.relativeDate} · {session.movementCount} movements</Caption>
                  </View>
                  <Badge tone={intensityColor(session.hardness)}>{session.hardness ?? 'Ad-hoc'}</Badge>
                </View>
                <Caption>{session.completedSetCount}/{session.plannedSetCount} sets · Tap for summary</Caption>
              </Panel>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
