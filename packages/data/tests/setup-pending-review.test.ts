import { describe, expect, it } from 'vitest'
import { getProgramSetupPendingReview } from '../src/program/setup-pending-review'
import { makeStubCtx } from './support/supabase-stub'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const decision = (n: number, program: number, owner = 'user-1') => ({
  id: id(n), user_id: owner, program_instance_id: id(program), status: 'pending',
  movement_id: 'squat', rule_id: 'rule', scope: 'session', input_summary: 'Saved workout',
  recommendation: 'Increase', previous_value: 100, recommended_value: 105,
})

describe('setup pending progression review', () => {
  it('groups only requested account decisions with the owning programme units', async () => {
    const { ctx } = makeStubCtx({
      progression_decisions: [decision(1, 10), decision(2, 20), decision(3, 10, 'user-2'), decision(4, 10)],
      program_instances: [
        { id: id(10), user_id: 'user-1', title: 'Older pounds plan', units: 'lb' },
        { id: id(20), user_id: 'user-1', title: 'Current kilograms plan', units: 'kg' },
      ],
    })
    const groups = await getProgramSetupPendingReview(ctx, [id(1), id(2), id(3)])
    expect(groups.map(group => ({ title: group.title, units: group.units, ids: group.decisions.map(row => row.id) }))).toEqual([
      { title: 'Older pounds plan', units: 'lb', ids: [id(1)] },
      { title: 'Current kilograms plan', units: 'kg', ids: [id(2)] },
    ])
  })

  it('omits decisions already resolved and returns empty without a request for an empty guard', async () => {
    const { ctx } = makeStubCtx({ progression_decisions: [{ ...decision(1, 10), status: 'dismissed' }] })
    expect(await getProgramSetupPendingReview(ctx, [id(1)])).toEqual([])
    expect(await getProgramSetupPendingReview(ctx, [])).toEqual([])
  })

  it.each([null, 'unknown'])('fails closed when source units are %s instead of guessing profile units', async (units) => {
    const { ctx } = makeStubCtx({ progression_decisions: [decision(1, 10)],
      program_instances: units === null ? [] : [{ id: id(10), user_id: 'user-1', title: 'Old plan', units }] })
    await expect(getProgramSetupPendingReview(ctx, [id(1)])).rejects.toThrow('units')
  })
})
