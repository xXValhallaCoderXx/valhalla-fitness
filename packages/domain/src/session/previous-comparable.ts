import type {
  MovementSlot,
  PlannedSession,
  PreviousComparable,
  SetLog,
} from '@sheetless/domain/session/types'
import { e1rm, mround } from '@sheetless/domain/program/progression'
import { normalizeIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { externalLoadOrNull } from '@sheetless/domain/shared/load'
import { convertWeight } from '@sheetless/domain/shared/math'
import type { Unit } from '@sheetless/domain/shared/types'

export type PreviousComparableCandidate = {
  exerciseId: string
  slotId: string
  plannedMovementId: string
  performedMovementId: string
  role: MovementSlot['role']
  completedAt?: string | null
  scheduledDate: string
  templateId?: string | null
  timeZone?: string | null
  units?: Unit | null
  sets: SetLog[]
}

type RankedCandidate = {
  candidate: PreviousComparableCandidate
  score: number
}

/**
 * Selects the best prior result for every planned slot.
 *
 * A candidate must be work actually performed as the effective movement. The
 * score then prefers the same planned movement, role, programme template, and
 * exact slot before deterministic workout-date recency.
 */
export function selectPreviousComparables(
  plannedSession: PlannedSession,
  candidates: PreviousComparableCandidate[],
): Record<string, MovementSlot['previous']> {
  const result: Record<string, MovementSlot['previous']> = {}

  for (const movement of plannedSession.movements) {
    const slotId = movement.slotId ?? movement.id
    const performedMovementId = movement.performedMovementId ?? movement.movementId
    const ranked = candidates
      .filter(
        (candidate) =>
          candidate.performedMovementId === performedMovementId &&
          candidate.scheduledDate <= plannedSession.scheduledDate,
      )
      .map((candidate): RankedCandidate => ({
        candidate,
        score: scorePreviousComparable(plannedSession, movement, candidate),
      }))
      .sort(compareRankedCandidates)

    // A completed workout can contain an untouched exercise. Continue down the
    // ranking rather than allowing that empty row to erase useful history.
    for (const { candidate } of ranked) {
      const comparable = buildPreviousComparable(movement, candidate, plannedSession.units)
      if (!comparable) continue
      if (movement.loadSuggestionCutoff) {
        const latest = candidates.filter((item) => item.performedMovementId === performedMovementId && item.slotId === slotId &&
          item.completedAt && Date.parse(item.completedAt) >= Date.parse(movement.loadSuggestionCutoff!) &&
          item.sets.some((set) => set.completed && set.actualLoad != null))
          .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!))[0]
        comparable.postResetSets = latest?.sets.filter((set) => set.completed && set.actualLoad != null).map((set) => ({
          setIndex: set.setIndex, load: set.actualLoad === 0 ? 0 : comparableLoad(set.actualLoad, latest.units, plannedSession.units), reps: set.actualReps ?? null, rir: set.actualRir ?? null,
        })) ?? []
      }
      result[slotId] = comparable
      break
    }
  }

  return result
}

export function scorePreviousComparable(
  plannedSession: PlannedSession,
  movement: MovementSlot,
  candidate: PreviousComparableCandidate,
): number {
  let score = 0
  if (candidate.plannedMovementId === movement.movementId) score += 80
  if (candidate.role === movement.role) score += 20
  if (candidate.templateId === plannedSession.templateId) score += 8
  if (candidate.slotId === (movement.slotId ?? movement.id)) score += 12
  return score
}

export function buildPreviousComparable(
  movement: MovementSlot,
  candidate: PreviousComparableCandidate,
  units: Unit,
): PreviousComparable | null {
  const completedSets = candidate.sets.filter(
    (set) => set.completed && hasNumber(set.actualReps),
  )
  if (!completedSets.length) return null

  const set =
    movement.role === 'main'
      ? bestMainComparableSet(completedSets)
      : bestAccessoryComparableSet(completedSets)
  if (!set) return null

  const load = comparableLoad(set.actualLoad, candidate.units, units)
  const reps = set.actualReps ?? null
  const estimatedMax =
    load !== null && hasNumber(reps)
      ? mround(e1rm(load, reps, set.actualRir ?? 0), 0.5)
      : null

  return {
    movementId: candidate.performedMovementId,
    label: `Previous comparable: ${formatComparableSet(set, candidate.units, units)}${
      estimatedMax ? ` · e1RM ${formatNumber(estimatedMax)} ${units}` : ''
    } · ${formatCompactDate(candidate.scheduledDate)}`,
    load,
    reps,
    rir: set.actualRir ?? null,
    performedAt: candidate.completedAt ?? candidate.scheduledDate,
    workoutDate: candidate.scheduledDate,
    timeZone: normalizeIanaTimeZone(candidate.timeZone),
    e1rm: estimatedMax,
    setType: set.isAmrap
      ? 'amrap'
      : set.isTopSet
        ? 'top_set'
        : set.isBackoff
          ? 'backoff'
          : movement.role === 'accessory'
            ? 'accessory'
            : 'best_set',
    sets: completedSets.map((completedSet) => ({
      setIndex: completedSet.setIndex,
      load: comparableLoad(completedSet.actualLoad, candidate.units, units),
      reps: completedSet.actualReps ?? null,
      rir: completedSet.actualRir ?? null,
    })),
  }
}

function compareRankedCandidates(left: RankedCandidate, right: RankedCandidate) {
  if (right.score !== left.score) return right.score - left.score

  const scheduledDateOrder = right.candidate.scheduledDate.localeCompare(
    left.candidate.scheduledDate,
  )
  if (scheduledDateOrder !== 0) return scheduledDateOrder

  const completedAtOrder = (right.candidate.completedAt ?? '').localeCompare(
    left.candidate.completedAt ?? '',
  )
  if (completedAtOrder !== 0) return completedAtOrder

  return right.candidate.exerciseId.localeCompare(left.candidate.exerciseId)
}

function bestMainComparableSet(sets: SetLog[]) {
  const topSets = sets.filter((set) => set.isTopSet || set.isAmrap)
  const pool = topSets.length ? topSets : sets
  return [...pool].sort((left, right) => setScore(right) - setScore(left))[0] ?? null
}

function bestAccessoryComparableSet(sets: SetLog[]) {
  return [...sets].sort((left, right) => setScore(right) - setScore(left))[0] ?? null
}

function setScore(set: SetLog) {
  const load = externalLoadOrNull(set.actualLoad)
  const reps = set.actualReps ?? 0
  return load === null ? reps : e1rm(load, reps, set.actualRir ?? 0)
}

function formatComparableSet(
  set: SetLog,
  sourceUnits: Unit | null | undefined,
  targetUnits: Unit,
) {
  const load = comparableLoad(set.actualLoad, sourceUnits, targetUnits)
  const reps = set.actualReps
  const rir = typeof set.actualRir === 'number' ? ` @ RIR ${set.actualRir}` : ''
  const loadText = load === null ? 'bodyweight' : `${formatNumber(load)} ${targetUnits}`
  return `${loadText} × ${reps ?? '-'}${set.isAmrap ? '+' : ''}${rir}`
}

function comparableLoad(
  value: unknown,
  sourceUnits: Unit | null | undefined,
  targetUnits: Unit,
) {
  const load = externalLoadOrNull(value)
  if (load === null || !sourceUnits || sourceUnits === targetUnits) return load
  return convertWeight(load, sourceUnits, targetUnits)
}

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}
