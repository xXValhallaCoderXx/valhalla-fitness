import { describe, expect, it } from 'vitest'
import {
  SETUP_STEPS,
  adjacentSetupStep,
  blockerForStep,
  continueToLabel,
  setupStepBlockers,
  setupStepLabel,
  setupStepPosition,
} from '../src/program/setup-steps'
import type { ProgramStateInput } from '../src/program/types'

const state = (over: Partial<ProgramStateInput> = {}): ProgramStateInput => ({
  key: 'squat_training_max',
  movementId: 'squat',
  type: 'training_max',
  value: 130,
  ...over,
})

describe('setup step machine', () => {
  it('walks forwards and stops at both ends', () => {
    expect(SETUP_STEPS).toEqual(['numbers', 'equipment', 'schedule', 'review'])
    expect(adjacentSetupStep('numbers', 'previous')).toBeNull()
    expect(adjacentSetupStep('numbers', 'next')).toBe('equipment')
    expect(adjacentSetupStep('review', 'next')).toBeNull()
    expect(setupStepPosition('schedule')).toBe(3)
  })

  it('labels the forward button by where it goes, and drops it on the last step', () => {
    expect(continueToLabel('numbers')).toBe('Continue to equipment')
    expect(continueToLabel('schedule')).toBe('Continue to review')
    // The last step's action is Start, not Continue.
    expect(continueToLabel('review')).toBeNull()
  })

  // Full is setting a training max; Guided is setting a starting weight. The rail must not
  // promise a word the step body never uses.
  it('renames only the step whose vocabulary actually differs', () => {
    expect(setupStepLabel('numbers', 'guided')).toBe('Starting weights')
    expect(setupStepLabel('numbers', 'full')).toBe('Starting numbers')
    expect(setupStepLabel('schedule', 'guided')).toBe(setupStepLabel('schedule', 'full'))
  })
})

describe('setupStepBlockers', () => {
  it('does not block when every required value is set', () => {
    expect(setupStepBlockers({ missingRequiredState: [] })).toEqual([])
  })

  // A bare boolean would leave the button dead with nothing to act on.
  it('names the lifts that are missing rather than returning a flag', () => {
    const blockers = setupStepBlockers({
      missingRequiredState: [state({ value: null }), state({ key: 'bench_press_training_max', movementId: 'bench_press', value: null })],
    })
    expect(blockers).toHaveLength(1)
    expect(blockers[0].step).toBe('numbers')
    expect(blockers[0].message).toContain('Squat')
    expect(blockers[0].message).toContain('Bench Press')
  })

  it('reports the blocker against the step that can fix it', () => {
    const blockers = setupStepBlockers({ missingRequiredState: [state({ value: null })] })
    expect(blockerForStep(blockers, 'numbers')).not.toBeNull()
    expect(blockerForStep(blockers, 'review')).toBeNull()
  })
})
