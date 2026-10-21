import { bodyRegionLabels, resolveRegionWeights } from '../history/body-load'
import type { BodyRegionId } from '../history/types'
import { movementCatalog } from '../movement/movements'
import type { PlannedSession, WorkoutSession } from './types'
import { normalizeSessionRpe } from './session-reflection'

/** Same fractional set allocation as Insights; one set contributes at most one in total. */
export function workoutMuscleSets(session: PlannedSession, completedOnly = false) {
  const totals = new Map<BodyRegionId, number>()
  for (const slot of session.movements) {
    const id = slot.performedMovementId ?? slot.movementId
    const movement = movementCatalog[id]
    const weights = Object.entries(resolveRegionWeights(id, movement?.category, movement)) as Array<[BodyRegionId, number]>
    const sum = weights.reduce((total, [, weight]) => total + weight, 0)
    if (sum <= 0) continue
    const sets = slot.sets.filter(set => !completedOnly || set.completed).length
    for (const [region, weight] of weights) {
      if (weight > 0 && sets > 0) totals.set(region, (totals.get(region) ?? 0) + sets * weight / sum)
    }
  }
  return [...totals].sort((a, b) => b[1] - a[1]).map(([id, sets]) => ({
    id, label: bodyRegionLabels[id], sets: Math.round(sets * 10) / 10,
  }))
}

/** Count each exercise once per involved muscle, regardless of its number of sets. */
export function workoutMusclesByExerciseCount(session: PlannedSession, completedOnly = false) {
  const counts = new Map<BodyRegionId, number>()
  for (const slot of session.movements) {
    if (!slot.sets.some(set => !completedOnly || set.completed)) continue
    const id = slot.performedMovementId ?? slot.movementId
    const movement = movementCatalog[id]
    const weights = Object.entries(resolveRegionWeights(id, movement?.category, movement)) as Array<[BodyRegionId, number]>
    for (const [region, weight] of weights) {
      if (weight > 0) counts.set(region, (counts.get(region) ?? 0) + 1)
    }
  }
  // Equal counts retain their first appearance in the workout.
  return [...counts].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

const finite = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null

/** Missing effort stays missing. Comparisons use only sets carrying both actual and target RIR. */
export function workoutEffort(session: WorkoutSession) {
  const sets = session.movements.flatMap(movement => movement.sets).filter(set => set.completed)
  const recorded = sets.flatMap(set => finite(set.actualRir) ? [set.actualRir] : [])
  const targets = sets.flatMap(set => finite(set.targetRir) ? [set.targetRir] : [])
  const paired = sets.filter(set => finite(set.actualRir) && finite(set.targetRir))
  const difference = average(paired.map(set => set.actualRir! - set.targetRir!))
  const comparison = difference === null
    ? 'There are no completed sets with both recorded and planned reps left to compare.'
    : `Across ${paired.length === 1 ? 'the set' : `the ${paired.length} sets`} with both values, you logged ${Math.abs(difference) < 0.25 ? 'about the planned' : difference < 0 ? 'fewer than the planned' : 'more than the planned'} reps left.`
  return {
    rating: normalizeSessionRpe(session.sessionRpe),
    averageRir: average(recorded),
    targetRir: average(targets),
    recordedSets: recorded.length,
    targetSets: targets.length,
    completedSets: sets.length,
    comparison,
  }
}

export function workoutEffortLabel(rating: number) {
  if (rating === 10) return 'max effort'
  if (rating === 9) return 'very hard'
  if (rating >= 7) return 'hard'
  if (rating >= 4) return 'moderate'
  return 'easy'
}

/** Never substitute a planned duration for time actually spent logging. */
export function workoutDurationLabel(session: WorkoutSession) {
  const elapsed = Date.parse(session.completedAt ?? '') - Date.parse(session.startedAt ?? '')
  if (!Number.isFinite(elapsed) || elapsed < 0) return 'Duration unavailable'
  return elapsed < 60_000 ? '<1 min' : `${Math.floor(elapsed / 60_000)} min`
}
