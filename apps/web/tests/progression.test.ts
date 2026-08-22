import { describe, expect, it } from 'vitest'
import {
  e1rm,
  evaluateAccessoryDoubleProgression,
  evaluatePlusSetWave,
  evaluateTrainingMaxBand,
  computeTrainingMaxWaveSets,
  mround,
} from '../src/domains/program/lib/progression'

describe('progression engine', () => {
  it('rounds to the configured increment', () => {
    expect(mround(162.25, 2.5)).toBe(162.5)
    expect(mround(167, 5)).toBe(165)
  })

  it('estimates 1RM with reps in reserve', () => {
    expect(Math.round(e1rm(180, 3, 2))).toBe(210)
  })

  it('generates training-max wave week weights', () => {
    const week1 = computeTrainingMaxWaveSets(190, 0, 2.5)
    expect(week1.slice(0, 3).map((set) => [set.targetLoad, set.targetReps, set.isAmrap])).toEqual([
      [122.5, 5, false],
      [142.5, 5, false],
      [162.5, 5, true],
    ])
    expect(week1.filter((set) => set.isBackoff)).toHaveLength(5)
    expect(week1.filter((set) => set.isBackoff).every((set) => set.targetLoad === 122.5)).toBe(true)
  })

  it('evaluates training-max bands', () => {
    expect(
      evaluateTrainingMaxBand([{ actualReps: 4, actualRir: 2, targetReps: 5 }], 190, 2.5, 'deadlift', 'deadlift_training_max')
        .ruleId,
    ).toBe('training_max_reset')
    expect(
      evaluateTrainingMaxBand([{ actualReps: 5, actualRir: 1, targetReps: 5 }], 190, 2.5, 'deadlift', 'deadlift_training_max')
        .ruleId,
    ).toBe('training_max_hold')
    expect(
      evaluateTrainingMaxBand([{ actualReps: 5, actualRir: 2, targetReps: 5 }], 190, 2.5, 'deadlift', 'deadlift_training_max')
        .recommendedValue,
    ).toBe(195)
    expect(
      evaluateTrainingMaxBand([{ actualReps: 7, actualRir: 2, targetReps: 5 }], 190, 2.5, 'deadlift', 'deadlift_training_max')
        .recommendedValue,
    ).toBe(197.5)
  })

  it('evaluates plus-set wave jumps', () => {
    const decision = evaluatePlusSetWave({ actualReps: 9, actualRir: 2 }, 6, 200, 2.5, 'squat', 'squat_training_max')
    expect(decision.recommendedValue).toBe(205)
    expect(decision.ruleId).toBe('plus_set_wave')
    expect(decision.inputSummary).toContain('9 reps at RIR 2')
    expect(decision.recommendation).toContain('3 extra reps')
  })

  it('keeps plus-set wave load unchanged when RIR is high but no extra reps were logged', () => {
    const decision = evaluatePlusSetWave({ actualReps: 6, actualRir: 4 }, 6, 200, 2.5, 'squat', 'squat_training_max')
    expect(decision.recommendedValue).toBe(200)
    expect(decision.inputSummary).toContain('6 reps at RIR 4')
    expect(decision.recommendation).toContain('no extra reps')
  })

  it('evaluates accessory double progression', () => {
    expect(
      evaluateAccessoryDoubleProgression(
        [
          { actualReps: 12, actualRir: 2 },
          { actualReps: 12, actualRir: 3 },
        ],
        8,
        12,
        2,
      ),
    ).toBe('Add load next time')
    expect(
      evaluateAccessoryDoubleProgression([{ actualReps: 7, actualRir: 2 }], 8, 12, 2),
    ).toBe('Repeat or reduce conservatively')
  })
})
