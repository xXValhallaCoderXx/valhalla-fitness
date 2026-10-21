import { View } from 'react-native'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

/** Render the authoritative compiler preview returned by the fresh review. */
export function SetupFirstWorkout({ workout }: { workout: PlannedSession }) {
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>First workout · {workout.title}</SectionLabel>
    <Caption>{workout.estimatedMinutes} min · {workout.weekLabel}</Caption>
    {workout.movements.map((movement) => <View key={movement.id} style={{ gap: spacing.xs }}>
      <Text weight={700}>{movement.movementName}{movement.isAdded ? ' · Added' : ''}</Text>
      {movement.sets.map((set) => {
        const reps = set.targetReps ?? (set.targetRepMin != null && set.targetRepMax != null
          ? `${set.targetRepMin}–${set.targetRepMax}` : set.targetRepMin != null ? `${set.targetRepMin} or more`
            : set.targetRepMax != null ? `Up to ${set.targetRepMax}` : 'Reps not specified')
        const load = set.targetLoad == null ? 'Choose your load' : set.targetLoad === 0 ? 'Bodyweight' : `${set.targetLoad} ${workout.units}`
        const effort = set.targetRir != null ? `${set.targetRir} reps in reserve` : set.targetRpe != null ? `RPE ${set.targetRpe}` : ''
        const kind = set.isBackoff ? 'Back-off' : set.isTopSet ? 'Top set' : ''
        return <Caption key={set.id}>{[`Set ${set.setIndex}`, `${reps}${set.isAmrap ? '+' : ''}`, load, effort, kind].filter(Boolean).join(' · ')}</Caption>
      })}
    </View>)}
  </Panel>
}
