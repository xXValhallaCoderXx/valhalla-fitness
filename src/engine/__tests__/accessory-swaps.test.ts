import { describe, expect, it } from 'vitest'
import { ACCESSORY_SLOTS, DEFAULT_EXERCISE_LIBRARY } from '../program-config'
import { swapCandidates } from '../accessories'

describe('accessory swap pools', () => {
  it('keeps high fatigue lower-body swaps out when readiness is low', () => {
    const slot = ACCESSORY_SLOTS['squat-quad']
    const candidates = swapCandidates(slot, DEFAULT_EXERCISE_LIBRARY, {
      readinessScore: 2,
      preferLowFatigue: true,
    })
    const bulgarian = candidates.find((candidate) => candidate.exercise.id === 'bulgarian-split-squat')
    expect(bulgarian?.eligible).toBe(false)
    expect(bulgarian?.reasons.join(' ')).toMatch(/High fatigue/)
  })

  it('gates shoulder-sensitive pressing when pain is present', () => {
    const slot = ACCESSORY_SLOTS['bench-press']
    const candidates = swapCandidates(slot, DEFAULT_EXERCISE_LIBRARY, { benchPain: 2 })
    expect(candidates.every((candidate) => !candidate.eligible)).toBe(true)
  })

  it('allows normal row swaps on a calm bench day', () => {
    const slot = ACCESSORY_SLOTS['bench-row']
    const candidates = swapCandidates(slot, DEFAULT_EXERCISE_LIBRARY, { benchPain: 0 })
    expect(candidates.some((candidate) => candidate.exercise.id === 'cs-row' && candidate.eligible)).toBe(true)
  })
})
