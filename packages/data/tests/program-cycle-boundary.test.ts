import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getCycleReview, getPendingCycleBoundary, getSessionCycleBoundary, repeatProgramCycle } from '../src/program/cycle-boundary'
import { getToday } from '../src/session/reads'
import { startSession } from '../src/session/lifecycle'
import { makeStubCtx } from './support/supabase-stub'

const api = vi.hoisted(() => ({ active: vi.fn(), pending: vi.fn(), accepted: vi.fn(), advance: vi.fn() }))
vi.mock('../src/program/active-program', () => ({ getActiveProgram: api.active, getPendingDecisions: api.pending,
  getAcceptedDecisions: api.accepted, updateProgramCurrentWeekIndex: api.advance }))
const user = '00000000-0000-4000-8000-000000005801'
const programId = '00000000-0000-4000-8000-000000005811'
const boundaryId = '00000000-0000-4000-8000-000000005821'
const sessionId = '00000000-0000-4000-8000-000000005831'
const row = { id: boundaryId, user_id: user, program_instance_id: programId, session_id: sessionId,
  template_version_id: '00000000-0000-4000-8000-000000005841', cycle_number: 1, next_session_index: 16,
  completed_at: '2026-09-28T00:00:00Z', status: 'pending', resolved_at: null }
const input = { programId, boundaryId, expectedVersion: 8, requestId: 'repeat-intent', expectedUserId: user }
const receipt = { programId, boundaryId, stateVersion: 9, nextSessionIndex: 16, repeatedAt: '2026-09-28T00:00:00Z' }

beforeEach(() => { vi.clearAllMocks(); api.pending.mockResolvedValue([]); api.accepted.mockResolvedValue([]) })
describe('saved cycle decisions', () => {
  it('reads only the requested account, program and exact finish receipt', async () => {
    const { ctx } = makeStubCtx({ program_cycle_boundaries: [row, { ...row, user_id: 'foreign', id: 'foreign' }] }, user)
    expect(await getPendingCycleBoundary(ctx, programId)).toMatchObject({ id: boundaryId, sessionId, status: 'pending' })
    expect(await getSessionCycleBoundary(ctx, sessionId)).toMatchObject({ id: boundaryId })
    expect(await getSessionCycleBoundary(ctx, 'unrelated')).toBeNull()
  })
  it('does not offer actions for a historical or replaced boundary', async () => {
    const { ctx } = makeStubCtx({}, user)
    api.active.mockResolvedValue({ id: 'replacement' })
    expect(await getCycleReview(ctx, { programId, boundaryId })).toBeNull()
    api.active.mockResolvedValue({ id: programId, cycleBoundary: { id: 'later-cycle' } })
    expect(await getCycleReview(ctx, { programId, boundaryId })).toBeNull()
  })
  it('returns pending progression and any active workout in a fresh review', async () => {
    const { ctx } = makeStubCtx({ workout_sessions: [{ id: sessionId, user_id: user, status: 'in_progress' }] }, user)
    api.active.mockResolvedValue({ id: programId, cycleBoundary: { id: boundaryId } })
    api.pending.mockResolvedValue([{ id: 'pending' }])
    expect(await getCycleReview(ctx, { programId, boundaryId })).toMatchObject({ pendingDecisions: [{ id: 'pending' }], activeSessionId: sessionId })
  })
  it('binds account and version and replays the same intent without client writes', async () => {
    const { ctx, stub } = makeStubCtx({}, user)
    stub.rpcResults.set('repeat_program_cycle_v1', receipt)
    expect(await repeatProgramCycle(ctx, input)).toEqual(receipt)
    expect(await repeatProgramCycle(ctx, input)).toEqual(receipt)
    expect(stub.rpcCalls).toEqual([0,1].map(() => ({ fn: 'repeat_program_cycle_v1', args: {
      p_program_id: programId, p_boundary_id: boundaryId, p_expected_version: 8, p_request_id: 'repeat-intent', p_expected_user_id: user,
    } })))
    await expect(repeatProgramCycle(ctx, { ...input, expectedUserId: '00000000-0000-4000-8000-000000005802' })).rejects.toThrow('ACCOUNT_CHANGED')
    expect(stub.rpcCalls).toHaveLength(2)
    expect(stub.updateCalls).toHaveLength(0)
  })
  it.each([null, {}, { ...receipt, boundaryId: sessionId }, { ...receipt, programId: sessionId }, { ...receipt, stateVersion: 99 }])('rejects an unproven receipt %j', async result => {
    const { ctx, stub } = makeStubCtx({}, user)
    stub.rpcResults.set('repeat_program_cycle_v1', result)
    await expect(repeatProgramCycle(ctx, input)).rejects.toThrow()
  })
  it('Today exposes a current plan with no next workout and performs no cursor recovery while waiting', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [{ id: user, timezone: 'UTC', units: 'kg' }] }, user)
    const boundary = await getPendingCycleBoundary(makeStubCtx({ program_cycle_boundaries: [row] }, user).ctx, programId)
    api.active.mockResolvedValue({ id: programId, currentWeekIndex: 16, cycleBoundary: boundary, templateDefinition: {} })
    const today = await getToday(ctx)
    expect(today).toMatchObject({ plannedSession: null, activeProgram: { id: programId }, cycleBoundary: { id: boundaryId } })
    expect(api.advance).not.toHaveBeenCalled()
    await expect(startSession(ctx, { clientMutationId: 'attempt' })).rejects.toThrow('Your cycle is complete')
    expect(stub.rpcCalls).toHaveLength(0)
  })
})
