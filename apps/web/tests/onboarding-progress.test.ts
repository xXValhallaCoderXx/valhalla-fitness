import { describe, expect, it } from 'vitest'
import { buildOnboardingProgress, hasAllStrengthEstimates } from '../src/domains/onboarding/onboarding-progress'

const ALL_FIVE_ESTIMATES = {
  squat_one_rep_max: 140,
  bench_press_one_rep_max: 100,
  deadlift_one_rep_max: 180,
  overhead_press_one_rep_max: 60,
  barbell_row_one_rep_max: 90,
}

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
      programStateDefaults: ALL_FIVE_ESTIMATES,
      completedSessions: 3,
    })
    expect(steps.map((step) => step.done)).toEqual([true, true, true])
    expect(allDone).toBe(true)
  })

  it('lists strength estimates first (a workout needs maxes before a plan)', () => {
    const { steps } = buildOnboardingProgress({
      hasActiveProgram: false,
      programStateDefaults: {},
      completedSessions: 0,
    })
    expect(steps.map((step) => step.id)).toEqual(['estimates', 'plan', 'firstWorkout'])
  })
})

describe('hasAllStrengthEstimates', () => {
  it('is true only when every main-lift 1RM is set', () => {
    expect(hasAllStrengthEstimates(ALL_FIVE_ESTIMATES)).toBe(true)
  })

  it('is false when any main lift is missing (a single value is not enough)', () => {
    expect(hasAllStrengthEstimates({ ...ALL_FIVE_ESTIMATES, barbell_row_one_rep_max: null })).toBe(false)
    expect(hasAllStrengthEstimates({ deadlift_one_rep_max: 200 })).toBe(false)
    expect(hasAllStrengthEstimates({})).toBe(false)
  })

  it('ignores non-positive values and non-1RM keys', () => {
    expect(hasAllStrengthEstimates({ ...ALL_FIVE_ESTIMATES, squat_one_rep_max: 0 })).toBe(false)
    expect(hasAllStrengthEstimates({ squat_training_max: 120 })).toBe(false)
  })
})
