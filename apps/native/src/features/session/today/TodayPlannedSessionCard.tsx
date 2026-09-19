import { View } from 'react-native'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { PlannedSession } from '@sheetless/domain/session/types'
import type { TodayWeek } from '@sheetless/domain/session/today-week'
import { buildTodaySessionMeta } from '@sheetless/domain/session/today-numbers'
import { Badge, Button, Caption, Heading, Panel, Text } from '@/components'
import { useExperienceMode } from '@/lib/experience-mode'
import { spacing } from '@/lib/tokens'
import { TodayWorkoutPreview } from './TodayWorkoutPreview'

export function TodayPlannedSessionCard({
  session, program, week, reasonByStateKey, completedToday, pendingDecisionCount,
  isStarting, startDisabled, startError, onStart,
}: {
  session: PlannedSession
  program?: ProgramInstance | null
  week?: TodayWeek | null
  reasonByStateKey?: Record<string, string>
  completedToday: boolean
  pendingDecisionCount: number
  isStarting: boolean
  startDisabled?: boolean
  startError: string | null
  onStart: () => void
}) {
  const { mode } = useExperienceMode()
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.lg }}>
      <View style={{ alignItems: 'flex-start', gap: spacing.xs }}>
        <Badge tone="action">
          {week ? `Session ${week.sessionNumber} of ${week.daysPerWeek}` : 'Next workout'}
        </Badge>
        <Heading order={2}>{session.title}</Heading>
        <Text tone="dimmed" size="sm">{buildTodaySessionMeta(session, mode)}</Text>
      </View>
      <TodayWorkoutPreview key={session.id} session={session} program={program} reasonByStateKey={reasonByStateKey} />
      <Button
        label={completedToday ? 'Start next workout' : 'Start workout'}
        fullWidth
        loading={isStarting}
        disabled={pendingDecisionCount > 0 || startDisabled}
        onPress={onStart}
        testID="today-start"
        style={{ minHeight: 52 }}
      />
      {pendingDecisionCount > 0 ? <Caption>Review your load updates before starting this planned workout.</Caption> : null}
      {startError ? <Text tone="danger" size="sm">{startError}{pendingDecisionCount ? '' : ' Tap Start again to retry.'}</Text> : null}
      <Caption>Workout saves need a connection.</Caption>
    </Panel>
  )
}
