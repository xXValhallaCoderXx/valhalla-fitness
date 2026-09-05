import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import {
  addAdHocExercise,
  removeAdHocExercise,
} from '@sheetless/data/session/ad-hoc-exercises'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import {
  invalidateSessionManagementCaches,
  updateSessionManagementCaches,
} from '../session-management-cache'

export function useAddAdHocExerciseMutation({
  user,
  session,
  onAdded,
}: {
  user: User
  session: WorkoutSession
  onAdded?: (movementId: string) => void
}) {
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()

  return useMutation({
    mutationKey: ['addAdHocExercise', session.sessionId],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: (movementId: string) =>
      addAdHocExercise(buildUserContext(user), {
        sessionId: session.sessionId,
        movementId,
        clientMutationId: request.requestIdFor({ movementId }),
        expectedStateVersion: session.stateVersion,
      }),
    onError: async () => {
      await invalidateSessionManagementCaches({
        queryClient,
        userId: user.id,
        sessionId: session.sessionId,
        includeProgram: false,
      }).catch(() => undefined)
    },
    onSuccess: async (nextSession) => {
      request.clearRequest()
      const previousIds = new Set(session.movements.map((item) => item.id))
      const added = nextSession.movements.find((item) => !previousIds.has(item.id))
      updateSessionManagementCaches(queryClient, user.id, nextSession)
      await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) })
      onAdded?.(added?.id ?? nextSession.movements.at(-1)?.id ?? '')
    },
  })
}

export function useRemoveAdHocExerciseMutation({
  user,
  session,
  movement,
  onRemoved,
}: {
  user: User
  session: WorkoutSession
  movement: MovementSlot
  onRemoved?: (nextSession: WorkoutSession) => void
}) {
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()

  return useMutation({
    mutationKey: ['removeAdHocExercise', session.sessionId, movement.id],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: () =>
      removeAdHocExercise(buildUserContext(user), {
        sessionId: session.sessionId,
        exerciseLogId: movement.id,
        requestId: request.requestIdFor({ exerciseLogId: movement.id }),
        expectedStateVersion: session.stateVersion,
      }),
    onError: async () => {
      await invalidateSessionManagementCaches({
        queryClient,
        userId: user.id,
        sessionId: session.sessionId,
        includeProgram: false,
      }).catch(() => undefined)
    },
    onSuccess: async (nextSession) => {
      request.clearRequest()
      updateSessionManagementCaches(queryClient, user.id, nextSession)
      await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) })
      onRemoved?.(nextSession)
    },
  })
}
