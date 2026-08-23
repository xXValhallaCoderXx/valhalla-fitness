import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { substituteMovement } from '@sheetless/data/session/movements'
import type { MovementSwapOption, SwapScope } from '@sheetless/domain/movement/types'
import type {
  MovementSlot,
  SubstitutionReason,
  WorkoutSession,
} from '@sheetless/domain/session/types/session'
import { patchMovementInSession } from '@sheetless/domain/session/session-cache'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import {
  invalidateSessionManagementCaches,
  updateSessionManagementCaches,
} from './session-management-cache'

export type MovementSwapIntent = {
  option: MovementSwapOption
  reason: SubstitutionReason
  note?: string
  scope: SwapScope
}

export function useMovementSwapMutation({
  user,
  session,
  movement,
  onSwapped,
}: {
  user: User
  session: WorkoutSession
  movement: MovementSlot
  onSwapped?: () => void
}) {
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()
  const sessionKey = accountQueryKeys.session(user.id, session.sessionId)

  return useMutation({
    mutationKey: ['substituteMovement', session.sessionId, movement.id],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: (intent: MovementSwapIntent) =>
      substituteMovement(buildUserContext(user), {
        sessionId: session.sessionId,
        exerciseLogId: movement.id,
        performedMovementId: intent.option.movementId,
        reason: intent.reason,
        note: intent.note,
        scope: intent.scope,
        requestId: request.requestIdFor({
          exerciseLogId: movement.id,
          performedMovementId: intent.option.movementId,
          reason: intent.reason,
          note: intent.note?.trim() || null,
          scope: intent.scope,
        }),
        expectedStateVersion: session.stateVersion,
      }),
    onMutate: async (intent) => {
      await queryClient.cancelQueries({ queryKey: sessionKey })
      const previous = queryClient.getQueryData<WorkoutSession>(sessionKey)
      if (previous) {
        queryClient.setQueryData(
          sessionKey,
          patchMovementInSession(previous, {
            exerciseLogId: movement.id,
            performedMovementId: intent.option.movementId,
            performedMovementName: intent.option.movementName,
          }),
        )
      }
      return { previous }
    },
    onError: async (_error, intent, context) => {
      if (context?.previous) queryClient.setQueryData(sessionKey, context.previous)
      await invalidateSessionManagementCaches({
        queryClient,
        userId: user.id,
        sessionId: session.sessionId,
        includeProgram: intent.scope === 'phase_slot',
      }).catch(() => undefined)
    },
    onSuccess: async (nextSession, intent) => {
      request.clearRequest()
      updateSessionManagementCaches(queryClient, user.id, nextSession)
      await queryClient.invalidateQueries({
        queryKey: accountQueryKeys.movementSwapOptions(user.id, session.sessionId, movement.id),
      })
      if (intent.scope === 'phase_slot') {
        await invalidateSessionManagementCaches({
          queryClient,
          userId: user.id,
          sessionId: session.sessionId,
          includeProgram: true,
        })
      } else {
        await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) })
      }
      onSwapped?.()
    },
  })
}
