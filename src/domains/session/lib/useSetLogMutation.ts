import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { patchSetInSession, type SetPatch } from '~/domains/session/lib/session-cache'
import { useRestTimerControls } from '~/domains/session/lib/rest-timer-context'
import { upsertSetLogFn } from '~/domains/session/server/session-functions'
import type { MovementSlot, WorkoutSession } from '~/shared/types'

/**
 * Optimistic set-log mutation shared by the Overview row (`LiveSetRow`) and the
 * mobile Focus card (`FocusSetCard`). Patches the `['session', id]` cache immediately
 * (syncState `saving`), mirrors the result into `['today']`, and rolls back to
 * `syncFailed` on error. Lifted verbatim from `LiveSetRow` so both call sites behave
 * identically.
 */
export function useSetLogMutation(session: WorkoutSession, movement: MovementSlot, setIndex: number) {
  const queryClient = useQueryClient()
  const rest = useRestTimerControls()
  return useMutation({
    mutationKey: ['setLog', session.sessionId, movement.id, setIndex],
    mutationFn: (patch: SetPatch) =>
      upsertSetLogFn({
        data: {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          setIndex,
          actualLoad: patch.actualLoad,
          actualReps: patch.actualReps,
          actualRir: patch.actualRir,
          completed: patch.completed,
          note: patch.note,
          clientMutationId: patch.clientMutationId ?? crypto.randomUUID(),
        },
      }),
    onMutate: async (patch) => {
      // Unlock the audio cue inside the tap gesture (before any await) so the beep can fire later.
      if (patch.completed) rest.prime()
      await queryClient.cancelQueries({ queryKey: ['session', session.sessionId] })
      const previous = queryClient.getQueryData<WorkoutSession>(['session', session.sessionId])
      if (previous) {
        queryClient.setQueryData(
          ['session', session.sessionId],
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
    onError: (error, patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['session', session.sessionId],
          patchSetInSession(context.previous, {
            ...patch,
            movementSlotId: movement.id,
            setIndex,
            syncState: 'syncFailed',
          }),
        )
      }
      notifications.show({
        color: 'danger',
        title: 'Set not saved',
        message: getApiErrorMessage(error, 'Unable to save this set. Retry when your connection is stable.'),
      })
    },
    onSuccess: (nextSession, patch, context) => {
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
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
