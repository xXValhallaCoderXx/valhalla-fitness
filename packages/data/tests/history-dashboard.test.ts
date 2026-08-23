import { describe, expect, it } from 'vitest'
import { getHistoryDashboard } from '@sheetless/data/history/history'
import { makeStubCtx, type TestRow } from './support/supabase-stub'

function completedSessions(count: number): TestRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `session-${String(index).padStart(4, '0')}`,
    user_id: 'user-1',
    program_instance_id: null,
    planned_session_id: null,
    status: 'completed',
    completed_at: `2026-08-23T${String(index % 24).padStart(2, '0')}:00:00Z`,
    scheduled_date: '2026-08-23',
    prescription_snapshot: null,
    is_favorite: false,
    source_session_id: null,
  }))
}

function dashboardTables(count: number) {
  return {
    workout_sessions: completedSessions(count),
    exercise_logs: [],
    set_logs: [],
    substitution_logs: [],
    bodyweight_entries: [],
    profiles: [{ id: 'user-1', sex: null, timezone: 'UTC' }],
  }
}

describe('getHistoryDashboard bounds', () => {
  it('forwards an explicit limit to history pagination', async () => {
    const { ctx, stub } = makeStubCtx(dashboardTables(600))

    const result = await getHistoryDashboard(ctx, { limit: 240 })

    expect(result.overview.completedSessions).toBe(240)
    expect(stub.rangeCalls.filter((call) => call.table === 'workout_sessions')[0]).toEqual({
      table: 'workout_sessions',
      from: 0,
      to: 239,
    })
  })

  it('keeps the no-argument dashboard unbounded', async () => {
    const { ctx, stub } = makeStubCtx(dashboardTables(600))

    const result = await getHistoryDashboard(ctx)

    expect(result.overview.completedSessions).toBe(600)
    expect(stub.rangeCalls.filter((call) => call.table === 'workout_sessions').slice(0, 2)).toEqual([
      { table: 'workout_sessions', from: 0, to: 499 },
      { table: 'workout_sessions', from: 500, to: 999 },
    ])
  })
})
