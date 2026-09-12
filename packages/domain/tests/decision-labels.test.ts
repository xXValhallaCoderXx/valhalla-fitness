import { describe, expect, it } from 'vitest'
import {
  decisionLabel,
  decisionScopeLabel,
  decisionSubject,
} from '../src/program/decision-labels'
import type { ProgressionDecision } from '../src/program/types'

const decision = (over: Partial<ProgressionDecision> = {}): ProgressionDecision => ({
  id: 'd1',
  movementId: 'bench_press',
  movementName: 'Bench Press',
  stateKey: 'bench_press_training_max',
  stateType: 'training_max',
  ruleId: 'training_max_standard',
  scope: 'cycle',
  status: 'pending',
  inputSummary: 'Top set 3 reps at RIR 2.',
  recommendation: 'Move the training max from 95 to 97.5.',
  rationale: 'You beat the target with good effort, so Sheetless progresses the lift.',
  previousValue: 95,
  recommendedValue: 97.5,
  ...over,
})

describe('decisionSubject', () => {
  it('names the state in Full and the lift in Guided', () => {
    expect(decisionSubject(decision(), 'full')).toBe('TM_bench_press')
    expect(decisionSubject(decision(), 'guided')).toBe('Bench Press')
  })

  // An accessory decision carries no state key; Full must fall back rather than render an empty id.
  it('falls back to the lift name when the decision has no state key', () => {
    const accessory = decision({ stateKey: null, stateType: null, movementName: 'Face Pull' })
    expect(decisionSubject(accessory, 'full')).toBe('Face Pull')
  })
})

describe('decisionScopeLabel', () => {
  it('says when it happens in Guided and names the scope in Full', () => {
    expect(decisionScopeLabel(decision({ scope: 'cycle' }), 'guided')).toBe('at the end of the cycle')
    expect(decisionScopeLabel(decision({ scope: 'cycle' }), 'full')).toBe('cycle scope')
    expect(decisionScopeLabel(decision({ scope: 'session' }), 'guided')).toBe('after this workout')
  })
})

describe('decisionLabel', () => {
  it('uses plainer verbs in Guided', () => {
    expect(decisionLabel('accept', 'guided')).toBe('Apply')
    expect(decisionLabel('accept', 'full')).toBe('Accept')
    expect(decisionLabel('dismiss', 'guided')).toBe('Leave it')
  })

  // The note exists because decisions have no session_id; it must say so in both modes.
  it('warns that a history review is programme-scoped in both modes', () => {
    for (const mode of ['guided', 'full'] as const) {
      expect(decisionLabel('programmeScopeNote', mode).length).toBeGreaterThan(0)
    }
    expect(decisionLabel('programmeScopeNote', 'guided')).not.toContain('instance')
  })
})
