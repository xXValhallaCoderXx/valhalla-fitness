import type { MovementSlot, SetLog } from './types'

function isPositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function seedLoadForSet(movement: MovementSlot, set: SetLog): number {
  if (set.actualLoad != null) return set.actualLoad
  if (set.targetLoad != null) return set.targetLoad
  let carried: number | null = null
  let carriedIndex = -1
  for (const other of movement.sets) {
    if (other.setIndex >= set.setIndex || !other.completed || !isPositive(other.actualLoad)) continue
    if (other.setIndex > carriedIndex) {
      carried = other.actualLoad
      carriedIndex = other.setIndex
    }
  }
  if (carried != null) return carried
  return isPositive(movement.previous?.load) ? movement.previous.load : 0
}

export function seedRepsForSet(movement: MovementSlot, set: SetLog): number {
  if (set.actualReps != null) return set.actualReps
  if (set.targetReps != null) return set.targetReps
  if (set.targetRepMin != null) return set.targetRepMin
  let carried: number | null = null
  let carriedIndex = -1
  for (const other of movement.sets) {
    if (other.setIndex >= set.setIndex || !other.completed || !isPositive(other.actualReps)) continue
    if (other.setIndex > carriedIndex) {
      carried = other.actualReps
      carriedIndex = other.setIndex
    }
  }
  if (carried != null) return carried
  return isPositive(movement.previous?.reps) ? movement.previous.reps : 0
}

export function resolveSetRir(input: {
  draftRir?: number
  savedRir?: number | null
  completed: boolean
  suggestedRir?: number
}): number | undefined {
  if (typeof input.draftRir === 'number') return input.draftRir
  if (typeof input.savedRir === 'number') return input.savedRir
  return input.completed ? undefined : input.suggestedRir
}
