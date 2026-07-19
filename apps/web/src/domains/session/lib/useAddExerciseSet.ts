import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { addExerciseSetFn } from '~/domains/session/server/session-functions'
import type { MovementSlot, WorkoutSession } from '~/shared/types'

/** Append a set to an accessory movement (mirrors LiveMovementCard's add-set), updating the session/today caches. */
export function useAddExerciseSet(session: WorkoutSession, movement: MovementSlot) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['addExerciseSet', session.sessionId, movement.id],
    mutationFn: () =>
      addExerciseSetFn({
        data: { sessionId: session.sessionId, exerciseLogId: movement.id, clientMutationId: crypto.randomUUID() },
      }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Set not added',
        message: getApiErrorMessage(error, 'Unable to add another set.'),
      })
    },
    onSuccess: (nextSession) => {
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
    },
  })
}
