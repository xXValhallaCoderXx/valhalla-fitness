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
  it.each([
    ['2026-08-22T23:14:30Z', 46],
    [null, null],
    [undefined, null],
    ['not-a-date', null],
    ['2026-08-23T00:00:00Z', null],
    ['2026-08-23T00:01:00Z', null],
  ])('maps recorded start %s into measured duration %s', async (startedAt, durationMinutes) => {
    const tables = dashboardTables(1)
    tables.workout_sessions[0].started_at = startedAt
    const { ctx } = makeStubCtx(tables)

    const result = await getHistoryDashboard(ctx)

    expect(result.recentSessions[0]).toMatchObject({ durationMinutes, tonnage: 0 })
  })

  it('maps numeric loads and counts only completed work in the ledger tonnage', async () => {
    const tables = dashboardTables(1)
    tables.workout_sessions[0].prescription_snapshot = { units: 'kg', movements: [] }
    const { ctx } = makeStubCtx({
      ...tables,
      exercise_logs: [{
        id: 'exercise-1', user_id: 'user-1', session_id: 'session-0000',
        performed_movement_id: 'barbell-bench-press', role: 'main', order_index: 0,
      }],
      set_logs: [
        { actual_load: '100.5', actual_reps: 5, completed: true },
        { actual_load: '80', actual_reps: 10, completed: false },
        { actual_load: null, actual_reps: 10, completed: true },
      ].map((set, index) => ({
        ...set, id: `set-${index}`, exercise_log_id: 'exercise-1',
        user_id: 'user-1', set_index: index,
      })),
    })

    const result = await getHistoryDashboard(ctx)

    expect(result.recentSessions[0]).toMatchObject({ tonnage: 503, completedSetCount: 2 })
  })

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
