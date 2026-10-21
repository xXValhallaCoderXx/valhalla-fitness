import { seedLoadForSet, seedRepsForSet } from './live-session-utils'
import type { MovementSlot, SetLog, WorkoutSession } from './types/session'

/** Raw strings belong to the edit, not to a mounted input or a server snapshot. */
export type SetInput = { load: string; reps: string; rir: number | null }
export type SetInputDraft = SetInput & { revision: number; submitted?: { revision: number; mutationId: string } }

export function setDraftId(movement: MovementSlot, setIndex: number) {
  return JSON.stringify([movement.id, movement.performedMovementId ?? movement.movementId, setIndex])
}

export function seedSetInput(movement: MovementSlot, set: SetLog): SetInput {
  const load = set.completed ? set.actualLoad : seedLoadForSet(movement, set)
  const reps = set.completed ? set.actualReps : seedRepsForSet(movement, set)
  return { load: load == null ? '' : String(load), reps: reps == null ? '' : String(reps), rir: set.actualRir ?? null }
}

export function parseSetInput(input: SetInput) {
  const load = input.load.trim() === '' ? null : Number(input.load.replace(',', '.'))
  const reps = input.reps.trim() === '' ? null : Number(input.reps)
  if (load === null || !Number.isFinite(load) || load < 0 || reps === null || !Number.isInteger(reps) || reps < 0) return null
  return { actualLoad: load, actualReps: reps, actualRir: input.rir }
}

export function confirmedSetCount(session: WorkoutSession) {
  return session.movements.reduce((count, movement) => count + movement.sets.filter(
    set => set.completed && set.syncState !== 'saving' && set.syncState !== 'syncFailed',
  ).length, 0)
}
