import { describe, expect, it } from 'vitest'
import { buildOnboardingProgress, hasStrengthEstimate } from '../src/domains/onboarding/onboarding-progress'

describe('buildOnboardingProgress', () => {
  it('marks every step incomplete for a brand-new user', () => {
    const { steps, allDone } = buildOnboardingProgress({
      hasActiveProgram: false,
      programStateDefaults: {},
      completedSessions: 0,
    })
    expect(steps.map((step) => step.done)).toEqual([false, false, false])
    expect(allDone).toBe(false)
  })

  it('derives completion from real account state', () => {
    const { steps, allDone } = buildOnboardingProgress({
      hasActiveProgram: true,
      programStateDefaults: { squat_one_rep_max: 140, bench_press_one_rep_max: null },
      completedSessions: 3,
    })
    expect(steps.map((step) => step.done)).toEqual([true, true, true])
    expect(allDone).toBe(true)
  })
})

describe('hasStrengthEstimate', () => {
  it('only counts positive *_one_rep_max values', () => {
    expect(hasStrengthEstimate({ squat_training_max: 120 })).toBe(false)
    expect(hasStrengthEstimate({ squat_one_rep_max: 0 })).toBe(false)
    expect(hasStrengthEstimate({ squat_one_rep_max: null })).toBe(false)
    expect(hasStrengthEstimate({ deadlift_one_rep_max: 200 })).toBe(true)
  })
})
