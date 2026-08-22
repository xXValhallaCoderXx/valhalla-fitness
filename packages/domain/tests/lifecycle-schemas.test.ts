import { describe, expect, it } from 'vitest'
import {
  finishSessionInputSchema,
  startAdHocSessionInputSchema,
  startSessionInputSchema,
  upsertSetLogInputSchema,
} from '@sheetless/domain/session/schemas'
import {
  resolveProgressionDecisionInputSchema,
  resolveProgressionDecisionsInputSchema,
  startProgramInputSchema,
} from '@sheetless/domain/program/schemas'

const sessionId = 'f93f3498-4d9c-4ec3-93ef-7520f8971c19'
const exerciseLogId = 'ffbe42d8-86d7-4714-88d5-8599fc5183d3'
const decisionId = 'e6612c5a-c40b-4883-8f9d-303745e82e2e'

describe('lifecycle input schemas', () => {
  it('requires stable non-empty request identifiers for session starts', () => {
    expect(startSessionInputSchema.parse({ clientMutationId: ' request-1 ' })).toEqual({
      clientMutationId: 'request-1',
    })
    expect(() => startSessionInputSchema.parse({ clientMutationId: '' })).toThrow()
    expect(() =>
      startAdHocSessionInputSchema.parse({
        clientMutationId: 'request-1',
        sourceSessionId: 'not-a-uuid',
      }),
    ).toThrow()
  })

  it('rejects cross-field set payloads outside database-safe bounds', () => {
    const valid = {
      sessionId,
      exerciseLogId,
      setIndex: 0,
      actualLoad: 100,
      actualReps: 5,
      actualRir: 2,
      actualRpe: 8,
      completed: true,
      note: null,
      clientMutationId: 'set-request-1',
      expectedStateVersion: 3,
    }
    expect(upsertSetLogInputSchema.parse(valid)).toEqual(valid)
    expect(() => upsertSetLogInputSchema.parse({ ...valid, actualLoad: -1 })).toThrow()
    expect(() => upsertSetLogInputSchema.parse({ ...valid, actualRir: 11 })).toThrow()
    expect(() => upsertSetLogInputSchema.parse({ ...valid, setIndex: 1.5 })).toThrow()
  })

  it('bounds finish reflections and effort', () => {
    expect(
      finishSessionInputSchema.parse({
        sessionId,
        requestId: 'finish-1',
        sessionRpe: 10,
        reflectionWin: 'Consistent setup',
      }),
    ).toMatchObject({ sessionId, requestId: 'finish-1', sessionRpe: 10 })
    expect(() => finishSessionInputSchema.parse({ sessionId, sessionRpe: 10 })).toThrow()
    expect(() => finishSessionInputSchema.parse({ sessionId, sessionRpe: 11 })).toThrow()
    expect(() => finishSessionInputSchema.parse({ sessionId: 'bad-id' })).toThrow()
  })

  it('validates programme customization and atomic decision batches', () => {
    expect(
      startProgramInputSchema.parse({
        requestId: 'programme-1',
        templateId: 'healthy-531-fsl',
        units: 'kg',
        rounding: 2.5,
        movementOverrides: [
          {
            slotId: 'bench-variation',
            phaseKey: 'base',
            role: 'variation',
            originalMovementId: 'incline_bench_press',
            replacementMovementId: 'dumbbell_bench_press',
          },
        ],
      }),
    ).toMatchObject({ requestId: 'programme-1', templateId: 'healthy-531-fsl' })
    expect(() =>
      startProgramInputSchema.parse({
        requestId: 'programme-2',
        templateId: 'healthy-531-fsl',
        rounding: 0,
      }),
    ).toThrow()
    expect(
      resolveProgressionDecisionsInputSchema.parse({
        decisionIds: [decisionId],
        action: 'accepted',
        requestId: 'decision-1',
      }),
    ).toEqual({
      decisionIds: [decisionId],
      action: 'accepted',
      requestId: 'decision-1',
    })
    expect(() =>
      resolveProgressionDecisionsInputSchema.parse({
        decisionIds: [],
        action: 'accepted',
        requestId: 'decision-2',
      }),
    ).toThrow()
    expect(() =>
      resolveProgressionDecisionsInputSchema.parse({
        decisionIds: [decisionId, decisionId],
        action: 'accepted',
        requestId: 'decision-3',
      }),
    ).toThrow()
    expect(() =>
      resolveProgressionDecisionInputSchema.parse({
        decisionId,
        action: 'pending',
        requestId: 'decision-4',
      }),
    ).toThrow()
    expect(() =>
      resolveProgressionDecisionInputSchema.parse({
        decisionId,
        action: 'accepted',
      }),
    ).toThrow()
  })
})
