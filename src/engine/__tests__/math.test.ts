import { describe, it, expect } from 'vitest'
import { roundTo, e1rm, trainingMax, setWeight } from '../math'

describe('roundTo', () => {
  it('rounds to the nearest 2.5 kg by default', () => {
    expect(roundTo(76)).toBe(75) // 0.40 * 190
    expect(roundTo(161.5)).toBe(162.5)
    expect(roundTo(171)).toBe(170)
    expect(roundTo(142.5)).toBe(142.5)
  })
})

describe('e1rm', () => {
  it('applies the Epley curve at a true 1RM (reps 1, rir 0) → ~1.033× weight', () => {
    // Epley overestimates slightly at 1 rep by design; the TM% absorbs it.
    expect(e1rm(200, 1, 0)).toBeCloseTo(206.667, 2)
  })
  it('matches Epley-with-RIR for the 210kg tough single', () => {
    // 210 * (1 + (1 + 1)/30) = 224
    expect(e1rm(210, 1, 1)).toBeCloseTo(224, 5)
  })
})

describe('trainingMax', () => {
  it('seeds the deadlift TM to 190 from 210x1 @ RIR 1, tmPct 0.85', () => {
    // round(224 * 0.85) = round(190.4) = 190
    expect(trainingMax(210, 1, 1, 0.85)).toBe(190)
  })
})

describe('setWeight', () => {
  it('computes prescribed weights off TM 190', () => {
    expect(setWeight(190, 0.85)).toBe(162.5)
    expect(setWeight(190, 0.9)).toBe(170)
    expect(setWeight(190, 0.95)).toBe(180)
    expect(setWeight(190, 0.65)).toBe(122.5)
  })
})
