import { describe, expect, it } from 'vitest'
import { submitFeedbackInputSchema } from '../src/domains/feedback/lib/schemas'
import { movementHistoryInputSchema } from '../src/domains/history/lib/schemas'
import {
  createDefaultCustomProgramBuilderInput,
  customProgramBuilderInputSchema,
} from '../src/domains/program/lib/custom-templates'
import { programSetupOptionsInputSchema } from '../src/domains/program/lib/schemas'

const sessionId = 'b20911b4-35c3-4aa5-81e0-cc8000c27254'
const decisionId = '2abbbd57-ed12-448e-b471-784366193c0f'

describe('feedback server ingress', () => {
  it('accepts the bounded payloads produced by feedback surfaces', () => {
    expect(
      submitFeedbackInputSchema.parse({
        source: 'decision',
        category: 'rule_unclear',
        message: 'Please explain the recommendation.',
        route: `/sessions/${sessionId}/summary`,
        sessionId,
        decisionId,
        metadata: {
          ruleId: 'training_max_standard',
          values: [100, 105],
          context: { status: 'pending' },
        },
      }),
    ).toMatchObject({
      source: 'decision',
      category: 'rule_unclear',
      sessionId,
      decisionId,
    })
  })

  it('rejects malformed ids, excess keys, non-JSON metadata, and oversized input', () => {
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'menu',
        category: 'bug',
        sessionId: 'not-a-uuid',
      }).success,
    ).toBe(false)
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'menu',
        category: 'bug',
        unexpected: true,
      }).success,
    ).toBe(false)
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'menu',
        category: 'bug',
        metadata: { invalid: undefined },
      }).success,
    ).toBe(false)
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'menu',
        category: 'bug',
        message: 'x'.repeat(2_001),
      }).success,
    ).toBe(false)
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'menu',
        category: 'bug',
        metadata: { detail: 'x'.repeat(16_001) },
      }).success,
    ).toBe(false)
  })

  it('enforces feedback source semantics and requires useful content', () => {
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'menu',
        answer: 'yes',
      }).success,
    ).toBe(false)
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'menu',
        message: '   ',
      }).success,
    ).toBe(false)
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'post_workout',
        answer: 'yes',
      }).success,
    ).toBe(false)
    expect(
      submitFeedbackInputSchema.safeParse({
        source: 'decision',
        category: 'rule_unclear',
      }).success,
    ).toBe(false)
  })
})

describe('programme server ingress', () => {
  it('accepts seeded and custom template identifiers', () => {
    expect(programSetupOptionsInputSchema.parse({ templateId: 'healthy-531-fsl' })).toEqual({
      templateId: 'healthy-531-fsl',
    })
    expect(
      programSetupOptionsInputSchema.parse({
        templateId: 'custom-ab12cd34-mabc123-strength-plan',
      }),
    ).toEqual({
      templateId: 'custom-ab12cd34-mabc123-strength-plan',
    })
  })

  it('rejects unsafe template filters and excess setup keys', () => {
    expect(
      programSetupOptionsInputSchema.safeParse({
        templateId: 'healthy-531-fsl,origin.eq.user_created',
      }).success,
    ).toBe(false)
    expect(
      programSetupOptionsInputSchema.safeParse({
        templateId: 'healthy-531-fsl',
        userId: sessionId,
      }).success,
    ).toBe(false)
  })

  it('accepts the complete custom-builder UI draft', () => {
    const draft = createDefaultCustomProgramBuilderInput({
      methodology: 'training_max_wave',
      daysPerWeek: 4,
    })

    expect(customProgramBuilderInputSchema.parse(draft)).toEqual(draft)
  })

  it('rejects coerced numbers, nested excess keys, unsafe ids, and mismatched day counts', () => {
    const draft = createDefaultCustomProgramBuilderInput({
      methodology: 'simple_linear',
      daysPerWeek: 3,
    })

    expect(
      customProgramBuilderInputSchema.safeParse({
        ...draft,
        daysPerWeek: '3',
      }).success,
    ).toBe(false)
    expect(
      customProgramBuilderInputSchema.safeParse({
        ...draft,
        sessions: [
          {
            ...draft.sessions[0],
            internalOnly: true,
          },
          ...draft.sessions.slice(1),
        ],
      }).success,
    ).toBe(false)
    expect(
      customProgramBuilderInputSchema.safeParse({
        ...draft,
        sessions: [
          {
            ...draft.sessions[0],
            mainMovementId: 'squat,role.eq.main',
          },
          ...draft.sessions.slice(1),
        ],
      }).success,
    ).toBe(false)
    expect(
      customProgramBuilderInputSchema.safeParse({
        ...draft,
        daysPerWeek: 2,
      }).success,
    ).toBe(false)
  })
})

describe('movement-history server ingress', () => {
  it('accepts current catalog movement identifiers', () => {
    expect(movementHistoryInputSchema.parse({ movementId: 'close_grip_bench_press' })).toEqual({
      movementId: 'close_grip_bench_press',
    })
  })

  it('blocks PostgREST filter syntax, oversized ids, and excess keys', () => {
    expect(
      movementHistoryInputSchema.safeParse({
        movementId: 'squat,completed.eq.true',
      }).success,
    ).toBe(false)
    expect(
      movementHistoryInputSchema.safeParse({
        movementId: 'x'.repeat(129),
      }).success,
    ).toBe(false)
    expect(
      movementHistoryInputSchema.safeParse({
        movementId: 'squat',
        userId: sessionId,
      }).success,
    ).toBe(false)
  })
})
