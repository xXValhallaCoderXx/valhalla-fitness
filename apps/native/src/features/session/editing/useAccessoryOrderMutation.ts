import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { reorderSessionAccessories } from '@sheetless/data/session/accessories'
import { getSession } from '@sheetless/data/session/reads'
import { reorderAddedAccessories } from '@sheetless/domain/session/accessories'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import {
  invalidateSessionManagementCaches,
  updateSessionManagementCaches,
} from '../session-management-cache'

function movementSlotId(movement: MovementSlot) {
  return movement.slotId ?? movement.id
}

function addedSlotIds(session: WorkoutSession) {
  return session.movements
    .filter((movement) => movement.isAdded)
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map(movementSlotId)
}

function sameOrder(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((slotId, index) => slotId === right[index])
}

export function useAccessoryOrderMutation(user: User, session: WorkoutSession) {
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()
  const currentSlotIds = useMemo(
    () => session.isAdHoc
      ? []
      : addedSlotIds(session),
    [session.isAdHoc, session.movements],
  )
  const [orderedSlotIds, setOrderedSlotIds] = useState(currentSlotIds)
  const includeProgram = session.movements.some(
    (movement) => movement.isAdded && movement.addedScope === 'phase_slot',
  )

  useEffect(() => {
    setOrderedSlotIds(currentSlotIds)
  }, [currentSlotIds])

  const displayMovements = useMemo(() => {
    if (session.isAdHoc || !orderedSlotIds.length) return session.movements
    try {
      return reorderAddedAccessories(session.movements, orderedSlotIds)
    } catch {
      return session.movements
    }
  }, [orderedSlotIds, session.isAdHoc, session.movements])

  const mutation = useMutation({
    mutationKey: ['reorderSessionAccessories', session.sessionId],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: async (nextSlotIds: string[]) => {
      const ctx = buildUserContext(user)
      try {
        return await reorderSessionAccessories(ctx, {
          sessionId: session.sessionId,
          orderedSlotIds: nextSlotIds,
          requestId: request.requestIdFor({ orderedSlotIds: nextSlotIds }),
          expectedStateVersion: session.stateVersion,
        })
      } catch (error) {
        // Treat a lost response as success only when a fresh row proves that
        // every added accessory now has the requested order.
        try {
          const refreshed = await getSession(ctx, session.sessionId)
          if (sameOrder(addedSlotIds(refreshed), nextSlotIds)) return refreshed
        } catch {
          // Preserve the original mutation error when reconciliation cannot read.
        }
        throw error
      }
    },
    onError: async () => {
      setOrderedSlotIds(currentSlotIds)
      await invalidateSessionManagementCaches({
        queryClient,
        userId: user.id,
        sessionId: session.sessionId,
        includeProgram,
      }).catch(() => undefined)
    },
    onSuccess: async (nextSession) => {
      request.clearRequest()
      updateSessionManagementCaches(queryClient, user.id, nextSession)
      if (includeProgram) {
        await queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(user.id) })
      }
    },
  })

  const move = (movement: MovementSlot, direction: -1 | 1) => {
    if (session.isAdHoc || !movement.isAdded || mutation.isPending) return
    const slotId = movementSlotId(movement)
    const fromIndex = orderedSlotIds.indexOf(slotId)
    const toIndex = fromIndex + direction
    if (fromIndex < 0 || toIndex < 0 || toIndex >= orderedSlotIds.length) return
    const nextSlotIds = [...orderedSlotIds]
    ;[nextSlotIds[fromIndex], nextSlotIds[toIndex]] = [
      nextSlotIds[toIndex]!,
      nextSlotIds[fromIndex]!,
    ]
    setOrderedSlotIds(nextSlotIds)
    mutation.mutate(nextSlotIds)
  }

  return {
    ...mutation,
    displayMovements,
    errorMessage: mutation.isError
      ? getApiErrorMessage(mutation.error, 'Unable to save this accessory order. Try again.')
      : null,
    move,
    orderedSlotIds,
  }
}
