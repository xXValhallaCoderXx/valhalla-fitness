import { describe, expect, it } from 'vitest'
import {
  setParamsSchema,
  startPlannedSessionInputSchema,
  updateSetLogInputSchema,
} from '../src'

const uuid = '123e4567-e89b-42d3-a456-426614174000'

describe('mobile API contracts', () => {
  it('accepts valid planned starts and set patches', () => {
    expect(startPlannedSessionInputSchema.parse({ kind: 'planned', clientMutationId: uuid })).toEqual({
      kind: 'planned',
      clientMutationId: uuid,
    })
    expect(updateSetLogInputSchema.parse({
      actualLoad: 100,
      actualReps: 5,
      actualRir: 2,
      actualRpe: null,
      note: null,
      completed: true,
      clientMutationId: uuid,
    })).toMatchObject({ completed: true, actualRir: 2 })
  })

  it('rejects malformed IDs, invalid effort, negative values, and zero set indexes', () => {
    expect(startPlannedSessionInputSchema.safeParse({ kind: 'planned', clientMutationId: 'nope' }).success).toBe(false)
    expect(updateSetLogInputSchema.safeParse({ completed: true, actualLoad: -1, clientMutationId: uuid }).success).toBe(false)
    expect(updateSetLogInputSchema.safeParse({ completed: true, actualRir: 11, clientMutationId: uuid }).success).toBe(false)
    expect(setParamsSchema.safeParse({ sessionId: uuid, exerciseLogId: uuid, setIndex: '0' }).success).toBe(false)
  })
})
