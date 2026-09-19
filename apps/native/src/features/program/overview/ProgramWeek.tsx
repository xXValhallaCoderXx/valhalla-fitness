import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { Check, ChevronRight } from 'lucide-react-native'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { buildTodayWeek } from '@sheetless/domain/session/today-week'
import { Badge, Button, Caption, Heading, Panel, SectionLabel, SegmentedControl, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function ProgramWeek({ overview }: { overview: ProgramOverview }) {
  const { theme } = useTokens()
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const program = overview.activeProgram!
  const definition = program.templateDefinition!
  const next = overview.nextSession
  const active = next?.status === 'in_progress'
  const completed = next?.status === 'completed'
  const sessionId = next?.href.match(/^\/sessions\/([^/]+)(?:\/summary)?$/)?.[1]
  const openNext = () => {
    if (sessionId && (active || completed)) {
      router.push({ pathname: completed ? '/session/[sessionId]/summary' : '/session/[sessionId]', params: { sessionId } })
    } else router.navigate('/(tabs)')
  }
  const week = buildTodayWeek(program, definition, selectedWeek === null ? undefined : Number(selectedWeek))
  if (!week) return null
  return (
    <View style={{ gap: spacing.md }}>
      {next ? <Panel style={{ backgroundColor: theme.tones.action.soft, padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel tone="action">{active ? 'Workout in progress' : completed ? 'Completed workout' : 'Next workout'}</SectionLabel>
        <Heading order={2}>{next.title}</Heading>
        <Caption>{next.movements.length} movements · {next.movementSummary}</Caption>
        <Button label={active ? 'Resume workout' : completed ? 'View recap' : 'Preview workout'} fullWidth onPress={openNext} />
      </Panel> : null}
      <SegmentedControl accessibilityLabel="Programme week" value={String(week.weekIndex)} onChange={setSelectedWeek}
        options={definition.weeks.map((item, index) => ({ value: String(index), label: `Week ${index + 1}`, accessibilityLabel: `Week ${index + 1}: ${item.label}` }))} />
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'space-between' }}>
          <SectionLabel>{week.isCurrent ? 'This week' : `Week ${week.weekNumber}`}</SectionLabel>
          <Caption>{week.sessionsDone} of {week.daysPerWeek} sessions done</Caption>
        </View>
        {week.sessions.map((session, index) => {
          const receipt = overview.sessionStamps.find((stamp) => stamp.weekIndex === session.globalIndex && stamp.id)
          const open = receipt?.id ? () => router.push({ pathname: '/session/[sessionId]/summary', params: { sessionId: receipt.id! } })
            : session.status === 'next' ? () => router.navigate('/(tabs)') : undefined
          return <Pressable key={session.globalIndex} accessibilityRole={open ? 'button' : undefined} disabled={!open}
            onPress={open} style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm,
              borderTopColor: theme.border, borderTopWidth: index ? 1 : 0, opacity: pressed ? 0.7 : 1,
            })}>
            <Text tone={session.status === 'next' ? 'action' : 'dimmed'} weight="700">{index + 1}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text weight="700">{session.title}</Text>
              <Caption>{session.movementCount} movements · {session.setCount} sets{session.estimatedMinutes ? ` · about ${session.estimatedMinutes} min` : ''}</Caption>
              <Badge tone={session.status === 'done' ? 'success' : session.status === 'next' ? 'action' : 'neutral'}>
                {session.status === 'done' ? 'Completed' : session.status === 'next' ? 'Next' : 'Upcoming'}
              </Badge>
            </View>
            {session.status === 'done' ? <Check size={18} color={theme.tones.success.text} /> : open ? <ChevronRight size={18} color={theme.tones.action.text} /> : null}
          </Pressable>
        })}
        <Caption>Train in this order, on the days that work for you.</Caption>
      </Panel>
    </View>
  )
}
