import { describe, expect, it } from 'vitest'
import { firstActionableSetIndex, nextIncompleteSetIndex } from '../../session/components/live-focus-utils'
import {
  createFocusDemoMovement,
  focusDemoDraftFor,
  focusDemoProgression,
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

describe('focusDemoProgression', () => {
  const base = FOCUS_DEMO_TARGET_LOAD

  it('adds 5 kg when the final set had reps in reserve (RIR 2)', () => {
    const result = focusDemoProgression(base, 2)
    expect(result.outcome).toBe('increase')
    expect(result.nextLoad).toBe(base + 5)
    expect(result.deltaKg).toBe(5)
  })

  it('treats the 3+ bucket as a progression too', () => {
    expect(focusDemoProgression(base, 3).outcome).toBe('increase')
  })

  it('holds the load on RIR 1 (no change, encouraging)', () => {
    const result = focusDemoProgression(base, 1)
    expect(result.outcome).toBe('hold')
    expect(result.nextLoad).toBe(base)
    expect(result.deltaKg).toBe(0)
  })

  it('eases the load back on a max-effort RIR 0 set', () => {
    const result = focusDemoProgression(base, 0)
    expect(result.outcome).toBe('decrease')
    expect(result.nextLoad).toBe(base - 5)
    expect(result.deltaKg).toBe(-5)
  })

  it('holds when effort was skipped (undefined RIR)', () => {
    expect(focusDemoProgression(base, undefined).outcome).toBe('hold')
  })

  it('never drops below zero', () => {
    expect(focusDemoProgression(3, 0).nextLoad).toBe(0)
  })
})
