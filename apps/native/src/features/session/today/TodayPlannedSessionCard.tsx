import { View } from 'react-native'
import type { PlannedSession } from '@sheetless/domain/session/types'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { buildTodaySessionMeta } from '@sheetless/domain/session/today-numbers'
import { sessionIndexInWeek } from '@sheetless/domain/session/today-week'
import type { Unit } from '@sheetless/domain/shared/types'
import { Badge, Button, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { WorkoutPreview } from './WorkoutPreview'
import { WorkoutMuscles } from './WorkoutMuscles'

export function TodayPlannedSessionCard({ session, completedToday, pendingDecisionCount,
  isStarting, startDisabled, startError, onStart, mode = 'guided', program, onReview }: {
  session: PlannedSession
  units: Unit
  completedToday: boolean
  pendingDecisionCount: number
  isStarting: boolean
  startDisabled?: boolean
  startError: string | null
  onStart: () => void
  onReview: () => void
  mode?: ExperienceMode
  program?: ProgramInstance | null
}) {
  const days = program?.templateDefinition?.daysPerWeek
  const position = days ? sessionIndexInWeek(session.weekIndex, days) + 1 : null
  const hardness = mode === 'full' ? [session.hardness, session.phaseLabel].filter(Boolean).join(' · ')
    : session.hardness ? { Hard: 'Heavy day', Medium: 'Steady day', Light: 'Lighter day', Deload: 'Deload day' }[session.hardness] : null
  return <Panel style={{ gap: 6, padding: spacing.md }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
      {mode === 'full' ? <Badge tone="action">{position && days ? `Next · session ${position} of ${days}` : 'Next up'}</Badge> : <SectionLabel>Next up</SectionLabel>}
      {hardness ? <Badge tone="warning">{hardness}</Badge> : null}
    </View>
    <View style={{ gap: 2 }}>
      <Heading order={2} style={{ fontSize: 23 }}>{session.title}</Heading>
      <Text size="xs" tone="dimmed">{buildTodaySessionMeta(session, 'full').replace('~', 'about ')}</Text>
    </View>
    <WorkoutMuscles session={session} advanced={mode === 'full'} topThree />
    <WorkoutPreview session={session} program={program} mode={mode} />
    {pendingDecisionCount > 0 ? <>
      <Text size="sm">Review {pendingDecisionCount} progression choice{pendingDecisionCount === 1 ? '' : 's'} before starting.</Text>
      <Button label="Review progression" fullWidth onPress={onReview} testID="today-review" />
    </> : <Button label={completedToday ? 'Start next workout' : 'Start workout'} fullWidth
      loading={isStarting} disabled={startDisabled} onPress={onStart} testID="today-start" />}
    {startError ? <Text tone="danger" size="sm">{startError}</Text> : null}
  </Panel>
}
