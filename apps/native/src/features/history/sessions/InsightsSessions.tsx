import { useState } from 'react'
import { Pressable, View } from 'react-native'
import {
  availableIntensities,
  filterSessions,
  hasAdHocSessions,
  intensityColor,
  type SessionFilter,
} from '@sheetless/domain/history/insights'
import type { RecentHistoryEntry } from '@sheetless/domain/history/types'
import { createAccountClock, describeWorkoutDate } from '@sheetless/domain/shared/dates'
import { Badge, Button, Caption, EmptyState, Panel, SectionLabel, SegmentedControl, Text, TextInput } from '@/components'
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
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(20)
  const filters: SessionFilter[] = [
    'all',
    ...availableIntensities(sessions),
    ...(hasAdHocSessions(sessions) ? (['adhoc'] as const) : []),
  ]
  const visible = filterSessions(sessions, filter, search)
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Workout history</SectionLabel>
      <Caption>{sessions.length} loaded workouts · search and filters cover all loaded results.</Caption>
      <TextInput value={search} onChangeText={(next) => { setSearch(next); setVisibleCount(20) }} placeholder="Search loaded workouts" accessibilityLabel="Search sessions" />
      <SegmentedControl
        options={filters.map((value) => ({
          value,
          label: value === 'all' ? 'All' : value === 'adhoc' ? 'Ad-hoc' : value,
        }))}
        value={filter}
        onChange={(next) => { onFilterChange(next); setVisibleCount(20) }}
        accessibilityLabel="Session intensity filter"
      />
      {visible.length === 0 ? (
        <EmptyState title="No matching sessions">Try another intensity.</EmptyState>
      ) : visible.slice(0, visibleCount).map((session) => {
        const clock = createAccountClock({ timeZone: session.timeZone })
        const date = describeWorkoutDate({
          scheduledDate: session.scheduledDate,
          completedAt: session.completedAt,
          timeZone: session.timeZone,
          today: clock.today,
        })
        return (
          <Pressable key={session.id} accessibilityRole="button" onPress={() => onOpen(session.id)}>
            {({ pressed }) => (
              <Panel style={{ gap: 5, opacity: pressed ? 0.7 : 1, padding: spacing.sm }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight={800}>{session.title}</Text>
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
      {visible.length > visibleCount ? (
        <Button label={`Show older workouts (${visible.length - visibleCount} more)`} variant="default"
          fullWidth onPress={() => setVisibleCount((count) => count + 20)} />
      ) : null}
      <Caption>Showing {Math.min(visibleCount, visible.length)} of {visible.length} matching workouts. Browsing covers up to the latest 60; analytics use up to 240.</Caption>
    </View>
  )
}
