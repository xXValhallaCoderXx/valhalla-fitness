import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { patchSetInSession, type SetPatch } from '~/domains/session/lib/session-cache'
import { useRestTimerControls } from '~/domains/session/lib/rest-timer-context'
import { upsertSetLogFn } from '~/domains/session/server/session-functions'
import type { MovementSlot, WorkoutSession } from '~/domains/session'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { updateSessionManagementCaches } from '~/domains/session/lib/session-management-cache'

/**
 * Optimistic set-log mutation shared by the Overview row (`LiveSetRow`) and the
 * mobile Focus card (`FocusSetCard`). Patches the account's session cache immediately
 * (syncState `saving`), retains failed edits for retry, and reconciles server
 * receipts before mirroring the result into Today.
 */
export function useSetLogMutation(session: WorkoutSession, movement: MovementSlot, setIndex: number) {
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()
  const rest = useRestTimerControls()
  return useMutation({
    mutationKey: ['setLog', session.sessionId, movement.id, setIndex],
    scope: { id: `session:${session.sessionId}` },
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
          expectedStateVersion: session.stateVersion,
        },
      }),
    onMutate: async (patch) => {
      // Unlock the audio cue inside the tap gesture (before any await) so the beep can fire later.
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
    onError: (error, patch, context) => {
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
      notifications.show({
        color: 'danger',
        title: 'Set not saved',
        message: getApiErrorMessage(error, 'Unable to save this set. Retry when your connection is stable.'),
      })
    },
    onSuccess: (nextSession, patch, context) => {
      updateSessionManagementCaches(queryClient, userId, nextSession)
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
