import { View } from 'react-native'
import { router } from 'expo-router'
import type { TodayWeek } from '@sheetless/domain/session/today-week'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { buildLastSessionCard } from '@sheetless/domain/session/last-session'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { useExperienceMode } from '@/lib/experience-mode'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function TodayWeekContext({ week }: { week: TodayWeek }) {
  const { theme } = useTokens()
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'space-between' }}>
        <SectionLabel>This programme week</SectionLabel>
        <Caption>{week.sessionsDone} of {week.daysPerWeek} sessions done</Caption>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {week.sessions.map((session, index) => {
          const tone = session.status === 'done' ? theme.tones.success : session.status === 'next' ? theme.tones.action : null
          return (
            <View
              key={session.id}
              accessible
              accessibilityLabel={`Session ${index + 1}: ${session.title}, ${session.status === 'done' ? 'completed' : session.status === 'next' ? 'next workout' : 'upcoming'}`}
              style={{ alignItems: 'center', flexBasis: 0, flexGrow: 1, minWidth: 48, borderRadius: radii.md, borderWidth: 1, borderColor: tone?.border ?? theme.border, backgroundColor: tone?.soft ?? theme.surface, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, gap: spacing.xs }}
            >
              <Text size="xs" tone="dimmed">Session</Text>
              <Text weight={800} style={{ color: tone?.text ?? theme.text }}>{index + 1}</Text>
              <Text size="xs" style={{ color: tone?.text ?? theme.textMuted }}>{session.status === 'done' ? 'Done' : session.status === 'next' ? 'Next' : 'Later'}</Text>
            </View>
          )
        })}
      </View>
      <Caption>Work through these sessions at your own pace, with rest days when you need them.</Caption>
    </View>
  )
}

export function TodayLastWorkout({ session, completedToday = false }: { session: WorkoutSession; completedToday?: boolean }) {
  const { mode } = useExperienceMode()
  const card = buildLastSessionCard(session, mode)
  return (
    <Panel style={{ padding: spacing.lg, gap: spacing.sm }}>
      <SectionLabel>{completedToday ? 'Today’s completed workout' : 'Last workout'}</SectionLabel>
      <Heading order={3}>{card.title}</Heading>
      <Caption>{card.meta}</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {card.tiles.slice(0, 2).map((tile) => (
          <View key={tile.label} style={{ flexGrow: 1, gap: spacing.xs }}>
            <Caption>{tile.label}</Caption>
            <Text weight={800}>{tile.value}</Text>
          </View>
        ))}
      </View>
      {card.lines.map((line) => <Text key={line} size="sm" tone="dimmed">{line}</Text>)}
      <Button
        label="View workout recap"
        variant="subtle"
        onPress={() => router.push({ pathname: '/session/[sessionId]/summary', params: { sessionId: card.sessionId } })}
      />
    </Panel>
  )
}
