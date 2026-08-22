import { describe, expect, it } from 'vitest'
import {
  addAdHocExerciseInputSchema,
  addExerciseSetInputSchema,
  addSessionAccessoryInputSchema,
  removeSessionAccessoryInputSchema,
  renameSessionInputSchema,
  reorderSessionAccessoriesInputSchema,
  sessionExerciseInputSchema,
  sessionIdInputSchema,
  setSessionFavoriteInputSchema,
  substituteMovementInputSchema,
} from '../src/domains/session/lib/schemas'

const sessionId = 'f93f3498-4d9c-4ec3-93ef-7520f8971c19'
const exerciseLogId = 'ffbe42d8-86d7-4714-88d5-8599fc5183d3'
const expectedStateVersion = 3

describe('session ingress schemas', () => {
  it('requires strict UUID session identities', () => {
    expect(sessionIdInputSchema.parse({ sessionId })).toEqual({ sessionId })
    expect(() => sessionIdInputSchema.parse({ sessionId: 'not-a-uuid' })).toThrow()
    expect(() => sessionIdInputSchema.parse({ sessionId, unexpected: true })).toThrow()
  })

  it('normalizes and bounds ad-hoc session titles', () => {
    expect(renameSessionInputSchema.parse({
      sessionId,
      title: '  Push day  ',
      requestId: 'rename-1',
      expectedStateVersion,
    })).toEqual({
      sessionId,
      title: 'Push day',
      requestId: 'rename-1',
      expectedStateVersion,
    })
    expect(() =>
      renameSessionInputSchema.parse({
        sessionId,
        title: '   ',
        requestId: 'rename-1',
        expectedStateVersion,
      }),
    ).toThrow()
    expect(() =>
      renameSessionInputSchema.parse({
        sessionId,
        title: 'a'.repeat(61),
        requestId: 'rename-1',
        expectedStateVersion,
      }),
    ).toThrow()
  })

  it('accepts the accessory UI payload and rejects invalid transport values', () => {
    const valid = {
      sessionId,
      movementId: 'lat_pulldown',
      progressionMethod: 'double_progression',
      repTarget: '8-12',
      scope: 'phase_slot',
      note: '  Keep elbows tucked  ',
      clientMutationId: 'accessory-request-1',
      expectedStateVersion,
    }

    expect(addSessionAccessoryInputSchema.parse(valid)).toEqual({
      ...valid,
      note: 'Keep elbows tucked',
    })
    expect(() =>
      addSessionAccessoryInputSchema.parse({ ...valid, progressionMethod: 'linear_progression' }),
    ).toThrow()
    expect(() => addSessionAccessoryInputSchema.parse({ ...valid, repTarget: '0-12' })).toThrow()
    expect(() => addSessionAccessoryInputSchema.parse({ ...valid, scope: 'program' })).toThrow()
    expect(() => addSessionAccessoryInputSchema.parse({ ...valid, note: 'a'.repeat(2_001) })).toThrow()
    expect(() => addSessionAccessoryInputSchema.parse({ ...valid, clientMutationId: '' })).toThrow()
  })

  it('bounds and de-duplicates accessory reorder payloads', () => {
    expect(
      reorderSessionAccessoriesInputSchema.parse({
        sessionId,
        orderedSlotIds: ['slot-day-a-added-accessory-1-row', 'slot-day-a-added-accessory-2-curl'],
        requestId: 'reorder-1',
        expectedStateVersion,
      }),
    ).toEqual({
      sessionId,
      orderedSlotIds: ['slot-day-a-added-accessory-1-row', 'slot-day-a-added-accessory-2-curl'],
      requestId: 'reorder-1',
      expectedStateVersion,
    })
    expect(() =>
      reorderSessionAccessoriesInputSchema.parse({
        sessionId,
        orderedSlotIds: ['slot-1', 'slot-1'],
        requestId: 'reorder-1',
        expectedStateVersion,
      }),
    ).toThrow()
    expect(() =>
      reorderSessionAccessoriesInputSchema.parse({
        sessionId,
        orderedSlotIds: Array.from({ length: 201 }, (_, index) => `slot-${index}`),
        requestId: 'reorder-1',
        expectedStateVersion,
      }),
    ).toThrow()
  })

  it('distinguishes UUID database rows from stable movement and request IDs', () => {
    expect(
      addAdHocExerciseInputSchema.parse({
        sessionId,
        movementId: 'cable_crunch',
        clientMutationId: ' add-exercise-1 ',
        expectedStateVersion,
      }),
    ).toEqual({
      sessionId,
      movementId: 'cable_crunch',
      clientMutationId: 'add-exercise-1',
      expectedStateVersion,
    })
    expect(sessionExerciseInputSchema.parse({ sessionId, exerciseLogId })).toEqual({
      sessionId,
      exerciseLogId,
    })
    expect(addExerciseSetInputSchema.parse({
      sessionId,
      exerciseLogId,
      clientMutationId: 'set-1',
      expectedStateVersion,
    })).toEqual({
      sessionId,
      exerciseLogId,
      clientMutationId: 'set-1',
      expectedStateVersion,
    })
    expect(() =>
      sessionExerciseInputSchema.parse({ sessionId, exerciseLogId: 'cable_crunch' }),
    ).toThrow()
    expect(() =>
      addAdHocExerciseInputSchema.parse({
        sessionId,
        movementId: '',
        clientMutationId: 'add-1',
        expectedStateVersion,
      }),
    ).toThrow()
  })

  it('validates accessory removal scope and database IDs', () => {
    expect(removeSessionAccessoryInputSchema.parse({
      sessionId,
      exerciseLogId,
      scope: 'session',
      requestId: 'remove-accessory-1',
      expectedStateVersion,
    })).toEqual({
      sessionId,
      exerciseLogId,
      scope: 'session',
      requestId: 'remove-accessory-1',
      expectedStateVersion,
    })
    expect(() =>
      removeSessionAccessoryInputSchema.parse({
        sessionId,
        exerciseLogId,
        scope: 'future_program',
        requestId: 'remove-accessory-1',
        expectedStateVersion,
      }),
    ).toThrow()
    expect(() =>
      removeSessionAccessoryInputSchema.parse({
        sessionId,
        exerciseLogId: 'not-a-uuid',
        scope: 'session',
        requestId: 'remove-accessory-1',
        expectedStateVersion,
      }),
    ).toThrow()
  })

  it('validates substitution enums before a movement can be updated', () => {
    const valid = {
      sessionId,
      exerciseLogId,
      performedMovementId: 'dumbbell_bench_press',
      reason: 'equipment_missing',
      note: '  All racks occupied  ',
      scope: 'session',
      requestId: 'substitute-1',
      expectedStateVersion,
    }

    expect(substituteMovementInputSchema.parse(valid)).toEqual({
      ...valid,
      note: 'All racks occupied',
    })
    expect(() => substituteMovementInputSchema.parse({ ...valid, reason: 'unknown' })).toThrow()
    expect(() => substituteMovementInputSchema.parse({ ...valid, scope: 'program' })).toThrow()
    expect(() =>
      substituteMovementInputSchema.parse({ ...valid, performedMovementId: '' }),
    ).toThrow()
    expect(() => substituteMovementInputSchema.parse({ ...valid, note: 'a'.repeat(2_001) })).toThrow()
  })

  it('requires a bounded title before a favourite lineage can be changed', () => {
    expect(setSessionFavoriteInputSchema.parse({ sessionId, favorite: true, title: '  Push day  ' })).toEqual({
      sessionId,
      favorite: true,
      title: 'Push day',
    })
    expect(setSessionFavoriteInputSchema.parse({ sessionId, favorite: false })).toEqual({
      sessionId,
      favorite: false,
    })
    expect(() => setSessionFavoriteInputSchema.parse({ sessionId, favorite: true })).toThrow()
    expect(() => setSessionFavoriteInputSchema.parse({ sessionId, favorite: 'false' })).toThrow()
    expect(() =>
      setSessionFavoriteInputSchema.parse({ sessionId, favorite: true, title: 'a'.repeat(61) }),
    ).toThrow()
    expect(() =>
      setSessionFavoriteInputSchema.parse({ sessionId, favorite: false, unexpected: true }),
    ).toThrow()
  })
})
