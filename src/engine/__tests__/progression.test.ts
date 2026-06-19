import { describe, it, expect } from 'vitest'
import { evaluateCycle, type TopSetResult } from '../progression'

const ts = (minReps: number, repsDone: number, rir: number, barFast = true): TopSetResult => ({
  weekIndex: 0,
  minReps,
  repsDone,
  rir,
  barFast,
})

// A clean cycle: hit the minimums at RIR≥2, fast bar, no extra reps.
const onTargetSets = [ts(5, 5, 2), ts(3, 3, 2), ts(1, 1, 3)]

describe('evaluateCycle — bands (spec §6.2)', () => {
  it('STANDARD: all min at RIR≥2 fast → +5 lower', () => {
    const r = evaluateCycle({
      lift: 'deadlift',
      currentTM: 190,
      topSets: onTargetSets,
      benchPainMax: 0,
      fullyRecovered: true,
      consecutiveHoldOrReset: 0,
    })
    expect(r.band).toBe('standard')
    expect(r.tmDeltaKg).toBe(5)
    expect(r.nextTM).toBe(195)
  })

  it('STANDARD upper (bench, pain-free) → +2.5', () => {
    const r = evaluateCycle({
      lift: 'bench',
      currentTM: 100,
      topSets: onTargetSets,
      benchPainMax: 0,
      fullyRecovered: true,
      consecutiveHoldOrReset: 0,
    })
    expect(r.band).toBe('standard')
    expect(r.nextTM).toBe(102.5)
  })

  it('DOUBLE: every top set min+2 at RIR≥2, recovered → +7.5 lower', () => {
    const r = evaluateCycle({
      lift: 'squat',
      currentTM: 150,
      topSets: [ts(5, 7, 2), ts(3, 5, 2), ts(1, 3, 2)],
      benchPainMax: 0,
      fullyRecovered: true,
      consecutiveHoldOrReset: 0,
    })
    expect(r.band).toBe('double')
    expect(r.tmDeltaKg).toBe(7.5)
    expect(r.nextTM).toBe(157.5)
  })

  it('DOUBLE is gated by fullyRecovered — falls back to STANDARD', () => {
    const r = evaluateCycle({
      lift: 'squat',
      currentTM: 150,
      topSets: [ts(5, 7, 2), ts(3, 5, 2), ts(1, 3, 2)],
      benchPainMax: 0,
      fullyRecovered: false,
      consecutiveHoldOrReset: 0,
    })
    expect(r.band).toBe('standard')
    expect(r.tmDeltaKg).toBe(5)
  })

  it('HOLD: a grind (RIR≤1) on any top set → no change', () => {
    const r = evaluateCycle({
      lift: 'deadlift',
      currentTM: 190,
      topSets: [ts(5, 5, 2), ts(3, 3, 1), ts(1, 1, 2)],
      benchPainMax: 0,
      fullyRecovered: true,
      consecutiveHoldOrReset: 0,
    })
    expect(r.band).toBe('hold')
    expect(r.nextTM).toBe(190)
  })

  it('RESET: missed a minimum → 90% TM + extra deload', () => {
    const r = evaluateCycle({
      lift: 'deadlift',
      currentTM: 190,
      topSets: [ts(5, 4, 0), ts(3, 3, 2), ts(1, 1, 2)],
      benchPainMax: 0,
      fullyRecovered: true,
      consecutiveHoldOrReset: 0,
    })
    expect(r.band).toBe('reset')
    expect(r.nextTM).toBe(170) // round(0.9*190)=round(171)=170
    expect(r.addExtraDeload).toBe(true)
  })
})

describe('evaluateCycle — bench pain override', () => {
  it('any pain (≤5) blocks progression → HOLD', () => {
    const r = evaluateCycle({
      lift: 'bench',
      currentTM: 100,
      topSets: onTargetSets,
      benchPainMax: 3,
      fullyRecovered: true,
      consecutiveHoldOrReset: 0,
    })
    expect(r.band).toBe('hold')
    expect(r.nextTM).toBe(100)
  })

  it('pain > 5 → RESET', () => {
    const r = evaluateCycle({
      lift: 'bench',
      currentTM: 100,
      topSets: onTargetSets,
      benchPainMax: 7,
      fullyRecovered: true,
      consecutiveHoldOrReset: 0,
    })
    expect(r.band).toBe('reset')
    expect(r.nextTM).toBe(90)
  })
})

describe('evaluateCycle — stall rule', () => {
  it('2nd consecutive hold/reset forces TM down to 90%', () => {
    const r = evaluateCycle({
      lift: 'squat',
      currentTM: 150,
      topSets: [ts(5, 5, 1), ts(3, 3, 2), ts(1, 1, 2)], // grind → hold
      benchPainMax: 0,
      fullyRecovered: true,
      consecutiveHoldOrReset: 1,
    })
    expect(r.stallReset).toBe(true)
    expect(r.nextTM).toBe(135) // 0.9*150
    expect(r.nextConsecutiveHoldOrReset).toBe(2)
  })

  it('a progressing cycle resets the consecutive counter', () => {
    const r = evaluateCycle({
      lift: 'squat',
      currentTM: 150,
      topSets: onTargetSets,
      benchPainMax: 0,
      fullyRecovered: true,
      consecutiveHoldOrReset: 1,
    })
    expect(r.nextConsecutiveHoldOrReset).toBe(0)
    expect(r.stallReset).toBe(false)
  })
})
