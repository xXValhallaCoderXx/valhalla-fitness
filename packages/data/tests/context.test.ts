import { describe, expect, it } from 'vitest'
import { makeStubCtx } from './support/supabase-stub'

describe('data test stub', () => {
  it('resolves filtered, ordered, limited table reads', async () => {
    const { ctx } = makeStubCtx({
      workout_sessions: [
        { id: 'a', user_id: 'user-1', status: 'completed', started_at: '2026-08-01' },
        { id: 'b', user_id: 'user-1', status: 'in_progress', started_at: '2026-08-02' },
        { id: 'c', user_id: 'user-2', status: 'in_progress', started_at: '2026-08-03' },
      ],
    })

    const result = await ctx.supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', 'user-1')
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    expect(result.error).toBeNull()
    expect((result.data as { id: string }).id).toBe('b')
  })

  it('records rpc calls and returns queued results', async () => {
    const { ctx, stub } = makeStubCtx({})
    stub.rpcResults.set('start_session_v2', { id: 'session-1' })

    const args = {
      p_client_mutation_id: 'x',
      p_program_instance_id: 'program-1',
      p_planned_session_id: 'planned-1',
      p_scheduled_date: '2026-08-23',
      p_prescription_snapshot: {},
      p_expected_program_version: 3,
    }
    const result = await ctx.supabase.rpc('start_session_v2', args)

    expect(result.data).toEqual({ id: 'session-1' })
    expect(stub.rpcCalls).toEqual([{ fn: 'start_session_v2', args }])
  })

  it('scopes the stub user to the requested id', async () => {
    const { ctx } = makeStubCtx({}, 'user-9')
    const { data } = await ctx.supabase.auth.getUser()
    expect(data.user?.id).toBe('user-9')
    expect(ctx.user.id).toBe('user-9')
  })
})
