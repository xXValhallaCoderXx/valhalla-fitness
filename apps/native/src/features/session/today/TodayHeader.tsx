import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { router } from 'expo-router'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { programmeWeekIndex } from '@sheetless/domain/program/program-phase-map'
import { formatWeekdayLongDate } from '@sheetless/domain/shared/dates'
import { Button, Heading, SectionLabel, SheetModal, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { StartBlankWorkoutButton } from './StartBlankWorkoutButton'

export function TodayHeader({ date, program, session, mode, subtitle, ready = false, activeSessionId }: {
  date: string
  program?: ProgramInstance | null
  session?: PlannedSession | null
  mode?: ExperienceMode
  subtitle?: string
  ready?: boolean
  activeSessionId?: string
}) {
  const { theme } = useTokens()
  const [open, setOpen] = useState(false)
  const definition = program?.templateDefinition
  const week = session && definition ? programmeWeekIndex(session.weekIndex, definition) : null
  const context = subtitle ?? [
    program?.title ?? session?.programTitle,
    week !== null && definition ? `week ${week + 1} of ${definition.durationWeeks}` : session?.weekLabel,
    mode === 'full' ? session?.phaseLabel?.toLowerCase() : null,
  ].filter(Boolean).join(' · ')

  return <>
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <SectionLabel>{formatWeekdayLongDate(date)}</SectionLabel>
          <Heading order={1} style={{ fontSize: 28 }}>Today</Heading>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Workout options"
          accessibilityState={{ disabled: !ready, expanded: open }} disabled={!ready} onPress={() => setOpen(true)}
          testID="today-workout-options" style={({ pressed }) => ({
            width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
            borderRadius: radii.md, borderColor: theme.border, backgroundColor: theme.surface,
            opacity: !ready ? 0.4 : pressed ? 0.7 : 1,
          })}>
          <Plus size={22} color={theme.tones.action.text} />
        </Pressable>
      </View>
      {context ? <Text tone="dimmed" size="sm">{context}</Text> : null}
    </View>
    {open ? <SheetModal open title="Workout options" onClose={() => setOpen(false)}>
      {activeSessionId ? <Button label="Resume workout" fullWidth onPress={() => {
        setOpen(false)
        router.push({ pathname: '/session/[sessionId]', params: { sessionId: activeSessionId } })
      }} /> : <StartBlankWorkoutButton onStarted={() => setOpen(false)} />}
      <Button label="Browse programmes" variant="default" fullWidth onPress={() => {
        setOpen(false)
        router.navigate('/(tabs)/templates')
      }} />
    </SheetModal> : null}
  </>
}
