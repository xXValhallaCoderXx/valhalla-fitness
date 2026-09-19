import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { pendingWorkoutDrafts, setDraftKey, workoutDraftsKey, type SetInputDraft, type WorkoutDrafts } from './workout-drafts'

/** Account/session memory survives navigation, but is never persisted or replayed offline. */
export function useWorkoutDrafts(userId: string, sessionId: string) {
  const client = useQueryClient()
  const queryKey = workoutDraftsKey(userId, sessionId)
  const { data: drafts } = useQuery<WorkoutDrafts>({
    queryKey, queryFn: () => ({}), enabled: false, initialData: {}, gcTime: Infinity,
  })
  return {
    get: (movement: MovementSlot, setIndex: number) => drafts[setDraftKey(movement, setIndex)],
    pending: (session: WorkoutSession) => pendingWorkoutDrafts(session, drafts),
    set: (movement: MovementSlot, setIndex: number, draft: SetInputDraft) => {
      client.setQueryData<WorkoutDrafts>(queryKey, (current) => ({ ...current, [setDraftKey(movement, setIndex)]: draft }))
    },
    clear: (movement: MovementSlot, setIndex: number) => {
      client.setQueryData<WorkoutDrafts>(queryKey, (current) => {
        const next = { ...current }
        delete next[setDraftKey(movement, setIndex)]
        return next
      })
    },
  }
}
