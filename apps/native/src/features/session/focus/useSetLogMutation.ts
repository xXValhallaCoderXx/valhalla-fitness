/**
 * Native port of apps/web/src/domains/session/lib/useSetLogMutation.ts —
 * the optimistic set-log with syncFailed retry. Differences from web: calls
 * @sheetless/data directly with the restored session's UserContext, and skips
 * toasts (the Focus card's inline "Last save failed" line is the surface).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { prepareSetLogAttempt, type SetLogAttempt } from '@sheetless/domain/session/set-log-intent'
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
  const sessionKey = accountQueryKeys.session(userId, session.sessionId)
  const mutation = useMutation({
    mutationKey: ['setLog', session.sessionId, movement.id, setIndex],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: (patch: SetLogAttempt) =>
      upsertSetLog(buildUserContext(user), {
        sessionId: session.sessionId,
        exerciseLogId: movement.id,
        setIndex,
        actualLoad: patch.actualLoad,
        actualReps: patch.actualReps,
        actualRir: patch.actualRir,
        actualRpe: patch.actualRpe,
        completed: patch.completed,
        note: patch.note,
        clientMutationId: patch.clientMutationId ?? crypto.randomUUID(),
        expectedStateVersion: queryClient.getQueryData<WorkoutSession>(sessionKey)?.stateVersion ?? session.stateVersion,
        reconcileBeforeSave: patch.reconcileBeforeSave,
      }),
    onMutate: async (attempt) => {
      const patch = { ...attempt }
      delete patch.reconcileBeforeSave
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
    onError: (_error, attempt, context) => {
      const patch = { ...attempt }
      delete patch.reconcileBeforeSave
      // Not a rollback: the typed values stay on screen as syncFailed so the user can retry.
      const previous = context?.previous
      if (previous) {
        queryClient.setQueryData<WorkoutSession>(
          accountQueryKeys.session(userId, session.sessionId),
          (current) => {
            const latestSet = current?.movements.find((item) => item.id === movement.id)
              ?.sets.find((item) => item.setIndex === setIndex)
            if (current && latestSet?.clientMutationId !== patch.clientMutationId) return current
            return patchSetInSession(current ?? previous, {
              ...patch,
              movementSlotId: movement.id,
              setIndex,
              syncState: 'syncFailed',
            })
          },
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
  const prepare = (patch: SetPatch) => {
    const current = queryClient.getQueryData<WorkoutSession>(sessionKey) ?? session
    const set = current.movements.find((item) => item.id === movement.id)?.sets.find((item) => item.setIndex === setIndex)
    return prepareSetLogAttempt(set, patch, () => crypto.randomUUID())
  }
  return {
    ...mutation,
    mutate: (patch: SetPatch, options?: Parameters<typeof mutation.mutate>[1]) => mutation.mutate(prepare(patch), options),
    mutateAsync: (patch: SetPatch, options?: Parameters<typeof mutation.mutateAsync>[1]) => mutation.mutateAsync(prepare(patch), options),
  }
}
