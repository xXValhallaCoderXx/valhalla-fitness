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
import { setDraftId } from '@sheetless/domain/session/set-draft'
import { reconcileWorkoutDrafts, submittedSetDraft } from '../editing/workout-drafts'
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
        exerciseLogId: patch.movementSlotId!,
        setIndex: patch.setIndex,
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
      const target = previous?.movements.find(item => item.id === patch.movementSlotId) ?? movement
      const before = target.sets.find(item => item.setIndex === patch.setIndex)
      const newCompletion = rest.trackSave(target, before, patch.clientMutationId!, Boolean(patch.completed), patch.setIndex)
      if (previous) {
        queryClient.setQueryData(
          sessionKey,
          patchSetInSession(previous, {
            ...patch,
            movementSlotId: patch.movementSlotId,
            setIndex: patch.setIndex,
            syncState: 'saving',
          }),
        )
      }
      return { previous, newCompletion }
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
            const latestSet = current?.movements.find((item) => item.id === patch.movementSlotId)
              ?.sets.find((item) => item.setIndex === patch.setIndex)
            if (current && latestSet?.clientMutationId !== patch.clientMutationId) return current
            // A fresh read may already have proved this exact write committed.
            if (latestSet?.clientMutationId === patch.clientMutationId && latestSet?.syncState === 'synced') return current
            return patchSetInSession(current ?? previous, {
              ...patch,
              movementSlotId: patch.movementSlotId,
              setIndex: patch.setIndex,
              syncState: 'syncFailed',
            })
          },
        )
      }
    },
    onSuccess: (nextSession) => {
      const sessionKey = accountQueryKeys.session(userId, session.sessionId)
      const reconciled = reconcileSessionSets(queryClient.getQueryData<WorkoutSession>(sessionKey), nextSession)
      queryClient.setQueryData(sessionKey, reconciled)
      queryClient.setQueryData(
        accountQueryKeys.today(userId),
        (current: TodayPayload | undefined) =>
          current ? { ...current, activeSession: reconciled } : current,
      )
      reconcileWorkoutDrafts(queryClient, userId, reconciled)
      rest.confirmSession(reconciled)
    },
  })
  const prepare = (patch: SetPatch) => {
    const current = queryClient.getQueryData<WorkoutSession>(sessionKey) ?? session
    const set = current.movements.find((item) => item.id === movement.id)?.sets.find((item) => item.setIndex === setIndex)
    const attempt = prepareSetLogAttempt(set, { ...patch, movementSlotId: movement.id, setIndex }, () => crypto.randomUUID())
    submittedSetDraft(queryClient, userId, session.sessionId, setDraftId(movement, setIndex), attempt.clientMutationId!, attempt)
    return attempt
  }
  return {
    ...mutation,
    mutate: (patch: SetPatch, options?: Parameters<typeof mutation.mutate>[1]) => mutation.mutate(prepare(patch), options),
    mutateAsync: (patch: SetPatch, options?: Parameters<typeof mutation.mutateAsync>[1]) => mutation.mutateAsync(prepare(patch), options),
  }
}
