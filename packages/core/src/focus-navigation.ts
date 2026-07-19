import type { MovementSlot, WorkoutSession } from './types'

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
  return [...session.movements].sort((left, right) => left.orderIndex - right.orderIndex)
}

export function firstActionableSetIndex(movement: MovementSlot): number {
  return movement.sets.find((set) => !set.completed)?.setIndex ?? movement.sets.at(-1)?.setIndex ?? 1
}

export function nextIncompleteSetIndex(movement: MovementSlot, fromSetIndex: number): number | null {
  return movement.sets.find((set) => set.setIndex > fromSetIndex && !set.completed)?.setIndex ?? null
}

export function nextIncompleteMovementId(session: WorkoutSession, fromOrderIndex: number): string | null {
  const ordered = orderedMovements(session)
  const after = ordered.find((movement) => movement.orderIndex >= fromOrderIndex && hasIncompleteSet(movement))
  if (after) return after.id
  return ordered.find((movement) => hasIncompleteSet(movement))?.id ?? null
}

export function advanceAfterLog(
  session: WorkoutSession,
  movementId: string,
  loggedSetIndex: number,
): AdvanceResult {
  const movement = session.movements.find((item) => item.id === movementId)
  if (movement && hasIncompleteSet(movement)) {
    const after = nextIncompleteSetIndex(movement, loggedSetIndex)
    const target = after ?? movement.sets.find((set) => !set.completed)!.setIndex
    return { kind: 'set', movementId, setIndex: target }
  }
  const nextId = nextIncompleteMovementId(session, movement ? movement.orderIndex + 1 : 0)
  if (nextId) {
    const nextMovement = session.movements.find((item) => item.id === nextId)!
    return { kind: 'movement', movementId: nextId, setIndex: firstActionableSetIndex(nextMovement) }
  }
  return { kind: 'sessionComplete' }
}

export function exerciseNeighbors(session: WorkoutSession, activeMovementId: string) {
  const ordered = orderedMovements(session)
  const index = ordered.findIndex((movement) => movement.id === activeMovementId)
  const prev = index > 0 ? ordered[index - 1] : null
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null
  return {
    prevId: prev?.id ?? null,
    nextId: next?.id ?? null,
    hasPrev: Boolean(prev),
    hasNext: Boolean(next),
  }
}

export function setSegments(movement: MovementSlot, selectedSetIndex: number): SetSegment[] {
  return movement.sets.map((set) => ({
    setIndex: set.setIndex,
    state:
      set.syncState === 'syncFailed'
        ? 'failed'
        : set.setIndex === selectedSetIndex
          ? 'current'
          : set.completed
            ? 'complete'
            : 'future',
  }))
}

export function movementCompletedSets(movement: MovementSlot): number {
  return movement.sets.filter((set) => set.completed).length
}

export function upcomingMovements(
  session: WorkoutSession,
  activeMovementId: string,
  count = 2,
): MovementSlot[] {
  const ordered = orderedMovements(session)
  const index = ordered.findIndex((movement) => movement.id === activeMovementId)
  return index === -1 ? [] : ordered.slice(index + 1, index + 1 + count)
}
