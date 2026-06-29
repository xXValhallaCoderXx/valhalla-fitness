import { describe, expect, it } from 'vitest'
import { firstActionableSetIndex, nextIncompleteSetIndex } from '../../session/components/live-focus-utils'
import {
  createFocusDemoMovement,
  focusDemoDraftFor,
  logFocusDemoSet,
  FOCUS_DEMO_SET_TOTAL,
  FOCUS_DEMO_TARGET_LOAD,
  FOCUS_DEMO_TARGET_REPS,
} from './focus-demo'

describe('createFocusDemoMovement', () => {
  it('starts with set 1 logged and the rest open', () => {
    const movement = createFocusDemoMovement()
    expect(movement.sets).toHaveLength(FOCUS_DEMO_SET_TOTAL)
    expect(movement.sets[0].completed).toBe(true)
    expect(movement.sets.slice(1).every((set) => !set.completed)).toBe(true)
    expect(firstActionableSetIndex(movement)).toBe(2)
  })
})

describe('focusDemoDraftFor', () => {
  it('seeds from target for an open set', () => {
    const movement = createFocusDemoMovement()
    expect(focusDemoDraftFor(movement, 2)).toEqual({
      load: FOCUS_DEMO_TARGET_LOAD,
      reps: FOCUS_DEMO_TARGET_REPS,
      rir: undefined,
    })
  })

  it('seeds from the logged values for a completed set', () => {
    const movement = createFocusDemoMovement()
    expect(focusDemoDraftFor(movement, 1)).toEqual({
      load: FOCUS_DEMO_TARGET_LOAD,
      reps: FOCUS_DEMO_TARGET_REPS,
      rir: 1,
    })
  })
})

describe('logFocusDemoSet', () => {
  it('marks the set complete with the draft and advances to the next', () => {
    const movement = createFocusDemoMovement()
    const next = logFocusDemoSet(movement, 2, { load: 90, reps: 5, rir: 2 })

    const loggedSet = next.sets.find((set) => set.setIndex === 2)!
    expect(loggedSet.completed).toBe(true)
    expect(loggedSet.actualLoad).toBe(90)
    expect(loggedSet.actualRir).toBe(2)
    expect(nextIncompleteSetIndex(next, 2)).toBe(3)

    // immutable — the original movement is untouched
    expect(movement.sets.find((set) => set.setIndex === 2)!.completed).toBe(false)
  })
})
