import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deleteBodyweightEntry,
  getBodyweightEntries,
  logBodyweight,
} from '@sheetless/data/account/bodyweight'
import { makeStubCtx } from './support/supabase-stub'

const entryId = '87f3f0e0-1f6e-4d4f-9c7c-4d88792f3a6e'

afterEach(() => {
  vi.useRealTimers()
})

describe('getBodyweightEntries', () => {
  it('returns the current account entries oldest first', async () => {
    const { ctx } = makeStubCtx({
      bodyweight_entries: [
        { id: crypto.randomUUID(), user_id: 'user-1', recorded_on: '2026-08-24', weight_kg: '81.2' },
        { id: crypto.randomUUID(), user_id: 'user-2', recorded_on: '2026-08-20', weight_kg: 70 },
        { id: entryId, user_id: 'user-1', recorded_on: '2026-08-22', weight_kg: 80 },
      ],
    })

    await expect(getBodyweightEntries(ctx)).resolves.toEqual([
      { id: entryId, recordedOn: '2026-08-22', weightKg: 80 },
      { id: expect.any(String), recordedOn: '2026-08-24', weightKg: 81.2 },
    ])
  })
})

describe('logBodyweight', () => {
  it('uses the profile timezone, stores canonical kg, and replaces the same calendar day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T16:30:00.000Z'))
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', timezone: 'Asia/Singapore' }],
      bodyweight_entries: [{
        id: entryId,
        user_id: 'user-1',
        recorded_on: '2026-08-24',
        weight_kg: 90,
      }],
    })

    const entry = await logBodyweight(ctx, { weight: 220, unit: 'lb' })

    expect(entry).toMatchObject({ id: entryId, recordedOn: '2026-08-24' })
    expect(entry.weightKg).toBeCloseTo(99.79, 2)
    expect(stub.upsertCalls).toEqual([{
      table: 'bodyweight_entries',
      rows: [{
        user_id: 'user-1',
        recorded_on: '2026-08-24',
        weight_kg: expect.closeTo(99.79, 2),
      }],
      options: { onConflict: 'user_id,recorded_on' },
    }])
    expect(stub.tables.bodyweight_entries).toHaveLength(1)
  })

  it('rejects malformed or over-posted input before querying the database', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [], bodyweight_entries: [] })

    await expect(logBodyweight(ctx, { weight: 0, unit: 'kg' })).rejects.toThrow()
    await expect(logBodyweight(ctx, {
      weight: 80,
      unit: 'kg',
      userId: 'another-user',
    } as never)).rejects.toThrow()
    expect(stub.fromCalls).toHaveLength(0)
  })
})

describe('deleteBodyweightEntry', () => {
  it('deletes only the requested entry owned by the current account', async () => {
    const otherEntryId = 'a0921b2a-2984-4269-a426-8b078bf2b64c'
    const { ctx, stub } = makeStubCtx({
      bodyweight_entries: [
        { id: entryId, user_id: 'user-1', recorded_on: '2026-08-22', weight_kg: 80 },
        { id: otherEntryId, user_id: 'user-2', recorded_on: '2026-08-22', weight_kg: 75 },
      ],
    })

    await expect(deleteBodyweightEntry(ctx, { id: entryId })).resolves.toEqual({ ok: true })
    expect(stub.tables.bodyweight_entries).toEqual([
      { id: otherEntryId, user_id: 'user-2', recorded_on: '2026-08-22', weight_kg: 75 },
    ])
  })

  it('rejects malformed and over-posted input before querying the database', async () => {
    const { ctx, stub } = makeStubCtx({ bodyweight_entries: [] })

    await expect(deleteBodyweightEntry(ctx, { id: 'not-a-uuid' })).rejects.toThrow()
    await expect(deleteBodyweightEntry(ctx, { id: entryId, userId: 'another-user' } as never)).rejects.toThrow()
    expect(stub.fromCalls).toHaveLength(0)
  })
})
