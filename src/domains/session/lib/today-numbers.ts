import { formatWeight } from '~/shared/lib/set-notation'
import type { MovementSlot, PlannedSession, SetLog } from '~/shared/types'

/** One movement's line in the "Today's numbers" drawer. */
export type TodayNumbersRow = {
  slotId: string
  movementName: string
  /** Grouped set chunks like "3×5 · 62.5 kg", or [targetSummary] when no loads are projected. */
  targets: string[]
  previousLabel: string | null
}

type PlannedMovements = Pick<PlannedSession, 'movements'>
type PlannedNumbers = Pick<PlannedSession, 'movements' | 'units'>

export function countPlannedSets(session: PlannedMovements): number {
  return session.movements.reduce((total, movement) => total + movement.sets.length, 0)
}

export function hasTargetLoads(session: PlannedMovements): boolean {
  return session.movements.some((movement) => movement.sets.some((set) => set.targetLoad != null))
}

/** Reps used for tonnage: the explicit target, else the bottom of the rep range. */
function tonnageReps(set: SetLog): number | null {
  return set.targetReps ?? set.targetRepMin ?? null
}

/** Σ(target load × target reps) over sets that project both — a planned-volume floor. */
export function estimateTonnage(session: PlannedMovements): number {
  const total = session.movements.reduce(
    (sessionSum, movement) =>
      sessionSum +
      movement.sets.reduce((movementSum, set) => {
        const reps = tonnageReps(set)
        if (set.targetLoad == null || reps == null) return movementSum
        return movementSum + set.targetLoad * reps
      }, 0),
    0,
  )
  return Math.round(total)
}

/** Collapsed teaser: "9 planned sets · ~5,830 kg · target loads" (or movement count without loads). */
export function buildTodayNumbersSummary(session: PlannedNumbers): string {
  const setCount = countPlannedSets(session)
  const setsPart = `${setCount} planned ${setCount === 1 ? 'set' : 'sets'}`
  if (hasTargetLoads(session)) {
    const tonnage = estimateTonnage(session)
    const tonnagePart = tonnage > 0 ? ` · ~${tonnage.toLocaleString('en-US')} ${session.units}` : ''
    return `${setsPart}${tonnagePart} · target loads`
  }
  const movementCount = session.movements.length
  return `${setsPart} · ${movementCount} ${movementCount === 1 ? 'movement' : 'movements'}`
}

/** Reps part of a chunk label; AMRAP renders as "5+" (or "AMRAP" without a rep floor). */
function chunkRepsLabel(set: SetLog): string | null {
  const core =
    set.targetReps != null
      ? String(set.targetReps)
      : set.targetRepMin != null && set.targetRepMax != null
        ? `${set.targetRepMin}-${set.targetRepMax}`
        : set.targetRepMin != null
          ? String(set.targetRepMin)
          : null
  if (set.isAmrap) return core ? `${core}+` : 'AMRAP'
  return core
}

function movementTargetChunks(movement: Pick<MovementSlot, 'sets' | 'targetSummary'>, units: string): string[] {
  const sets = movement.sets
  // No projected loads (user-selected/blank plans) → the preformatted summary is all we know.
  if (!sets.length || sets.every((set) => set.targetLoad == null)) return [movement.targetSummary]
  const chunks: Array<{ reps: string; load: string | null; count: number }> = []
  for (const set of sets) {
    const reps = chunkRepsLabel(set) ?? '—'
    const load = formatWeight(set.targetLoad, units)
    const last = chunks[chunks.length - 1]
    if (last && last.reps === reps && last.load === load) {
      last.count += 1
    } else {
      chunks.push({ reps, load, count: 1 })
    }
  }
  return chunks.map((chunk) => `${chunk.count}×${chunk.reps}${chunk.load ? ` · ${chunk.load}` : ''}`)
}

export function buildTodayNumbersRows(session: PlannedNumbers): TodayNumbersRow[] {
  return session.movements.map((movement) => ({
    slotId: movement.id,
    movementName: movement.movementName,
    targets: movementTargetChunks(movement, session.units),
    previousLabel: movement.previous?.label ?? null,
  }))
}
