import type { MovementSlot, SetLog, WorkoutSession } from '@sheetless/domain/session/types/session'
import { seedLoadForSet, seedRepsForSet } from '@sheetless/domain/session/live-session-utils'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'

export type SetInputDraft = { actualLoad: number | null; actualReps: number; actualRir?: number }
export type WorkoutDrafts = Record<string, SetInputDraft>
export const workoutMemoryKey = (userId: string, sessionId: string) =>
  [...accountQueryKeys.session(userId, sessionId), 'workout-memory'] as const
export const workoutDraftsKey = (userId: string, sessionId: string) =>
  [...workoutMemoryKey(userId, sessionId), 'input-drafts'] as const

export const setDraftKey = (movement: MovementSlot, setIndex: number) => JSON.stringify([
  movement.id, movement.performedMovementId ?? movement.movementId, setIndex,
])

export function seedSetDraft(movement: MovementSlot, set: SetLog): SetInputDraft {
  return { actualLoad: seedLoadForSet(movement, set), actualReps: seedRepsForSet(movement, set), actualRir: set.actualRir ?? undefined }
}

export function isSetDraftDirty(movement: MovementSlot, set: SetLog, draft: SetInputDraft) {
  const baseline = seedSetDraft(movement, set)
  return draft.actualLoad !== baseline.actualLoad || draft.actualReps !== baseline.actualReps
    || (draft.actualRir ?? null) !== (baseline.actualRir ?? null)
}

export function pendingWorkoutDrafts(session: WorkoutSession, drafts: WorkoutDrafts = {}) {
  return session.movements.flatMap((movement) => movement.sets.flatMap((set) => {
    const draft = drafts[setDraftKey(movement, set.setIndex)]
    return draft && isSetDraftDirty(movement, set, draft) ? [{ movement, set }] : []
  }))
}
