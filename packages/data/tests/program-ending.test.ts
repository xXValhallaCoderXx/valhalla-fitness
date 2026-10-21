import { describe, expect, it, vi } from 'vitest'
import { endProgram, getLastEndedProgram, getProgramEndState } from '../src/program/ending'
import { makeStubCtx } from './support/supabase-stub'

const id = '00000000-0000-4000-8000-000000000001'
const receipt = { programId: id, stateVersion: 5, endedAt: '2026-09-27T12:00:00+00:00' }
const program = { id, user_id: 'user-1', title: 'My plan', status: 'active', state_version: 4 }

describe('manual plan ending data boundary', () => {
  it('checks only this account and this plan for blocking work', async () => {
    const { ctx, stub } = makeStubCtx({ program_instances: [program], workout_sessions: [
      { id: 'blank', user_id: 'user-1', program_instance_id: null, status: 'in_progress' },
      { id: 'foreign', user_id: 'user-2', program_instance_id: id, status: 'in_progress' },
    ], progression_decisions: [{ id: 'foreign', user_id: 'user-2', program_instance_id: id, status: 'pending' }] })
    expect(await getProgramEndState(ctx, id)).toEqual({ id, title: 'My plan', status: 'active', stateVersion: 4, activeSessionId: null, hasPendingDecisions: false })
    stub.tables.workout_sessions.push({ id: 'active', user_id: 'user-1', program_instance_id: id, status: 'in_progress' })
    stub.tables.progression_decisions.push({ id: 'pending', user_id: 'user-1', program_instance_id: id, status: 'pending' })
    expect(await getProgramEndState(ctx, id)).toMatchObject({ activeSessionId: 'active', hasPendingDecisions: true })
  })

  it('reads the latest explicitly ended plan, excluding replacements and other accounts', async () => {
    const { ctx } = makeStubCtx({ program_instances: [
      { ...program, status: 'completed', end_reason: 'manual', ended_at: '2026-09-25T12:00:00Z', units: 'lb' },
      { ...program, id: 'old', status: 'completed', end_reason: 'manual', ended_at: '2026-09-20T12:00:00Z', units: 'kg' },
      { ...program, id: 'replacement', status: 'archived', end_reason: null, ended_at: '2026-09-27T12:00:00Z' },
      { ...program, id: 'other', user_id: 'user-2', status: 'completed', end_reason: 'manual', ended_at: '2026-09-27T12:00:00Z' },
    ] })
    expect(await getLastEndedProgram(ctx)).toEqual({ id, title: 'My plan', endedAt: '2026-09-25T12:00:00Z', units: 'lb' })
  })

  it('fails closed when the plan is unavailable', async () => {
    const { ctx } = makeStubCtx({ program_instances: [{ ...program, user_id: 'user-2' }] })
    await expect(getProgramEndState(ctx, id)).rejects.toThrow()
  })

  it('validates before calling the guarded RPC and sends the exact version and request on retry', async () => {
    const { ctx, stub } = makeStubCtx({})
    const input = { programId: id, expectedVersion: 4, requestId: 'end-intent' }
    await expect(endProgram(ctx, { ...input, expectedVersion: -1 })).rejects.toThrow()
    expect(stub.rpcCalls).toHaveLength(0)
    stub.rpcResults.set('end_program_v1', receipt)
    expect(await endProgram(ctx, input)).toEqual(receipt)
    expect(await endProgram(ctx, input)).toEqual(receipt)
    expect(stub.rpcCalls).toEqual([0, 1].map(() => ({ fn: 'end_program_v1', args: {
      p_program_id: id, p_expected_version: 4, p_request_id: 'end-intent',
    } })))
    expect(stub.updateCalls).toHaveLength(0)
  })

  it.each([null, {}, { ...receipt, endedAt: 'not-a-time' },
    { ...receipt, programId: '00000000-0000-4000-8000-000000000002' },
    { ...receipt, stateVersion: 6 },
  ])('requires a matching authoritative receipt rather than treating %j as success', async (response) => {
    const { ctx, stub } = makeStubCtx({})
    stub.rpcResults.set('end_program_v1', response)
    await expect(endProgram(ctx, { programId: id, expectedVersion: 4, requestId: 'end-intent' })).rejects.toThrow()
  })

  it('propagates a server conflict without treating the plan as ended', async () => {
    const { ctx, stub } = makeStubCtx({})
    vi.spyOn(stub, 'rpc').mockRejectedValueOnce(new Error('PROGRAM_END_PENDING_REVIEW'))
    await expect(endProgram(ctx, { programId: id, expectedVersion: 4, requestId: 'end-intent' })).rejects.toThrow('PROGRAM_END_PENDING_REVIEW')
  })
})
