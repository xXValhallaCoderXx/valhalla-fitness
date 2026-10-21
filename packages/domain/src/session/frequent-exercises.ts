import type { AccessoryMovementOption } from '../movement/types'
import { addCalendarDays, isCalendarDate } from '../shared/calendar-date'

export const FREQUENT_EXERCISES_WINDOW_DAYS = 90

export type FrequentExercise = AccessoryMovementOption & {
  completedWorkoutCount: number
  lastWorkoutDate: string
}

export type FrequentExerciseHistory = {
  id: string
  scheduledDate: string
  completedAt?: string | null
  exercises: Array<{
    performedMovementId: string
    sets: Array<{ completed: boolean; actualReps?: number | null }>
  }>
}

export function frequentExercisesWindowStart(today: string): string {
  if (!isCalendarDate(today)) throw new RangeError('Today must be a valid calendar date')
  return addCalendarDays(today, 1 - FREQUENT_EXERCISES_WINDOW_DAYS)!
}

/** Completed workouts only; repetitions of a movement within one workout count once. */
export function buildFrequentExercises({ sessions, options, today, freeWeightOnly = false }: {
  sessions: FrequentExerciseHistory[]
  /** Current active catalogue options, using the same eligibility as Add exercise. */
  options: AccessoryMovementOption[]
  today: string
  freeWeightOnly?: boolean
}): FrequentExercise[] {
  const start = frequentExercisesWindowStart(today)
  const eligible = new Map(options.filter(option => !freeWeightOnly || option.freeWeightCompatible)
    .map(option => [option.movementId, option]))
  const counted = new Map<string, {
    option: AccessoryMovementOption; sessionIds: Set<string>; date: string; completedAt: string
  }>()
  for (const session of sessions) {
    if (!isCalendarDate(session.scheduledDate) || session.scheduledDate < start || session.scheduledDate > today) continue
    for (const exercise of session.exercises) {
      const option = eligible.get(exercise.performedMovementId)
      if (!option || !exercise.sets.some(set => set.completed
        && typeof set.actualReps === 'number' && Number.isFinite(set.actualReps) && set.actualReps > 0)) continue
      const row = counted.get(option.movementId) ?? {
        option, sessionIds: new Set<string>(), date: session.scheduledDate, completedAt: session.completedAt ?? '',
      }
      row.sessionIds.add(session.id)
      if (session.scheduledDate > row.date
        || (session.scheduledDate === row.date && (session.completedAt ?? '') > row.completedAt)) {
        row.date = session.scheduledDate
        row.completedAt = session.completedAt ?? ''
      }
      counted.set(option.movementId, row)
    }
  }
  return [...counted.values()].sort((left, right) =>
    right.sessionIds.size - left.sessionIds.size
    || right.date.localeCompare(left.date)
    || right.completedAt.localeCompare(left.completedAt)
    || left.option.movementName.localeCompare(right.option.movementName)
    || left.option.movementId.localeCompare(right.option.movementId),
  ).slice(0, 3).map(({ option, sessionIds, date }) => ({
    ...option, completedWorkoutCount: sessionIds.size, lastWorkoutDate: date,
  }))
}
