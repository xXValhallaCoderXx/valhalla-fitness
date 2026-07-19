import { describe, expect, it } from 'vitest'
import {
  advanceAfterLog,
  patchSetInSession,
  seedLoadForSet,
  seedRepsForSet,
  sessionCompletion,
  type MovementSlot,
  type SetLog,
  type WorkoutSession,
} from '../src'

function set(setIndex: number, completed = false, extra: Partial<SetLog> = {}): SetLog {
  return { id: `set-${setIndex}`, setIndex, completed, ...extra }
}

function movement(id: string, orderIndex: number, sets: SetLog[]): MovementSlot {
  return { id, movementId: id, movementName: id, role: 'main', orderIndex, targetSummary: 'work', sets }
}

function session(movements: MovementSlot[]): WorkoutSession {
  return {
    id: 'planned',
    sessionId: 'session',
    title: 'Day 1',
    programTitle: 'Plan',
    templateId: 'template',
    weekIndex: 0,
    weekLabel: 'Week 1',
    hardness: 'Medium',
    scheduledDate: '2026-07-18',
    estimatedMinutes: 60,
    units: 'kg',
    rounding: 2.5,
    status: 'in_progress',
    movements,
  }
}

describe('shared session core', () => {
  it('optimistically patches without mutating the source', () => {
    const original = session([movement('exercise', 0, [set(1)])])
    const next = patchSetInSession(original, {
      movementSlotId: 'exercise',
      setIndex: 1,
      actualLoad: 102.5,
      actualReps: 5,
      completed: true,
      syncState: 'saving',
    })
    expect(next.movements[0]?.sets[0]).toMatchObject({ actualLoad: 102.5, actualReps: 5, completed: true })
    expect(original.movements[0]?.sets[0]?.completed).toBe(false)
    expect(sessionCompletion(next)).toEqual({ completed: 1, total: 1, percent: 100 })
  })

  it('advances within a movement, then to the next movement', () => {
    const within = session([movement('a', 0, [set(1, true), set(2)])])
    expect(advanceAfterLog(within, 'a', 1)).toEqual({ kind: 'set', movementId: 'a', setIndex: 2 })
    const across = session([movement('a', 0, [set(1, true)]), movement('b', 1, [set(1)])])
    expect(advanceAfterLog(across, 'a', 1)).toEqual({ kind: 'movement', movementId: 'b', setIndex: 1 })
  })

  it('seeds target values before prior completed and historical values', () => {
    const sets = [set(1, true, { actualLoad: 50, actualReps: 10 }), set(2, false, { targetLoad: 60, targetReps: 8 })]
    const slot = movement('a', 0, sets)
    expect(seedLoadForSet(slot, sets[1]!)).toBe(60)
    expect(seedRepsForSet(slot, sets[1]!)).toBe(8)
  })
})
