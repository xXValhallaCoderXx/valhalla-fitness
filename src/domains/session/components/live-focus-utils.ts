import type { MovementSlot, WorkoutSession } from '~/shared/types'

export type AdvanceResult =
  | { kind: 'set'; movementId: string; setIndex: number }
  | { kind: 'movement'; movementId: string; setIndex: number }
  | { kind: 'sessionComplete' }

export type SetSegmentState = 'complete' | 'current' | 'failed' | 'future'

export type SetSegment = { setIndex: number; state: SetSegmentState }

function hasIncompleteSet(movement: MovementSlot): boolean {
  return movement.sets.some((set) => !set.completed)
}

function orderedMovements(session: WorkoutSession): MovementSlot[] {
  return [...session.movements].sort((a, b) => a.orderIndex - b.orderIndex)
}

/** First incomplete set's index, else the last set's index, else 1. */
export function firstActionableSetIndex(movement: MovementSlot): number {
  return movement.sets.find((set) => !set.completed)?.setIndex ?? movement.sets.at(-1)?.setIndex ?? 1
}

/** Next incomplete set strictly after `fromSetIndex` within the movement, else null. */
export function nextIncompleteSetIndex(movement: MovementSlot, fromSetIndex: number): number | null {
  return movement.sets.find((set) => set.setIndex > fromSetIndex && !set.completed)?.setIndex ?? null
}

/**
 * Id of the next movement that still has an incomplete set, scanning by orderIndex
 * from `fromOrderIndex`, then wrapping to the start to catch a skipped-earlier movement.
 */
export function nextIncompleteMovementId(session: WorkoutSession, fromOrderIndex: number): string | null {
  const ordered = orderedMovements(session)
  const after = ordered.find((movement) => movement.orderIndex >= fromOrderIndex && hasIncompleteSet(movement))
  if (after) return after.id
  return ordered.find((movement) => hasIncompleteSet(movement))?.id ?? null
}

/**
 * Where focus should move after a set in `movementId` is logged. Operates on the
 * authoritative (post-log) session: prefers the next incomplete set in the same
 * movement, then the next incomplete movement, else the session is complete.
 */
export function advanceAfterLog(session: WorkoutSession, movementId: string, loggedSetIndex: number): AdvanceResult {
  const movement = session.movements.find((item) => item.id === movementId)
  if (movement && hasIncompleteSet(movement)) {
    const after = nextIncompleteSetIndex(movement, loggedSetIndex)
    const target = after ?? movement.sets.find((set) => !set.completed)!.setIndex
    return { kind: 'set', movementId, setIndex: target }
  }
  const fromOrderIndex = movement ? movement.orderIndex + 1 : 0
  const nextId = nextIncompleteMovementId(session, fromOrderIndex)
  if (nextId) {
    const nextMovement = session.movements.find((item) => item.id === nextId)!
    return { kind: 'movement', movementId: nextId, setIndex: firstActionableSetIndex(nextMovement) }
  }
  return { kind: 'sessionComplete' }
}

/** Previous/next exercise by orderIndex, clamped at the ends (manual nav does not wrap). */
export function exerciseNeighbors(session: WorkoutSession, activeMovementId: string) {
  const ordered = orderedMovements(session)
  const index = ordered.findIndex((movement) => movement.id === activeMovementId)
  const prev = index > 0 ? ordered[index - 1] : null
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null
  return { prevId: prev?.id ?? null, nextId: next?.id ?? null, hasPrev: Boolean(prev), hasNext: Boolean(next) }
}

/** Segmented per-set state for the progress bar. Precedence: failed > current > complete > future. */
export function setSegments(movement: MovementSlot, selectedSetIndex: number): SetSegment[] {
  return movement.sets.map((set) => {
    const state: SetSegmentState =
      set.syncState === 'syncFailed'
        ? 'failed'
        : set.setIndex === selectedSetIndex
          ? 'current'
          : set.completed
            ? 'complete'
            : 'future'
    return { setIndex: set.setIndex, state }
  })
}

/** Count of completed sets in a movement (for "n/total" labels). */
export function movementCompletedSets(movement: MovementSlot): number {
  return movement.sets.filter((set) => set.completed).length
}

/** The next `count` movements after the active one, in order (for the "coming up" peek). */
export function upcomingMovements(session: WorkoutSession, activeMovementId: string, count = 2): MovementSlot[] {
  const ordered = orderedMovements(session)
  const index = ordered.findIndex((movement) => movement.id === activeMovementId)
  if (index === -1) return []
  return ordered.slice(index + 1, index + 1 + count)
}
