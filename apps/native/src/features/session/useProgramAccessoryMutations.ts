import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import {
  addSessionAccessory,
  removeSessionAccessory,
} from '@sheetless/data/session/accessories'
import type { SwapScope } from '@sheetless/domain/movement/types'
import type { AccessoryProgressionMethod } from '@sheetless/domain/program/types'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import {
  invalidateSessionManagementCaches,
  updateSessionManagementCaches,
} from './session-management-cache'

export type AddAccessoryIntent = {
  movementId: string
  progressionMethod: AccessoryProgressionMethod
  repTarget: string
  scope: SwapScope
  note?: string
}

export function useAddSessionAccessoryMutation({
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
    mutationKey: ['addSessionAccessory', session.sessionId],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: (intent: AddAccessoryIntent) =>
      addSessionAccessory(buildUserContext(user), {
        sessionId: session.sessionId,
        movementId: intent.movementId,
        progressionMethod: intent.progressionMethod,
        repTarget: intent.repTarget,
        scope: intent.scope,
        note: intent.note,
        clientMutationId: request.requestIdFor({
          movementId: intent.movementId,
          progressionMethod: intent.progressionMethod,
          repTarget: intent.repTarget,
          scope: intent.scope,
          note: intent.note?.trim() || null,
        }),
        expectedStateVersion: session.stateVersion,
      }),
    onError: async (_error, intent) => {
      await invalidateSessionManagementCaches({
        queryClient,
        userId: user.id,
        sessionId: session.sessionId,
        includeProgram: intent.scope === 'phase_slot',
      }).catch(() => undefined)
    },
    onSuccess: async (nextSession, intent) => {
      request.clearRequest()
      const previousIds = new Set(session.movements.map((item) => item.id))
      const added = nextSession.movements.find((item) => item.isAdded && !previousIds.has(item.id))
      updateSessionManagementCaches(queryClient, user.id, nextSession)
      if (intent.scope === 'phase_slot') {
        await invalidateSessionManagementCaches({
          queryClient,
          userId: user.id,
          sessionId: session.sessionId,
          includeProgram: true,
        })
      } else {
        await queryClient.invalidateQueries({
          queryKey: accountQueryKeys.today(user.id),
        })
      }
      onAdded?.(added?.id ?? nextSession.movements.at(-1)?.id ?? '')
    },
  })
}

export function useRemoveSessionAccessoryMutation({
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
    mutationKey: ['removeSessionAccessory', session.sessionId, movement.id],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: (scope: SwapScope) =>
      removeSessionAccessory(buildUserContext(user), {
        sessionId: session.sessionId,
        exerciseLogId: movement.id,
        scope,
        requestId: request.requestIdFor({ exerciseLogId: movement.id, scope }),
        expectedStateVersion: session.stateVersion,
      }),
    onError: async (_error, scope) => {
      await invalidateSessionManagementCaches({
        queryClient,
        userId: user.id,
        sessionId: session.sessionId,
        includeProgram: scope === 'phase_slot',
      }).catch(() => undefined)
    },
    onSuccess: async (nextSession, scope) => {
      request.clearRequest()
      updateSessionManagementCaches(queryClient, user.id, nextSession)
      if (scope === 'phase_slot') {
        await invalidateSessionManagementCaches({
          queryClient,
          userId: user.id,
          sessionId: session.sessionId,
          includeProgram: true,
        })
      } else {
        await queryClient.invalidateQueries({
          queryKey: accountQueryKeys.today(user.id),
        })
      }
      onRemoved?.(nextSession)
    },
  })
}
