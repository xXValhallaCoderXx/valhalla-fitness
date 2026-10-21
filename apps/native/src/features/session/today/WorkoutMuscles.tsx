import { View } from 'react-native'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { workoutMuscleSets, workoutMusclesByExerciseCount } from '@sheetless/domain/session/today-details'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Text } from '@/components'
import { radii, useTokens } from '@/lib/tokens'

export function WorkoutMuscles({ session, advanced = false, completed = false, topThree = false }: {
  session: PlannedSession
  advanced?: boolean
  completed?: boolean
  topThree?: boolean
}) {
  const { theme } = useTokens()
  const muscles = workoutMuscleSets(session, completed)
  const topIds = topThree ? workoutMusclesByExerciseCount(session, completed).slice(0, 3) : null
  const visible = topIds ? topIds.flatMap(id => muscles.filter(muscle => muscle.id === id)) : muscles
  if (!muscles.length) return null
  return <View accessible accessibilityRole="text"
    accessibilityLabel={`${completed ? 'Completed' : 'Planned'} muscle groups. ${visible.map(muscle => `${muscle.label}${advanced ? `, ${formatNumber(muscle.sets)} set equivalents` : ''}`).join('. ')}`}
    style={{ minHeight: 44, justifyContent: 'center' }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
      {visible.map(muscle => <View key={muscle.id} style={{ borderRadius: radii.sm, backgroundColor: theme.backgroundElevated, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text size="xs" weight={600}>{muscle.label}{advanced ? <Text size="xs" weight={800}> {formatNumber(muscle.sets)}</Text> : null}</Text>
      </View>)}
    </View>
  </View>
}
