import { describe, expect, it } from 'vitest'
import {
  resolveProgressionDecision,
  resolveProgressionDecisions,
} from '@sheetless/data/program/active-program'
import { makeStubCtx, type TestTables } from './support/supabase-stub'

const DECISION_ONE = 'e6612c5a-c40b-4883-8f9d-303745e82e2e'
const DECISION_TWO = '2abbbd57-ed12-448e-b471-784366193c0f'

function tables(): TestTables {
  return {
    progression_decisions: [
      {
        id: DECISION_ONE,
        user_id: 'user-1',
        program_instance_id: 'program-1',
        movement_id: 'bench_press',
        status: 'pending',
        created_at: '2026-08-24T00:00:00.000Z',
      },
      {
        id: DECISION_TWO,
        user_id: 'user-1',
        program_instance_id: 'program-1',
        movement_id: 'squat',
        status: 'pending',
        created_at: '2026-08-24T00:01:00.000Z',
      },
    ],
  }
}

describe('progression decision resolution', () => {
  it('rejects malformed or overposted single inputs before touching the database', async () => {
    const { ctx, stub } = makeStubCtx(tables())

    await expect(
      resolveProgressionDecision(ctx, {
        decisionId: DECISION_ONE,
        action: 'accepted',
        requestId: 'resolve-1',
        extra: true,
      } as never),
    ).rejects.toThrow()

    expect(stub.fromCalls).toEqual([])
    expect(stub.rpcCalls).toEqual([])
  })

  it('scopes a single resolution to the authenticated user', async () => {
    const { ctx, stub } = makeStubCtx(tables())

    await resolveProgressionDecision(ctx, {
      decisionId: DECISION_ONE,
      action: 'dismissed',
      requestId: 'resolve-2',
    })

    expect(stub.rpcCalls[0]).toEqual({
      fn: 'resolve_progression_decisions_v2',
      args: {
        p_decision_ids: [DECISION_ONE],
        p_action: 'dismissed',
        p_request_id: 'resolve-2',
      },
    })
  })

  it('does not resolve another user\'s decision', async () => {
    const { ctx, stub } = makeStubCtx(tables(), 'user-2')

    await expect(
      resolveProgressionDecision(ctx, {
        decisionId: DECISION_ONE,
        action: 'accepted',
        requestId: 'resolve-foreign',
      }),
    ).rejects.toThrow()

    expect(stub.rpcCalls).toEqual([])
  })

  it('checks that every bulk decision belongs to the authenticated user', async () => {
    const seeded = tables()
    seeded.progression_decisions![1]!.user_id = 'user-2'
    const { ctx, stub } = makeStubCtx(seeded)

    await expect(
      resolveProgressionDecisions(ctx, {
        decisionIds: [DECISION_ONE, DECISION_TWO],
        action: 'accepted',
        requestId: 'resolve-3',
      }),
    ).rejects.toThrow('Progression decision not found.')

    expect(stub.rpcCalls).toEqual([])
  })

  it('resolves an owned batch atomically with the supplied idempotency key', async () => {
    const { ctx, stub } = makeStubCtx(tables())

    await expect(
      resolveProgressionDecisions(ctx, {
        decisionIds: [DECISION_ONE, DECISION_TWO],
        action: 'accepted',
        requestId: 'resolve-4',
      }),
    ).resolves.toEqual([DECISION_ONE, DECISION_TWO])

    expect(stub.rpcCalls).toEqual([
      {
        fn: 'resolve_progression_decisions_v2',
        args: {
          p_decision_ids: [DECISION_ONE, DECISION_TWO],
          p_action: 'accepted',
          p_request_id: 'resolve-4',
        },
      },
    ])
  })
})
