import { describe, expect, it } from 'vitest'
import { progressionKindLabel, reviewDecisionView } from '../src/domains/program/lib/progression-review'
import type { ProgressionDecision } from '../src/shared/types'

function decision(over: Partial<ProgressionDecision>): ProgressionDecision {
  return {
    id: 'd1',
    movementId: 'bench_press',
    movementName: 'Bench Press',
    ruleId: 'training_max_standard',
    scope: 'cycle',
    status: 'pending',
    inputSummary: 'Hit every target rep on the + set.',
    recommendation: 'Add load next time',
    rationale: 'You hit every target rep.',
    stateType: 'training_max',
    previousValue: 110,
    recommendedValue: 112.5,
    ...over,
  }
}

describe('reviewDecisionView', () => {
  it('builds a numeric Now → Next view', () => {
    expect(reviewDecisionView(decision({}), 'kg')).toMatchObject({
      name: 'Bench Press',
      kindLabel: 'Training max',
      isNumeric: true,
      currentLabel: '110 kg',
      nextLabel: '112.5 kg',
      deltaLabel: '+2.5 kg',
      delta: 2.5,
      reason: 'You hit every target rep.',
    })
  })

  it('formats a whole-number delta', () => {
    expect(reviewDecisionView(decision({ previousValue: 160, recommendedValue: 165 }), 'kg').deltaLabel).toBe('+5 kg')
  })

  it('falls back to the recommendation for a qualitative (no-numbers) decision', () => {
    const view = reviewDecisionView(
      decision({ previousValue: null, recommendedValue: null, rationale: null, recommendation: 'Add load next time', stateType: null }),
      'kg',
    )
    expect(view.isNumeric).toBe(false)
    expect(view.currentLabel).toBeNull()
    expect(view.deltaLabel).toBeNull()
    expect(view.kindLabel).toBeNull()
    expect(view.reason).toBe('Add load next time')
  })
})

describe('progressionKindLabel', () => {
  it('maps known state types and ignores the rest', () => {
    expect(progressionKindLabel('training_max')).toBe('Training max')
    expect(progressionKindLabel('working_load')).toBe('Working load')
    expect(progressionKindLabel('manual')).toBeNull()
    expect(progressionKindLabel(null)).toBeNull()
  })
})
