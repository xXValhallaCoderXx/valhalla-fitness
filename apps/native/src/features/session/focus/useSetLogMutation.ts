/**
 * Native port of apps/web/src/domains/session/lib/useSetLogMutation.ts —
 * the optimistic set-log with syncFailed retry. Differences from web: calls
 * @sheetless/data directly with the restored session's UserContext, and skips
 * toasts (the Focus card's inline "Last save failed" line is the surface).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { upsertSetLog } from '@sheetless/data/session/sets'
import { patchSetInSession, reconcileSessionSets, type SetPatch } from '@sheetless/domain/session/session-cache'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useRestTimerControls } from '../rest-timer/rest-timer-context'

export function useSetLogMutation(
  user: User,
  session: WorkoutSession,
  movement: MovementSlot,
  setIndex: number,
) {
  const userId = user.id
  const queryClient = useQueryClient()
  const rest = useRestTimerControls()
  return useMutation({
    mutationKey: ['setLog', session.sessionId, movement.id, setIndex],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: (patch: SetPatch) =>
      upsertSetLog(buildUserContext(user), {
        sessionId: session.sessionId,
        exerciseLogId: movement.id,
        setIndex,
        actualLoad: patch.actualLoad,
        actualReps: patch.actualReps,
        actualRir: patch.actualRir,
        completed: patch.completed,
        note: patch.note,
        clientMutationId: patch.clientMutationId ?? crypto.randomUUID(),
        expectedStateVersion: session.stateVersion,
      }),
    onMutate: async (patch) => {
      if (patch.completed) rest.prime()
      const sessionKey = accountQueryKeys.session(userId, session.sessionId)
      await queryClient.cancelQueries({ queryKey: sessionKey })
      const previous = queryClient.getQueryData<WorkoutSession>(sessionKey)
      if (previous) {
        queryClient.setQueryData(
          sessionKey,
          patchSetInSession(previous, {
            ...patch,
            movementSlotId: movement.id,
            setIndex,
            syncState: 'saving',
          }),
        )
      }
      return { previous }
    },
    onError: (_error, patch, context) => {
      // Not a rollback: the typed values stay on screen as syncFailed so the user can retry.
      const previous = context?.previous
      if (previous) {
        queryClient.setQueryData<WorkoutSession>(
          accountQueryKeys.session(userId, session.sessionId),
          (current) => patchSetInSession(current ?? previous, {
            ...patch,
            movementSlotId: movement.id,
            setIndex,
            syncState: 'syncFailed',
          }),
        )
      }
    },
    onSuccess: (nextSession, patch, context) => {
      const sessionKey = accountQueryKeys.session(userId, session.sessionId)
      const reconciled = reconcileSessionSets(queryClient.getQueryData<WorkoutSession>(sessionKey), nextSession)
      queryClient.setQueryData(sessionKey, reconciled)
      queryClient.setQueryData(
        accountQueryKeys.today(userId),
        (current: TodayPayload | undefined) =>
          current ? { ...current, activeSession: reconciled } : current,
      )
      // Auto-start rest only on a genuine incomplete -> complete transition (not edits/retries).
      if (patch.completed === true) {
        const priorSet = context?.previous?.movements
          .find((item) => item.id === movement.id)
          ?.sets.find((set) => set.setIndex === setIndex)
        if (priorSet?.completed === false) rest.startForSlot(movement)
      }
    },
  })
}
