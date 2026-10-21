import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { workoutDurationLabel } from '@sheetless/domain/session/today-details'
import type { SetLog, WorkoutSession } from '@sheetless/domain/session/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatNumber, formatWeight } from '@sheetless/domain/shared/set-notation'

const recorded = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

/** Saved results never fall back to targets or assume an unset load is bodyweight. */
export function recordedSetLabel(set: SetLog, units: Unit) {
  const reps = recorded(set.actualReps) ? `${formatNumber(set.actualReps)} reps` : 'Reps not recorded'
  if (!recorded(set.actualLoad)) return `${reps} · load not recorded`
  const load = set.actualLoad === 0 ? 'Bodyweight' : formatWeight(set.actualLoad, units)
  return `${load} × ${recorded(set.actualReps) ? formatNumber(set.actualReps) : 'reps not recorded'}`
}

/** Native presentation only; web and historical completion behavior are unchanged. */
export function buildNativeWorkoutRecap(session: WorkoutSession) {
  const recap = buildWorkoutSummary(session)
  const exercises = session.movements.flatMap((movement) => {
    const completed = movement.sets.filter(set => set.completed)
    if (!completed.length) return []
    return [{
      id: movement.id,
      name: movement.performedMovementName ?? movement.movementName,
      originalName: movement.performedMovementId && movement.performedMovementId !== movement.movementId
        ? movement.movementName : null,
      plannedSetCount: movement.sets.length,
      completedSetCount: completed.length,
      targetSummary: movement.targetSummary,
      sets: completed.map(set => ({
        id: set.id, index: set.setIndex, resultLabel: recordedSetLabel(set, session.units),
        rir: recorded(set.actualRir) ? set.actualRir : null,
      })),
    }]
  })
  return {
    ...recap, exercises,
    sessionBest: recap.sessionBest ? { ...recap.sessionBest, resultLabel: recap.sessionBest.resultLabel.replace(/\+$/, '') } : null,
    stats: { ...recap.stats, movementCount: exercises.length },
    durationLabel: workoutDurationLabel(session),
    unloggedSets: recap.completion.planned - recap.completion.completed,
  }
}

export type NativeWorkoutRecap = ReturnType<typeof buildNativeWorkoutRecap>
