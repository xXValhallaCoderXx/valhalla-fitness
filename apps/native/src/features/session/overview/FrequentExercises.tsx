import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { View } from 'react-native'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Caption, Heading, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { frequentExercisesQueryOptions } from '../queries'

export function FrequentExercises({ user, freeWeightOnly, disabled, error, onAdd }: {
  user: User
  freeWeightOnly: boolean
  disabled: boolean
  error: string | null
  onAdd: (movementId: string) => void
}) {
  const frequent = useQuery(frequentExercisesQueryOptions(user, freeWeightOnly))
  if (frequent.isPending) return null
  if (!frequent.isError && !frequent.data?.length && !error) return null
  return <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.sm }}>
    <View style={{ gap: 2 }}>
      <Heading order={3}>Your frequent exercises</Heading>
      <Caption>Past 90 days</Caption>
    </View>
    {frequent.isError ? <>
      <Text size="sm" tone="danger">{getApiErrorMessage(frequent.error, 'Unable to load frequent exercises.')}</Text>
      <Button label="Retry frequent exercises" variant="subtle" loading={frequent.isFetching}
        onPress={() => void frequent.refetch()} />
    </> : frequent.data?.map(exercise => <Button key={exercise.movementId}
      label={`+ ${exercise.movementName}`} variant="default" fullWidth disabled={disabled}
      accessibilityLabel={`Add ${exercise.movementName}, used in ${exercise.completedWorkoutCount} ${exercise.completedWorkoutCount === 1 ? 'workout' : 'workouts'} in the past 90 days`}
      onPress={() => onAdd(exercise.movementId)} />)}
    {error ? <Text size="sm" tone="danger">{error}</Text> : null}
  </Panel>
}
