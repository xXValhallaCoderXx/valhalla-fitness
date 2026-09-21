import { describe, expect, it } from 'vitest'
import { confirmedSetCount, parseSetInput, seedSetInput, setDraftId } from '../src/session/set-draft'
import type { MovementSlot, WorkoutSession } from '../src/session/types/session'
const movement: MovementSlot = { id: 'slot', movementId: 'pull-up', movementName: 'Pull-up', orderIndex: 0, role: 'accessory', targetSummary: '',
  sets: [{ id: 'set', setIndex: 1, completed: false, targetReps: 8, targetRir: 2 }] }

describe('temporary set inputs', () => {
  it('seeds visible suggestions but never invents effort', () => {
    expect(seedSetInput(movement, movement.sets[0])).toEqual({ load: '0', reps: '8', rir: null })
    expect(seedSetInput(movement, { ...movement.sets[0], completed: true, actualLoad: 0, actualReps: 10, actualRir: 1 })).toEqual({ load: '0', reps: '10', rir: 1 })
    expect(seedSetInput(movement, { ...movement.sets[0], completed: true })).toEqual({ load: '', reps: '', rir: null })
  })
  it('distinguishes blank load and reps from explicit zero and accepts partial decimal text only when valid', () => {
    expect(parseSetInput({ load: '', reps: '8', rir: null })).toBeNull()
    expect(parseSetInput({ load: '0', reps: '', rir: null })).toBeNull()
    expect(parseSetInput({ load: '.', reps: '8', rir: null })).toBeNull()
    expect(parseSetInput({ load: '82.', reps: '8', rir: null })).toEqual({ actualLoad: 82, actualReps: 8, actualRir: null })
    expect(parseSetInput({ load: '82,5', reps: '8', rir: 0 })).toEqual({ actualLoad: 82.5, actualReps: 8, actualRir: 0 })
    expect(parseSetInput({ load: '0', reps: '8.5', rir: null })).toBeNull()
  })
  it('counts confirmed bodyweight work and excludes optimistic or failed completions', () => {
    const session = { movements: [{ ...movement, sets: [
      { ...movement.sets[0], completed: true, actualLoad: 0 },
      { ...movement.sets[0], completed: true, syncState: 'syncFailed' },
      { ...movement.sets[0], completed: true, syncState: 'saving' },
    ] }] } as WorkoutSession
    expect(confirmedSetCount(session)).toBe(1)
  })
  it('isolates exercise, performed movement and set identity', () => {
    expect(new Set([setDraftId(movement, 1), setDraftId(movement, 2), setDraftId({ ...movement, id: 'other' }, 1),
      setDraftId({ ...movement, performedMovementId: 'other' }, 1)]).size).toBe(4)
  })
})
