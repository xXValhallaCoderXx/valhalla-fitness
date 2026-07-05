import { describe, expect, it } from 'vitest'
import type { ProgressionDecision } from '../src/shared/types'
import {
  FEEDBACK_ANSWERS,
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  buildDecisionFeedbackInput,
  decisionReasonOptions,
  menuCategoryOptions,
  normalizeFeedbackInput,
  postWorkoutAnswerOptions,
  postWorkoutReasonOptions,
  sessionFeedbackStorageKey,
} from '../src/domains/feedback/lib/feedback-options'

const decision: ProgressionDecision = {
  id: 'd1',
  movementId: 'squat',
  movementName: 'Squat',
  stateType: 'training_max',
  ruleId: 'training_max_standard',
  scope: 'cycle',
  status: 'pending',
  inputSummary: 'Squat cycle top sets evaluated as standard.',
  recommendation: 'Move TM from 190 to 195.',
  rationale: 'You beat the target with good effort, so Sheetless progresses the lift.',
  previousValue: 190,
  recommendedValue: 195,
}

describe('feedback option lists', () => {
  const lists = [
    ['postWorkoutReasonOptions', postWorkoutReasonOptions],
    ['decisionReasonOptions', decisionReasonOptions],
    ['menuCategoryOptions', menuCategoryOptions],
  ] as const

  it.each(lists)('%s only uses categories allowed by the DB CHECK', (_name, options) => {
    for (const option of options) {
      expect(FEEDBACK_CATEGORIES).toContain(option.value)
      expect(option.label.trim().length).toBeGreaterThan(0)
    }
  })

  it.each(lists)('%s has no duplicate values', (_name, options) => {
    const values = options.map((option) => option.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('postWorkoutAnswerOptions covers every allowed answer exactly once', () => {
    expect(postWorkoutAnswerOptions.map((option) => option.value)).toEqual([...FEEDBACK_ANSWERS])
  })
})

describe('normalizeFeedbackInput', () => {
  it('trims the message and converts blank strings to null', () => {
    const input = normalizeFeedbackInput({ source: 'menu', category: 'bug', message: '  broken button  ', route: '   ' })
    expect(input.message).toBe('broken button')
    expect(input.route).toBeNull()
  })

  it('caps overlong messages at FEEDBACK_MESSAGE_MAX', () => {
    const input = normalizeFeedbackInput({ source: 'menu', category: 'bug', message: 'x'.repeat(FEEDBACK_MESSAGE_MAX + 50) })
    expect(input.message).toHaveLength(FEEDBACK_MESSAGE_MAX)
  })

  it('accepts a bare "yes" post-workout answer', () => {
    const input = normalizeFeedbackInput({ source: 'post_workout', answer: 'yes' })
    expect(input).toMatchObject({ source: 'post_workout', answer: 'yes', category: null, message: null })
  })

  it('rejects unknown sources, answers, and categories', () => {
    expect(() => normalizeFeedbackInput({ source: 'carrier_pigeon' as never })).toThrow(/source/)
    expect(() => normalizeFeedbackInput({ source: 'post_workout', answer: 'maybe' as never })).toThrow(/answer/)
    expect(() => normalizeFeedbackInput({ source: 'menu', category: 'rant' as never })).toThrow(/category/)
  })

  it('rejects an answer outside the post-workout prompt', () => {
    expect(() => normalizeFeedbackInput({ source: 'menu', answer: 'yes', category: 'bug' })).toThrow(/post-workout/)
  })

  it('rejects submissions with no answer, category, or message', () => {
    expect(() => normalizeFeedbackInput({ source: 'menu', message: '   ' })).toThrow(/needs/)
  })
})

describe('buildDecisionFeedbackInput', () => {
  it('captures the decision id and the rule/values context in metadata', () => {
    const input = buildDecisionFeedbackInput(decision, {
      category: 'should_increase',
      message: 'Felt too easy',
      route: '/sessions/s1/summary',
      sessionId: 's1',
    })
    expect(input).toMatchObject({
      source: 'decision',
      category: 'should_increase',
      message: 'Felt too easy',
      route: '/sessions/s1/summary',
      sessionId: 's1',
      decisionId: 'd1',
    })
    expect(input.metadata).toMatchObject({
      ruleId: 'training_max_standard',
      movementId: 'squat',
      movementName: 'Squat',
      stateType: 'training_max',
      scope: 'cycle',
      decisionStatus: 'pending',
      previousValue: 190,
      recommendedValue: 195,
    })
  })

  it('omits absent numeric values instead of writing null noise', () => {
    const qualitative: ProgressionDecision = {
      ...decision,
      stateType: null,
      previousValue: null,
      recommendedValue: undefined,
    }
    const input = buildDecisionFeedbackInput(qualitative, { category: 'rule_unclear' })
    expect(input.metadata).not.toHaveProperty('previousValue')
    expect(input.metadata).not.toHaveProperty('recommendedValue')
    expect(input.metadata).not.toHaveProperty('stateType')
  })
})

describe('sessionFeedbackStorageKey', () => {
  it('namespaces the key per session', () => {
    expect(sessionFeedbackStorageKey('abc')).toBe('sheetless.feedback.session.abc')
  })
})
