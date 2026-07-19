import { describe, expect, it } from 'vitest'
import type { MovementSlot, SetLog, WorkoutSession } from '../src/shared/types'
import {
  advanceAfterLog,
  exerciseNeighbors,
  firstActionableSetIndex,
  nextIncompleteSetIndex,
  setSegments,
  upcomingMovements,
} from '../src/domains/session/components/live-focus-utils'

function set(setIndex: number, completed: boolean, extra: Partial<SetLog> = {}): SetLog {
  return { id: `set-${setIndex}`, setIndex, targetLoad: 100, targetReps: 5, completed, ...extra }
}

function movement(id: string, orderIndex: number, sets: SetLog[], extra: Partial<MovementSlot> = {}): MovementSlot {
  return { id, movementId: id, movementName: id, role: 'main', orderIndex, targetSummary: '5x5', sets, ...extra }
}

function buildSession(movements: MovementSlot[]): WorkoutSession {
  return {
    sessionId: 'session-1',
    id: 'planned-1',
    title: 'Day 1',
    programTitle: 'Beginner 5x5',
    templateId: 'beginner-5x5',
    weekIndex: 0,
    weekLabel: 'Week 1',
    hardness: 'Medium',
    scheduledDate: '2026-06-28',
    estimatedMinutes: 60,
    units: 'kg',
    rounding: 2.5,
    status: 'in_progress',
    movements,
  }
}

describe('firstActionableSetIndex', () => {
  it('returns the first incomplete set', () => {
    expect(firstActionableSetIndex(movement('m', 1, [set(1, true), set(2, false), set(3, false)]))).toBe(2)
  })
  it('falls back to the last set when all are complete', () => {
    expect(firstActionableSetIndex(movement('m', 1, [set(1, true), set(2, true)]))).toBe(2)
  })
  it('defaults to 1 for an empty movement', () => {
    expect(firstActionableSetIndex(movement('m', 1, []))).toBe(1)
  })
})

describe('nextIncompleteSetIndex', () => {
  it('finds the next incomplete set after the given index', () => {
    expect(nextIncompleteSetIndex(movement('m', 1, [set(1, true), set(2, false), set(3, false)]), 1)).toBe(2)
  })
  it('skips completed sets', () => {
    expect(nextIncompleteSetIndex(movement('m', 1, [set(1, false), set(2, true), set(3, false)]), 1)).toBe(3)
  })
  it('returns null when none remain after the index', () => {
    expect(nextIncompleteSetIndex(movement('m', 1, [set(1, false), set(2, true)]), 2)).toBeNull()
  })
})

describe('advanceAfterLog', () => {
  it('moves to the next incomplete set in the same movement', () => {
    const session = buildSession([movement('m1', 1, [set(1, true), set(2, false), set(3, false)])])
    expect(advanceAfterLog(session, 'm1', 1)).toEqual({ kind: 'set', movementId: 'm1', setIndex: 2 })
  })

  it('moves to the next incomplete movement when the current one is done', () => {
    const session = buildSession([
      movement('m1', 1, [set(1, true), set(2, true)]),
      movement('m2', 2, [set(1, false), set(2, false)]),
    ])
    expect(advanceAfterLog(session, 'm1', 2)).toEqual({ kind: 'movement', movementId: 'm2', setIndex: 1 })
  })

  it('wraps back to a skipped-earlier movement', () => {
    const session = buildSession([
      movement('m1', 1, [set(1, false)]),
      movement('m2', 2, [set(1, true), set(2, true)]),
    ])
    expect(advanceAfterLog(session, 'm2', 2)).toEqual({ kind: 'movement', movementId: 'm1', setIndex: 1 })
  })

  it('reports session complete when nothing is incomplete', () => {
    const session = buildSession([
      movement('m1', 1, [set(1, true)]),
      movement('m2', 2, [set(1, true)]),
    ])
    expect(advanceAfterLog(session, 'm2', 1)).toEqual({ kind: 'sessionComplete' })
  })
})

describe('exerciseNeighbors', () => {
  const session = buildSession([
    movement('m1', 1, [set(1, false)]),
    movement('m2', 2, [set(1, false)]),
    movement('m3', 3, [set(1, false)]),
  ])
  it('returns both neighbors in the middle', () => {
    expect(exerciseNeighbors(session, 'm2')).toEqual({ prevId: 'm1', nextId: 'm3', hasPrev: true, hasNext: true })
  })
  it('clamps at the first exercise', () => {
    expect(exerciseNeighbors(session, 'm1')).toMatchObject({ prevId: null, hasPrev: false, nextId: 'm2', hasNext: true })
  })
  it('clamps at the last exercise', () => {
    expect(exerciseNeighbors(session, 'm3')).toMatchObject({ nextId: null, hasNext: false, prevId: 'm2', hasPrev: true })
  })
  it('disables both for a single-movement session', () => {
    const single = buildSession([movement('only', 1, [set(1, false)])])
    expect(exerciseNeighbors(single, 'only')).toEqual({ prevId: null, nextId: null, hasPrev: false, hasNext: false })
  })
})

describe('setSegments', () => {
  it('applies precedence failed > current > complete > future', () => {
    const m = movement('m', 1, [
      set(1, true),
      set(2, false),
      set(3, false),
      set(4, false, { syncState: 'syncFailed' }),
    ])
    expect(setSegments(m, 2)).toEqual([
      { setIndex: 1, state: 'complete' },
      { setIndex: 2, state: 'current' },
      { setIndex: 3, state: 'future' },
      { setIndex: 4, state: 'failed' },
    ])
  })
  it('marks a selected completed set as current', () => {
    const m = movement('m', 1, [set(1, true), set(2, true)])
    expect(setSegments(m, 1)[0]).toEqual({ setIndex: 1, state: 'current' })
  })
})

describe('upcomingMovements', () => {
  it('returns the next two movements after the active one', () => {
    const session = buildSession([
      movement('m1', 1, [set(1, false)]),
      movement('m2', 2, [set(1, false)]),
      movement('m3', 3, [set(1, false)]),
      movement('m4', 4, [set(1, false)]),
    ])
    expect(upcomingMovements(session, 'm1').map((m) => m.id)).toEqual(['m2', 'm3'])
  })
  it('returns nothing for the last movement', () => {
    const session = buildSession([movement('m1', 1, [set(1, false)]), movement('m2', 2, [set(1, false)])])
    expect(upcomingMovements(session, 'm2')).toEqual([])
  })
})
