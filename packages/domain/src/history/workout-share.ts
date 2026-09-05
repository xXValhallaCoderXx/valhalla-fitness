import type { SetLog, WorkoutSession } from '../session/types'
import type { Unit } from '../shared/types'
import { e1rm } from '../shared/math'

export type WorkoutShareExercise = {
  movementId: string
  name: string
  result: string
  isPr: boolean
}

/** A deliberately limited projection: no account, notes, reflection or prescriptions. */
export type WorkoutShareModel = {
  title: string
  date: string
  dateLabel: string
  filename: string
  completedSets: number
  durationSeconds: number | null
  prCount: number
  exercises: WorkoutShareExercise[]
  overflowCount: number
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function usable(set: SetLog): boolean {
  return set.completed && finite(set.actualReps) && set.actualReps > 0 &&
    (set.actualLoad == null || (finite(set.actualLoad) && set.actualLoad >= 0))
}

function result(load: number | null | undefined, reps: number, units: Unit): string {
  if (load == null) return `${reps} reps`
  return `${load === 0 ? 'Bodyweight' : `${load} ${units}`} × ${reps}`
}

function bestSet(sets: SetLog[]): SetLog {
  // Weighted results and rep-only results are different measures; prefer a weighted pool.
  const weighted = sets.filter((set) => (set.actualLoad ?? 0) > 0)
  const pool = weighted.length ? weighted : sets
  const score = (set: SetLog) => weighted.length
    ? e1rm(set.actualLoad!, set.actualReps!, finite(set.actualRir) ? set.actualRir : 0)
    : set.actualReps!
  return pool.reduce((best, set) => score(set) > score(best) ? set : best)
}

export function buildWorkoutShareModel(session: WorkoutSession): WorkoutShareModel | null {
  if (session.status !== 'completed') return null
  // Calendar dates are parsed in UTC only for formatting, never converted to device time.
  const date = session.scheduledDate
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date) return null

  const groups = new Map<string, { name: string; sets: SetLog[] }>()
  const movements = [...session.movements].sort((a, b) => a.orderIndex - b.orderIndex)
  for (const movement of movements) {
    const id = movement.performedMovementId ?? movement.movementId
    const group = groups.get(id) ?? {
      name: movement.performedMovementName ?? movement.movementName,
      sets: [],
    }
    group.sets.push(...[...movement.sets].sort((a, b) => a.setIndex - b.setIndex).filter(usable))
    groups.set(id, group)
  }
  const exercises: WorkoutShareExercise[] = []
  for (const [movementId, group] of groups) {
    if (!group.sets.length) continue
    const pr = session.prs?.find((pr) => pr.movementId === movementId && pr.kinds.length > 0 &&
      finite(pr.load) && pr.load >= 0 && finite(pr.reps) && pr.reps > 0)
    const best = bestSet(group.sets)
    exercises.push({
      movementId,
      name: group.name,
      isPr: Boolean(pr),
      result: pr ? result(pr.load, pr.reps, session.units) : result(best.actualLoad, best.actualReps!, session.units),
    })
  }
  if (!exercises.length) return null
  exercises.sort((a, b) => Number(b.isPr) - Number(a.isPr))
  const start = session.startedAt ? Date.parse(session.startedAt) : NaN
  const end = session.completedAt ? Date.parse(session.completedAt) : NaN
  const elapsed = end - start
  return {
    title: session.title,
    date,
    dateLabel: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(parsed),
    filename: `sheetless-workout-${date}.png`,
    completedSets: session.movements.flatMap((movement) => movement.sets).filter((set) => set.completed).length,
    durationSeconds: Number.isFinite(elapsed) && elapsed > 0 ? Math.round(elapsed / 1000) : null,
    prCount: exercises.filter((exercise) => exercise.isPr).length,
    exercises: exercises.slice(0, 6),
    overflowCount: Math.max(0, exercises.length - 6),
  }
}
