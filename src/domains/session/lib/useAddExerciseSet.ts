import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { addExerciseSetFn } from '~/domains/session/server/session-functions'
import type { MovementSlot, WorkoutSession } from '~/domains/session'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { useStableMutationRequest } from '~/domains/session/lib/useStableMutationRequest'

/** Append a set to an accessory movement (mirrors LiveMovementCard's add-set), updating the session/today caches. */
export function useAddExerciseSet(session: WorkoutSession, movement: MovementSlot) {
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()
  const { requestIdFor, clearRequest } = useStableMutationRequest()
  return useMutation({
    mutationKey: ['addExerciseSet', session.sessionId, movement.id],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: () =>
      addExerciseSetFn({
        data: {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          clientMutationId: requestIdFor({ exerciseLogId: movement.id }),
          expectedStateVersion: session.stateVersion,
        },
      }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Set not added',
        message: getApiErrorMessage(error, 'Unable to add another set.'),
      })
    },
    onSuccess: (nextSession) => {
      clearRequest()
      queryClient.setQueryData(
        accountQueryKeys.session(userId, session.sessionId),
        nextSession,
      )
      queryClient.setQueryData(accountQueryKeys.today(userId), (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
    },
  })
}
