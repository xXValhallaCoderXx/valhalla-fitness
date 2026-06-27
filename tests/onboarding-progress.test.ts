import { describe, expect, it } from 'vitest'
import {
  ONBOARDING_SNOOZE_MS,
  buildOnboardingProgress,
  hasStrengthEstimate,
  isOnboardingSnoozed,
} from '../src/domains/onboarding/onboarding-progress'

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

describe('isOnboardingSnoozed', () => {
  const now = 1_700_000_000_000

  it('is false when no snooze is set', () => {
    expect(isOnboardingSnoozed(null, now)).toBe(false)
  })

  it('is true while the snooze is in the future', () => {
    expect(isOnboardingSnoozed(now + 1000, now)).toBe(true)
  })

  it('is false once the snooze has elapsed', () => {
    expect(isOnboardingSnoozed(now - 1000, now)).toBe(false)
  })

  it('ignores non-finite / zero timestamps', () => {
    expect(isOnboardingSnoozed(Number.NaN, now)).toBe(false)
    expect(isOnboardingSnoozed(0, now)).toBe(false)
  })

  it('snoozes for seven days', () => {
    expect(ONBOARDING_SNOOZE_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
