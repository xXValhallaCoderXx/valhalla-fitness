import type { MovementRole, SetLog, Unit, WorkoutSession } from '~/shared/types'
import { e1rm } from '~/shared/lib/math'
import { formatWeight } from '~/shared/lib/set-notation'

/**
 * Pure, display-ready model for the Workout Summary modal. Derives completion,
 * stats, the session-best e1RM, and per-exercise breakdowns from an already
 * loaded `WorkoutSession` — no backend calls. Kept separate so it can be tested.
 */

export type AccentTone = 'action' | 'accent' | 'warning' | 'neutral'
export type EffortTone = 'danger' | 'action' | 'success' | 'neutral'

export type SummarySet = {
  index: number
  resultLabel: string
  isTop: boolean
  rir: number | null
  rirTone: EffortTone
}

export type SummaryExercise = {
  id: string
  name: string
  role: MovementRole
  accentTone: AccentTone
  tagLabel: string
  targetSummary: string
  volumeLabel: string
  bestSetLabel: string
  hitEveryTarget: boolean
  defaultOpen: boolean
  completedSetCount: number
  sets: SummarySet[]
}

export type WorkoutSummaryModel = {
  completion: { completed: number; planned: number; percent: number }
  stats: { volumeLabel: string; movementCount: number; topSetCount: number; durationMinutes: number }
  sessionBest: { movementName: string; resultLabel: string; e1rmLabel: string; rir: number | null } | null
  exercises: SummaryExercise[]
  notes: string | null
}

function hasNum(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Completed-set volume (load × reps), in the session's own units. */
function completedVolume(sets: SetLog[]): number {
  return sets.reduce((total, set) => {
    if (!set.completed || !hasNum(set.actualLoad) || !hasNum(set.actualReps)) return total
    return total + set.actualLoad * set.actualReps
  }, 0)
}

function formatVolume(value: number, units: Unit): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)} ${units}`
}

function accentForRole(role: MovementRole): AccentTone {
  if (role === 'main') return 'action'
  if (role === 'variation') return 'accent'
  if (role === 'accessory') return 'warning'
  return 'neutral'
}

function tagForRole(role: MovementRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function rirTone(rir: number | null): EffortTone {
  if (rir == null) return 'neutral'
  if (rir <= 1) return 'danger'
  if (rir === 2) return 'action'
  return 'success'
}

/** "82.5 kg × 10+" — actual values, falling back to targets; bodyweight-aware. */
function setResultLabel(set: SetLog, units: Unit): string {
  const load = set.actualLoad ?? set.targetLoad
  const loadText = load == null || load === 0 ? 'Bodyweight' : formatWeight(load, units)!
  const reps = set.actualReps ?? set.targetReps ?? set.targetRepMin ?? null
  const repsText = reps == null ? '—' : `${reps}${set.isAmrap ? '+' : ''}`
  return `${loadText} × ${repsText}`
}

function setScore(set: SetLog): number {
  if (hasNum(set.actualLoad) && hasNum(set.actualReps)) return e1rm(set.actualLoad, set.actualReps, set.actualRir ?? 0)
  return set.actualReps ?? 0
}

/** Prefer the marked top set, else the highest-e1RM (then most-reps) logged set. */
function pickBestSet(sets: SetLog[]): SetLog | null {
  const completed = sets.filter((set) => set.completed)
  const pool = completed.length ? completed : sets
  if (!pool.length) return null
  const top = pool.find((set) => set.isTopSet)
  if (top) return top
  return pool.reduce((best, set) => (setScore(set) > setScore(best) ? set : best), pool[0])
}

/** True only when every completed set met or beat its target reps. Conservative. */
function hitEveryTarget(completedSets: SetLog[]): boolean {
  if (!completedSets.length) return false
  return completedSets.every((set) => {
    const target = set.targetReps ?? set.targetRepMin
    return hasNum(target) && hasNum(set.actualReps) && set.actualReps >= target
  })
}

export function buildWorkoutSummary(session: WorkoutSession): WorkoutSummaryModel {
  const units = session.units
  const allSets = session.movements.flatMap((movement) => movement.sets)
  const completedSets = allSets.filter((set) => set.completed)
  const planned = allSets.length
  const completed = completedSets.length
  const percent = planned ? Math.round((completed / planned) * 100) : 0

  let best: { set: SetLog; movementName: string; value: number } | null = null
  for (const movement of session.movements) {
    const movementName = movement.performedMovementName ?? movement.movementName
    for (const set of movement.sets) {
      if (!set.completed || !hasNum(set.actualLoad) || !hasNum(set.actualReps)) continue
      const value = e1rm(set.actualLoad, set.actualReps, set.actualRir ?? 0)
      if (!best || value > best.value) best = { set, movementName, value }
    }
  }

  const exercises: SummaryExercise[] = session.movements.map((movement) => {
    const completedForMovement = movement.sets.filter((set) => set.completed)
    const displaySets = completedForMovement.length ? completedForMovement : movement.sets
    const bestSet = pickBestSet(movement.sets)
    return {
      id: movement.id,
      name: movement.performedMovementName ?? movement.movementName,
      role: movement.role,
      accentTone: accentForRole(movement.role),
      tagLabel: tagForRole(movement.role),
      targetSummary: movement.targetSummary,
      volumeLabel: formatVolume(completedVolume(movement.sets), units),
      bestSetLabel: bestSet ? setResultLabel(bestSet, units) : '—',
      hitEveryTarget: hitEveryTarget(completedForMovement),
      defaultOpen: movement.role === 'main' || movement.role === 'variation',
      completedSetCount: completedForMovement.length,
      sets: displaySets.map((set) => ({
        index: set.setIndex,
        resultLabel: setResultLabel(set, units),
        isTop: Boolean(set.isTopSet || set.isAmrap),
        rir: set.actualRir ?? null,
        rirTone: rirTone(set.actualRir ?? null),
      })),
    }
  })

  return {
    completion: { completed, planned, percent },
    stats: {
      volumeLabel: formatVolume(completedVolume(completedSets), units),
      movementCount: session.movements.length,
      topSetCount: completedSets.filter((set) => set.isTopSet || set.isAmrap).length,
      durationMinutes: session.estimatedMinutes,
    },
    sessionBest: best
      ? {
          movementName: best.movementName,
          resultLabel: setResultLabel(best.set, units),
          e1rmLabel: formatWeight(Math.round(best.value * 10) / 10, units) ?? '—',
          rir: best.set.actualRir ?? null,
        }
      : null,
    exercises,
    notes: session.notes ?? null,
  }
}
