import { describe, expect, it, vi } from 'vitest'
import { getSessionSummary } from '@sheetless/data/session/summary'
import { makeStubCtx, type TestTables } from './support/supabase-stub'

function tables(): TestTables {
  return {
    workout_sessions: [{
      id: 'session-1', user_id: 'user-1', program_instance_id: 'program-1', status: 'completed',
      progression_receipt_recorded: true, state_version: 3, session_rpe: 8,
      notes: 'Kept notes', reflection_win: 'Good control', reflection_improve: null,
      completed_at: '2026-09-13T12:00:00Z', prs: [], return_recommendations: [{ recommendation: 'Keep effort moderate' }],
      prescription_snapshot: { id: 'planned-1', title: 'Saved workout', units: 'kg', movements: [{
        id: 'slot-1', slotId: 'slot-1', movementId: 'bench_press', movementName: 'Bench press',
        role: 'main', orderIndex: 0, sets: [],
      }] },
    }],
    exercise_logs: [{
      id: 'exercise-1', user_id: 'user-1', session_id: 'session-1', slot_id: 'slot-1',
      performed_movement_id: 'bench_press', role: 'main', order_index: 0,
    }],
    set_logs: [{
      id: 'set-1', user_id: 'user-1', exercise_log_id: 'exercise-1', set_index: 1,
      completed: true, actual_load: 80, actual_reps: 5, actual_rir: 2, is_top_set: true,
    }],
    progression_decisions: ['pending', 'accepted', 'dismissed', 'superseded'].map((status, index) => ({
      id: `decision-${index}`, user_id: 'user-1', session_id: 'session-1', program_instance_id: 'program-1',
      movement_id: 'bench_press', status, state_key: 'bench_working_load', state_type: 'working_load',
      rule_id: 'simple_linear_completion', scope: 'session', input_summary: 'Five reps completed',
      recommendation: 'Add 2.5 kg', previous_value: 80, recommended_value: 82.5,
      created_at: '2026-09-13T12:00:00Z', resolved_at: status === 'pending' ? null : '2026-09-13T12:01:00Z',
    })),
  }
}

describe('saved session summary', () => {
  it('reads exact session decisions in every status and preserves the saved workout details', async () => {
    const rows = tables()
    const decision = rows.progression_decisions[0]
    rows.progression_decisions.push(
      { ...decision, id: 'another-workout', session_id: 'session-2' },
      { ...decision, id: 'legacy-unlinked', session_id: null },
      { ...decision, id: 'another-account', user_id: 'user-2' },
    )
    const { ctx } = makeStubCtx(rows)
    const result = await getSessionSummary(ctx, 'session-1')
    expect(result.decisionReceiptAvailable).toBe(true)
    expect(result.decisions.map(({ status }) => status)).toEqual(['pending', 'accepted', 'dismissed', 'superseded'])
    expect(result.decisions[1]).toMatchObject({ previousValue: 80, recommendedValue: 82.5, resolvedAt: '2026-09-13T12:01:00Z' })
    expect(result).toMatchObject({ completedSets: 1, totalSets: 1, session: {
      title: 'Saved workout', notes: 'Kept notes', sessionRpe: 8, reflectionWin: 'Good control',
      returnRecommendations: [{ recommendation: 'Keep effort moderate' }],
    } })
    expect(result.topSets).toHaveLength(1)
  })

  it('distinguishes a legacy receipt from a new finish with no decisions', async () => {
    const rows = tables()
    rows.workout_sessions[0].progression_receipt_recorded = false
    const { ctx, stub } = makeStubCtx(rows)
    expect(await getSessionSummary(ctx, 'session-1')).toMatchObject({ decisionReceiptAvailable: false, decisions: [] })
    expect(stub.fromCalls).not.toContain('progression_decisions')
    rows.workout_sessions[0].progression_receipt_recorded = true
    rows.progression_decisions = []
    expect(await getSessionSummary(ctx, 'session-1')).toMatchObject({ decisionReceiptAvailable: true, decisions: [] })
  })

  it.each(['missing', 'foreign', 'active'])('rejects unavailable or unfinished workouts (%s)', async (kind) => {
    const rows = tables()
    if (kind === 'missing') rows.workout_sessions = []
    if (kind === 'foreign') rows.workout_sessions[0].user_id = 'user-2'
    if (kind === 'active') rows.workout_sessions[0].status = 'in_progress'
    const { ctx, stub } = makeStubCtx(rows)
    await expect(getSessionSummary(ctx, 'session-1')).rejects.toThrow(kind === 'active' ? 'Only completed workouts' : 'Workout unavailable')
    expect(stub.fromCalls).not.toContain('progression_decisions')
  })

  it('surfaces receipt read failures instead of claiming there were no decisions', async () => {
    const { ctx, stub } = makeStubCtx(tables())
    const originalFrom = stub.from.bind(stub)
    const failed = originalFrom('progression_decisions')
    vi.spyOn(failed, 'range').mockResolvedValue({ data: null, error: { message: 'Receipt unavailable' } })
    vi.spyOn(stub, 'from').mockImplementation((table) => table === 'progression_decisions' ? failed : originalFrom(table))
    await expect(getSessionSummary(ctx, 'session-1')).rejects.toThrow('Receipt unavailable')
  })
})
