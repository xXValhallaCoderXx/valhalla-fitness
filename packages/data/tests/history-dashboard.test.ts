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
  it('loads full paginated bodyweight history and account units without workouts', async () => {
    const entries = Array.from({ length: 1200 }, (_, index) => ({
      id: `weight-${index}`, user_id: 'user-1',
      recorded_on: new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10), weight_kg: 80,
    }))
    const { ctx, stub } = makeStubCtx({
      ...dashboardTables(0), bodyweight_entries: entries,
      profiles: [{ id: 'user-1', sex: null, timezone: 'Asia/Singapore', units: 'lb' }],
    })
    const result = await getHistoryDashboard(ctx, { limit: 240 })
    expect(result.insights.units).toBeNull()
    expect(result.insights.bodyweight.units).toBe('lb')
    expect(result.insights.bodyweight.entries).toHaveLength(1200)
    expect(stub.rangeCalls.filter((call) => call.table === 'bodyweight_entries')).toHaveLength(3)
  })
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
