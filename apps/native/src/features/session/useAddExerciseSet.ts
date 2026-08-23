/**
 * Native port of apps/web/src/domains/session/lib/useAddExerciseSet.ts —
 * append a set to an accessory movement, updating the session/today caches.
 * Errors stay on the mutation object for inline rendering (no toasts).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { addExerciseSet } from '@sheetless/data/session/sets'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'

export function useAddExerciseSet(user: User, session: WorkoutSession, movement: MovementSlot) {
  const userId = user.id
  const queryClient = useQueryClient()
  const { requestIdFor, clearRequest } = useStableMutationRequest()
  return useMutation({
    mutationKey: ['addExerciseSet', session.sessionId, movement.id],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: () =>
      addExerciseSet(buildUserContext(user), {
        sessionId: session.sessionId,
        exerciseLogId: movement.id,
        clientMutationId: requestIdFor({ exerciseLogId: movement.id }),
        expectedStateVersion: session.stateVersion,
      }),
    onSuccess: (nextSession) => {
      clearRequest()
      queryClient.setQueryData(accountQueryKeys.session(userId, session.sessionId), nextSession)
      queryClient.setQueryData(
        accountQueryKeys.today(userId),
        (current: TodayPayload | undefined) =>
          current ? { ...current, activeSession: nextSession } : current,
      )
    },
  })
}
