import { View } from 'react-native'
import { router } from 'expo-router'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { workoutDurationLabel } from '@sheetless/domain/session/today-details'
import { createAccountClock, formatCalendarRelativeDate, formatWeekdayLongDate, formatFullDate } from '@sheetless/domain/shared/dates'
import { calendarDayDifference } from '@sheetless/domain/shared/calendar-date'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { ReturnGuideCard } from '@/features/program/return/ReturnGuideCard'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { WorkoutMuscles } from './WorkoutMuscles'
import { WorkoutEffort } from './WorkoutEffort'

export function LastWorkoutCard({ session, mode = 'guided', today, program, lastWorkoutLogged, hasActiveSession }: {
  session: WorkoutSession | null | undefined
  mode?: ExperienceMode
  today?: string
  program?: ProgramInstance | null
  lastWorkoutLogged?: string | null
  hasActiveSession?: boolean
}) {
  const { theme } = useTokens()
  if (!session) return null
  const advanced = mode === 'full'
  const date = today ?? createAccountClock({ timeZone: session.timeZone }).today
  const days = calendarDayDifference(session.scheduledDate, date)
  const summary = buildWorkoutSummary(session)
  const { completed, planned } = summary.completion
  const completion = advanced ? `${completed}/${planned} sets` : completed === planned && planned > 0
    ? `all ${completed} sets` : `${completed} of ${planned} sets`
  return <Panel style={{ gap: 6, padding: spacing.md, borderRadius: radii.lg }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
      <SectionLabel>Last workout</SectionLabel>
      <Text size="xs" weight={700} tone={days !== null && days >= 14 ? 'warning' : 'dimmed'}>{formatCalendarRelativeDate(session.scheduledDate, date)}</Text>
    </View>
    <View style={{ gap: 2 }}>
      <Heading order={3}>{session.title}</Heading>
      <Caption>{advanced ? formatFullDate(session.scheduledDate) : formatWeekdayLongDate(session.scheduledDate)} · {completion} · {workoutDurationLabel(session)}{advanced ? ` · ${summary.stats.volumeLabel}` : ''}</Caption>
    </View>
    <WorkoutMuscles session={session} advanced={advanced} completed topThree />
    {advanced && summary.sessionBest ? <Text size="xs">Best set <Text size="xs" weight={700}>{summary.sessionBest.movementName} {summary.sessionBest.resultLabel}</Text> · estimated max {summary.sessionBest.e1rmLabel}</Text> : null}
    <WorkoutEffort session={session} advanced={advanced} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTopWidth: 1, borderColor: theme.border }}>
      <Button label="View recap" variant="default" style={{ flex: 1, minWidth: 125 }} onPress={() => router.push({
        pathname: '/session/[sessionId]/summary', params: { sessionId: session.sessionId },
      })} />
      {program ? <ReturnGuideCard program={program} today compact lastWorkoutLogged={lastWorkoutLogged} hasActiveSession={hasActiveSession} /> : null}
    </View>
  </Panel>
}
