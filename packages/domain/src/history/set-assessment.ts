import type { HistorySessionInput } from './history'
import type { SetAssessment } from './types'
import { withHistoricalUnits } from './history-units'
import { convertWeight, e1rm } from '../shared/math'

export const OUTLIER_MIN_PRIOR_POINTS = 3
export const OUTLIER_MEDIAN_WINDOW = 5
export const OUTLIER_HIGH_FACTOR = 1.5

export function assessmentKey(sessionId: string, exerciseId: string, setId: string) {
  return `${sessionId}:${exerciseId}:${setId}`
}

/**
 * One accepted observation per workout and performed movement. Every set in a workout
 * uses the same prior-history threshold; an unusual set never hides valid lower work.
 * Rep eligibility for individual consumers (e.g. strength's 1–12) stays with them.
 */
export function assessHistorySets(sessions: HistorySessionInput[]): Map<string, SetAssessment> {
  const result = new Map<string, SetAssessment>()
  const prior = new Map<string, number[]>()
  const ordered = withHistoricalUnits(sessions).sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate) ||
    (a.completedAt ?? '').localeCompare(b.completedAt ?? '') || a.id.localeCompare(b.id),
  )
  for (const session of ordered) {
    const accepted = new Map<string, number>()
    for (const exercise of session.exercises) {
      const values = prior.get(exercise.performedMovementId) ?? []
      const baseline = values.length >= OUTLIER_MIN_PRIOR_POINTS
        ? median(values.slice(-OUTLIER_MEDIAN_WINDOW)) : null
      const thresholdKg = baseline === null ? null : baseline * OUTLIER_HIGH_FACTOR
      for (const set of exercise.sets) {
        if (!set.completed || !set.actualReps || set.actualReps < 1) continue
        const estimateKg = set.actualLoad && set.actualLoad > 0
          ? e1rm(convertWeight(set.actualLoad, session.units!, 'kg'), set.actualReps, set.actualRir ?? 0) : null
        if (estimateKg !== null && !Number.isFinite(estimateKg)) continue
        const unusual = estimateKg !== null && thresholdKg !== null && estimateKg > thresholdKg
        result.set(assessmentKey(session.id, exercise.id, set.id), {
          unusual, estimateKg, thresholdKg, priorObservations: values.length,
        })
        if (estimateKg !== null && !unusual) {
          accepted.set(exercise.performedMovementId, Math.max(accepted.get(exercise.performedMovementId) ?? 0, estimateKg))
        }
      }
    }
    for (const [movementId, value] of accepted) prior.set(movementId, [...(prior.get(movementId) ?? []), value])
  }
  return result
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
