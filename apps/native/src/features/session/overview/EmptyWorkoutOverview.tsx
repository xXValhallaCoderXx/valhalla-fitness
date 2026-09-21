import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { View } from 'react-native'
import { Plus } from 'lucide-react-native'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Heading, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { AddExerciseSheet } from '../editing/AddExerciseSheet'
import { allMovementOptionsQueryOptions } from '../queries'
import { useAddAdHocExerciseMutation } from '../editing/useAdHocExerciseMutations'

export function EmptyWorkoutOverview({
  user,
  session,
  disabled,
  onAdded,
}: {
  user: User
  session: WorkoutSession
  disabled: boolean
  onAdded: (movementId: string) => void
}) {
  const { theme } = useTokens()
  const [addOpen, setAddOpen] = useState(false)
  const options = useQuery({
    ...allMovementOptionsQueryOptions(user),
    enabled: addOpen && Boolean(session.isAdHoc),
  })
  const addExercise = useAddAdHocExerciseMutation({
    user,
    session,
    onAdded: (movementId) => {
      setAddOpen(false)
      if (movementId) onAdded(movementId)
    },
  })

  return (
    <>
      <View style={{ gap: spacing.sm }}>
        <Heading order={1}>{session.isAdHoc ? 'Nothing in here yet' : 'No exercises available'}</Heading>
        <Text size="sm" tone="dimmed">{session.isAdHoc
          ? 'A blank workout for training that is not in your plan. Add your first exercise, then log the sets you complete.'
          : 'Return to Today and refresh this planned workout.'}</Text>
        {session.isAdHoc ? (
          <Button
            label="Add your first exercise"
            size="lg"
            fullWidth
            leftSection={<Plus size={24} color={theme.primaryFillText} />}
            disabled={disabled}
            onPress={() => setAddOpen(true)}
            testID="empty-add-exercise"
          />
        ) : null}
      </View>

      <AddExerciseSheet
        open={addOpen && Boolean(session.isAdHoc)}
        options={options.data ?? []}
        freeWeightOnly={session.equipmentMode === 'free_weight'}
        isLoading={options.isPending}
        loadError={options.isError
          ? getApiErrorMessage(options.error, 'Unable to load movement options.')
          : null}
        mutationError={addExercise.isError
          ? getApiErrorMessage(addExercise.error, 'Unable to add this exercise.')
          : null}
        isPending={addExercise.isPending}
        onRetry={() => options.refetch()}
        onClose={() => setAddOpen(false)}
        onSubmit={(draft) => addExercise.mutate(draft.movement.movementId)}
      />
    </>
  )
}
