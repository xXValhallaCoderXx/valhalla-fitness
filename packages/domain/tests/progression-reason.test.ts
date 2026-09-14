import { describe, expect, it } from 'vitest'
import {
  progressionDeltaLabel,
  progressionRationale,
  progressionReasonClause,
} from '@sheetless/domain/program/progression-reason'
import type { ProgressionDecision } from '@sheetless/domain/program/types'

function decision(over: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return {
    id: 'd1',
    movementId: 'bench_press',
    movementName: 'Bench Press',
    stateKey: 'bench_press_training_max',
    stateType: 'training_max',
    ruleId: 'training_max_standard',
    scope: 'cycle',
    status: 'accepted',
    inputSummary: 'Bench Press cycle top sets evaluated as standard.',
    recommendation: 'Add load next cycle.',
    previousValue: 95,
    recommendedValue: 97.5,
    ...over,
  }
}

describe('progressionDeltaLabel', () => {
  it('names the direction and trims a trailing zero', () => {
    expect(progressionDeltaLabel(decision(), 'kg')).toBe('up 2.5 kg')
    expect(progressionDeltaLabel(decision({ previousValue: 160, recommendedValue: 165 }), 'kg')).toBe('up 5 kg')
    expect(progressionDeltaLabel(decision({ previousValue: 100, recommendedValue: 90 }), 'kg')).toBe('down 10 kg')
  })

  it('says held for a no-change decision', () => {
    expect(progressionDeltaLabel(decision({ recommendedValue: 95 }), 'kg')).toBe('held')
  })

  it('returns null when the decision carries no numbers', () => {
    expect(progressionDeltaLabel(decision({ previousValue: null, recommendedValue: null }), 'kg')).toBeNull()
    expect(progressionDeltaLabel(decision({ previousValue: null }), 'kg')).toBeNull()
  })
})

describe('progressionReasonClause', () => {
  it('builds the Today row reason for each training-max band', () => {
    expect(progressionReasonClause(decision(), 'kg')).toBe('up 2.5 kg — you got every rep last time')
    expect(
      progressionReasonClause(decision({ ruleId: 'training_max_double', recommendedValue: 102.5 }), 'kg'),
    ).toBe('up 7.5 kg — you beat the target with reps to spare')
    expect(progressionReasonClause(decision({ ruleId: 'training_max_hold', recommendedValue: 95 }), 'kg')).toBe(
      'held — your last set was very hard',
    )
    expect(
      progressionReasonClause(decision({ ruleId: 'training_max_reset', recommendedValue: 85.5 }), 'kg'),
    ).toBe("down 9.5 kg — the reps weren't there, so it rebuilds safely")
  })

  it('covers the linear and accessory rules', () => {
    expect(
      progressionReasonClause(decision({ ruleId: 'simple_linear_completion', stateType: 'working_load' }), 'kg'),
    ).toBe('up 2.5 kg — you completed every set')
    expect(
      progressionReasonClause(decision({ ruleId: 'accessory_double_progression' }), 'kg'),
    ).toBe('up 2.5 kg — you topped the rep range')
  })

  it('drops the delta rather than the reason when numbers are missing', () => {
    expect(
      progressionReasonClause(decision({ previousValue: null, recommendedValue: null }), 'kg'),
    ).toBe('You got every rep last time')
  })

  it('falls back to the delta alone for an unknown rule, and null when it has neither', () => {
    expect(progressionReasonClause(decision({ ruleId: 'some_future_rule' }), 'kg')).toBe('up 2.5 kg')
    expect(
      progressionReasonClause(
        decision({ ruleId: 'some_future_rule', previousValue: null, recommendedValue: null }),
        'kg',
      ),
    ).toBeNull()
  })

  it('omits the unit when none is given', () => {
    expect(progressionReasonClause(decision())).toBe('up 2.5 — you got every rep last time')
  })
})

describe('progressionRationale', () => {
  it('prefers a decision that still carries its own rationale', () => {
    expect(progressionRationale(decision({ rationale: 'You hit every target rep.' }))).toBe(
      'You hit every target rep.',
    )
  })

  it('re-derives the sentence a persisted row lost', () => {
    expect(progressionRationale(decision())).toBe(
      'You beat the target with good effort, so Sheetless progresses the lift.',
    )
  })

  it('falls through to the persisted summary for an unknown rule', () => {
    expect(progressionRationale(decision({ ruleId: 'some_future_rule' }))).toBe(
      'Bench Press cycle top sets evaluated as standard.',
    )
  })

  it('falls through to the recommendation when there is no summary either', () => {
    expect(progressionRationale(decision({ ruleId: 'some_future_rule', inputSummary: '' }))).toBe(
      'Add load next cycle.',
    )
  })
})
