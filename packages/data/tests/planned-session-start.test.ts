import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startSession } from '../src/session/lifecycle'
import { makeStubCtx } from './support/supabase-stub'

const reads = vi.hoisted(() => ({ today: vi.fn(), session: vi.fn() }))
vi.mock('../src/session/reads', () => ({ getToday: reads.today, getSession: reads.session }))
const programId = '00000000-0000-4000-8000-000000000101'
const otherProgramId = '00000000-0000-4000-8000-000000000102'
const sessionId = '00000000-0000-4000-8000-000000000103'
const workout = { sessionId, title: 'First workout' }
const today = { activeProgram: { id: programId, stateVersion: 4 }, activeSession: null, pendingDecisions: [],
  plannedSession: { id: 'week-1-day-1', scheduledDate: '2026-09-27' } }
const input = { clientMutationId: 'first-workout', expectedProgramId: programId }

beforeEach(() => {
  vi.resetAllMocks()
  reads.today.mockResolvedValue(today)
  reads.session.mockResolvedValue(workout)
})

describe('planned start bound to a setup receipt', () => {
  it('rejects a changed or ended active plan before calling the start RPC', async () => {
    const { ctx, stub } = makeStubCtx({})
    for (const activeProgram of [{ id: otherProgramId, stateVersion: 4 }, null]) {
      reads.today.mockResolvedValue({ ...today, activeProgram })
      await expect(startSession(ctx, input)).rejects.toThrow('active plan changed')
    }
    expect(stub.rpcCalls).toHaveLength(0)
  })

  it('pins the fresh programme ID and version through the existing atomic RPC', async () => {
    const { ctx, stub } = makeStubCtx({ workout_sessions: [{ id: sessionId, user_id: 'user-1', program_instance_id: programId }] })
    stub.rpcResults.set('start_session_v3', sessionId)
    expect(await startSession(ctx, input)).toEqual(workout)
    expect(stub.rpcCalls).toEqual([{ fn: 'start_session_v3', args: {
      p_client_mutation_id: input.clientMutationId, p_program_instance_id: programId, p_expected_program_version: 4,
      p_planned_session_id: today.plannedSession.id, p_scheduled_date: today.plannedSession.scheduledDate,
      p_prescription_snapshot: today.plannedSession, p_source_session_id: null,
    } }])
  })

  it.each([null, otherProgramId])('does not resume an already active unrelated workout (%s)', async (activeProgramId) => {
    const { ctx, stub } = makeStubCtx({ workout_sessions: [{ id: sessionId, user_id: 'user-1', program_instance_id: activeProgramId }] })
    reads.today.mockResolvedValue({ ...today, activeSession: workout })
    await expect(startSession(ctx, input)).rejects.toThrow('Another workout is now active')
    expect(stub.rpcCalls).toHaveLength(0)
  })

  it('rejects an unrelated workout that wins the start race after the fresh read', async () => {
    const { ctx, stub } = makeStubCtx({ workout_sessions: [{ id: sessionId, user_id: 'user-1', program_instance_id: null }] })
    stub.rpcResults.set('start_session_v3', sessionId)
    await expect(startSession(ctx, input)).rejects.toThrow('Another workout is now active')
    expect(reads.session).not.toHaveBeenCalled()
    expect(stub.updateCalls).toHaveLength(0)
  })

  it('fails closed when the returned workout identity cannot be checked', async () => {
    const { ctx, stub } = makeStubCtx({ workout_sessions: [{ id: sessionId, user_id: 'other-user', program_instance_id: programId }] })
    stub.rpcResults.set('start_session_v3', sessionId)
    await expect(startSession(ctx, input)).rejects.toThrow()
    expect(reads.session).not.toHaveBeenCalled()
  })

  it('preserves ordinary Today/Plan Resume behavior when no expected programme is supplied', async () => {
    const { ctx, stub } = makeStubCtx({})
    reads.today.mockResolvedValue({ ...today, activeSession: workout })
    expect(await startSession(ctx, { clientMutationId: input.clientMutationId })).toEqual(workout)
    expect(stub.fromCalls).toHaveLength(0)
    expect(stub.rpcCalls).toHaveLength(0)
  })

  it('validates programme identity before fetching any account data', async () => {
    const { ctx, stub } = makeStubCtx({})
    await expect(startSession(ctx, { ...input, expectedProgramId: 'invalid' })).rejects.toThrow()
    expect(reads.today).not.toHaveBeenCalled()
    expect(stub.rpcCalls).toHaveLength(0)
  })
})
