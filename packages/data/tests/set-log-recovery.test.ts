import { beforeEach, describe, expect, it, vi } from 'vitest'
import { upsertSetLog } from '@sheetless/data/session/sets'
import { makeStubCtx } from './support/supabase-stub'

const reads = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@sheetless/data/session/reads', () => reads)

const input = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  exerciseLogId: '22222222-2222-4222-8222-222222222222',
  setIndex: 1, actualLoad: 82.5, actualReps: 6, actualRir: 1,
  completed: true, clientMutationId: 'correction', expectedStateVersion: 2,
}

beforeEach(() => vi.resetAllMocks())

describe('set save recovery', () => {
  it('reconciles a lost response before submitting corrected values against the current revision', async () => {
    const { ctx, stub } = makeStubCtx({})
    const corrected = { sessionId: input.sessionId, stateVersion: 4 }
    reads.getSession.mockResolvedValueOnce({ stateVersion: 3 }).mockResolvedValueOnce(corrected)
    expect(await upsertSetLog(ctx, { ...input, reconcileBeforeSave: true })).toBe(corrected)
    expect(stub.rpcCalls).toEqual([{
      fn: 'upsert_session_set_v2',
      args: {
        p_session_id: input.sessionId, p_exercise_log_id: input.exerciseLogId,
        p_set_index: 1, p_actual_load: 82.5, p_actual_reps: 6, p_actual_rir: 1,
        p_actual_rpe: null, p_completed: true, p_note: null,
        p_client_mutation_id: 'correction', p_expected_state_version: 3,
      },
    }])
    expect(reads.getSession).toHaveBeenCalledTimes(2)
  })

  it('does not attempt a correction when the recovery read fails', async () => {
    const { ctx, stub } = makeStubCtx({})
    reads.getSession.mockRejectedValue(new Error('Connection unavailable'))
    await expect(upsertSetLog(ctx, { ...input, reconcileBeforeSave: true })).rejects.toThrow('Connection unavailable')
    expect(stub.rpcCalls).toHaveLength(0)
  })

  it('surfaces a concurrent change after reconciliation without blindly retrying it', async () => {
    const { ctx, stub } = makeStubCtx({})
    reads.getSession.mockResolvedValue({ stateVersion: 3 })
    const rpc = vi.spyOn(stub, 'rpc').mockResolvedValue({ data: null, error: { message: 'CONFLICT' } } as never)
    await expect(upsertSetLog(ctx, { ...input, reconcileBeforeSave: true })).rejects.toThrow('CONFLICT')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(reads.getSession).toHaveBeenCalledTimes(1)
  })

  it('keeps ordinary saves on their supplied optimistic revision', async () => {
    const { ctx, stub } = makeStubCtx({})
    reads.getSession.mockResolvedValue({ stateVersion: 3 })
    await upsertSetLog(ctx, input)
    expect(stub.rpcCalls[0].args?.p_expected_state_version).toBe(2)
    expect(reads.getSession).toHaveBeenCalledTimes(1)
  })
})
