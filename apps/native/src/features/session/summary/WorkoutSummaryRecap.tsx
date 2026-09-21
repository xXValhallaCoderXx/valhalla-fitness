import { View } from 'react-native'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { workoutEffort } from '@sheetless/domain/session/today-details'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { WorkoutEffort } from '../today/WorkoutEffort'
import { RecapMovements } from './RecapMovements'
import type { NativeWorkoutRecap } from './native-workout-recap'

export function WorkoutSummaryRecap({ session, recap, advanced = false }: {
  session: WorkoutSession; recap: NativeWorkoutRecap; advanced?: boolean
}) {
  const effort = workoutEffort(session)
  const reflection = [
    ['Went well', session.reflectionWin?.trim()],
    ['Work on', session.reflectionImprove?.trim()],
    ['Notes', session.notes?.trim()],
  ].filter(([, value]) => value)
  return <>
    <RecapMovements recap={recap} advanced={advanced} />
    <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs }}>
      <SectionLabel>How hard it was</SectionLabel>
      <WorkoutEffort session={session} advanced={advanced} showInfo />
      {advanced ? <Caption>{effort.averageRir === null ? 'Reps left were not recorded.'
        : `You recorded ${formatNumber(effort.averageRir)} reps left on average across ${effort.recordedSets} completed sets.`} {effort.targetRir === null ? '' : `Planned average: ${formatNumber(effort.targetRir)}.`} The overall rating is your reflection.</Caption> : null}
    </Panel>
    {reflection.length ? <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>What you wrote</SectionLabel>
      {reflection.map(([label, value]) => <View key={label} style={{ gap: 2 }}>
        <Caption>{label}</Caption><Text size="sm">{value}</Text>
      </View>)}
    </Panel> : null}
    {recap.unloggedSets > 0 ? <Caption>{recap.unloggedSets} unlogged {recap.unloggedSets === 1 ? 'set was' : 'sets were'} left out of completed work and lifted volume.</Caption> : null}
  </>
}
