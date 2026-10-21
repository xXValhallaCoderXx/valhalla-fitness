import { View, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { workoutDurationLabel } from '@sheetless/domain/session/today-details'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { createAccountClock, formatCalendarRelativeDate } from '@sheetless/domain/shared/dates'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { ReturnGuideCard } from '@/features/program/return/ReturnGuideCard'
import { spacing, useTokens } from '@/lib/tokens'
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
  const { width, fontScale } = useWindowDimensions()
  const compact = width < 360 || fontScale > 1.2
  if (!session) return null
  const advanced = mode === 'full'
  const date = today ?? createAccountClock({ timeZone: session.timeZone }).today
  const summary = buildWorkoutSummary(session)
  const { completed, planned } = summary.completion
  const pr = session.prs?.[0]
  const allDone = planned > 0 && completed === planned
  const completion = completed === planned && planned > 0 ? `all ${completed} sets` : `${completed} of ${planned} sets`
  return <Panel style={{ gap: 6, padding: spacing.md }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {!advanced ? <View accessible accessibilityLabel={`${completed} of ${planned} sets completed`}
        style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 4, borderColor: allDone ? theme.primaryFill : theme.border,
          alignItems: 'center', justifyContent: 'center' }}><Text tone="action" weight={800}>{allDone ? '✓' : completed}</Text></View> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <SectionLabel>Last · {formatCalendarRelativeDate(session.scheduledDate, date)}</SectionLabel>
        <Heading order={3}>{session.title}</Heading>
        <Caption>{completion} · {workoutDurationLabel(session)}</Caption>
      </View>
      <Button label="Recap ›" variant="subtle" onPress={() => router.push({ pathname: '/session/[sessionId]/summary', params: { sessionId: session.sessionId } })} />
    </View>
    {advanced ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <LastMetric compact={compact} value={`${completed}/${planned}`} label="sets" />
      <LastMetric compact={compact} value={summary.stats.volumeLabel} label="weight moved" />
      <LastMetric compact={compact} value={summary.sessionBest?.e1rmLabel ?? '—'} label="top e1RM" />
      <LastMetric compact={compact} value={session.sessionRpe == null ? '—' : `${session.sessionRpe}/10`} label="effort" />
    </View> : null}
    {pr ? <Text size="xs" tone="success" weight={700}>★ New best · {pr.movementName} {formatWeight(pr.load, session.units)} × {pr.reps}</Text> : null}
    <WorkoutMuscles session={session} advanced={advanced} completed topThree />
    <WorkoutEffort session={session} advanced={advanced} />
    {program ? <ReturnGuideCard program={program} today compact lastWorkoutLogged={lastWorkoutLogged} hasActiveSession={hasActiveSession} /> : null}
  </Panel>
}

function LastMetric({ value, label, compact }: { value: string; label: string; compact: boolean }) {
  return <View style={{ flex: 1, flexBasis: compact ? '45%' : 0, minWidth: 0, gap: 2 }}><Text weight={900} size="lg">{value}</Text><Caption>{label}</Caption></View>
}
