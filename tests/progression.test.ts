import { describe, expect, it } from 'vitest'
import {
  compute531FslSets,
  e1rm,
  evaluate531TmBand,
  evaluateAccessoryDoubleProgression,
  evaluateBullmastiffPlusSet,
  mround,
} from '../src/lib/progression'

describe('progression engine', () => {
  it('rounds to the configured increment', () => {
    expect(mround(162.25, 2.5)).toBe(162.5)
    expect(mround(167, 5)).toBe(165)
  })

  it('estimates 1RM with reps in reserve', () => {
    expect(Math.round(e1rm(180, 3, 2))).toBe(210)
  })

  it('generates 5/3/1 FSL week weights', () => {
    const week1 = compute531FslSets(190, 0, 2.5)
    expect(week1.slice(0, 3).map((set) => [set.targetLoad, set.targetReps, set.isAmrap])).toEqual([
      [122.5, 5, false],
      [142.5, 5, false],
      [162.5, 5, true],
    ])
    expect(week1.filter((set) => set.isBackoff)).toHaveLength(5)
    expect(week1.filter((set) => set.isBackoff).every((set) => set.targetLoad === 122.5)).toBe(true)
  })

  it('evaluates 5/3/1 TM bands', () => {
    expect(
      evaluate531TmBand([{ actualReps: 4, actualRir: 2, targetReps: 5 }], 190, 2.5, 'deadlift')
        .ruleId,
    ).toBe('healthy_531_tm_reset')
    expect(
      evaluate531TmBand([{ actualReps: 5, actualRir: 1, targetReps: 5 }], 190, 2.5, 'deadlift')
        .ruleId,
    ).toBe('healthy_531_tm_hold')
    expect(
      evaluate531TmBand([{ actualReps: 5, actualRir: 2, targetReps: 5 }], 190, 2.5, 'deadlift')
        .recommendedAnchor,
    ).toBe(195)
    expect(
      evaluate531TmBand([{ actualReps: 7, actualRir: 2, targetReps: 5 }], 190, 2.5, 'deadlift')
        .recommendedAnchor,
    ).toBe(197.5)
  })

  it('evaluates Bullmastiff plus-set jumps', () => {
    const decision = evaluateBullmastiffPlusSet({ actualReps: 9 }, 6, 200, 2.5, 'squat')
    expect(decision.recommendedAnchor).toBe(205)
    expect(decision.inputSummary).toContain('9 reps')
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
