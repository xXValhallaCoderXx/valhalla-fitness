import { describe, expect, it } from 'vitest'
import { getHistoryDashboard, getMovementHistory } from '@sheetless/data/history/history'
import { makeStubCtx, type TestRow } from './support/supabase-stub'
import { movementCatalog } from '@sheetless/domain/movement/movements'

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
    expect(result.insights.units).toBe('lb')
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


describe('native full loaded history read option', () => {
  it('returns summaries and best sets for all 45 real catalogue movements', async () => {
    const movements = Object.values(movementCatalog)
      .filter(movement => movement.status === 'active' && movement.resistanceMode !== 'bodyweight' && movement.loadConvention !== 'assistance')
      .slice(0, 45)
    expect(movements).toHaveLength(45)
    const tables = dashboardTables(45)
    tables.workout_sessions.forEach(row => {
      row.prescription_snapshot = { units: 'kg', movements: [] }
    })
    const { ctx } = makeStubCtx({ ...tables,
      exercise_logs: movements.map((movement, index) => ({
        id: `exercise-${index}`, user_id: 'user-1', session_id: tables.workout_sessions[index].id,
        planned_movement_id: movement.id, performed_movement_id: movement.id, role: 'main', order_index: 0,
      })),
      set_logs: movements.map((_, index) => ({
        id: `set-${index}`, user_id: 'user-1', exercise_log_id: `exercise-${index}`, set_index: 1,
        actual_load: '50', actual_reps: 5, actual_rir: 0, completed: true,
      })),
    })
    const result = await getHistoryDashboard(ctx, { limit: 240, recentSessionLimit: null, bestSetLimit: null })
    const expected = movements.map(movement => movement.id).sort()
    expect(result.overview.uniqueMovements).toBe(45)
    expect(result.movementSummaries.map(row => row.movementId).sort()).toEqual(expected)
    expect(result.bestSets.map(row => row.movementId).sort()).toEqual(expected)
    for (const [index, movement] of movements.entries()) {
      expect(result.bestSets.find(set => set.movementId === movement.id)).toMatchObject({
        id: `set-${index}`, exerciseId: `exercise-${index}`, sessionId: tables.workout_sessions[index].id,
        movementName: movement.name, load: 50, units: 'kg',
      })
    }
  })

  it('attaches the same set assessment and source identity to records, strength and movement history', async () => {
    const tables = dashboardTables(4)
    tables.workout_sessions.forEach((row, index) => {
      row.scheduled_date = `2026-08-${20 + index}`
      row.prescription_snapshot = { units: index === 3 ? null : 'lb', movements: [] }
    })
    const { ctx } = makeStubCtx({ ...tables,
      profiles: [{ id: 'user-1', units: 'kg', timezone: 'UTC' }],
      exercise_logs: tables.workout_sessions.map((row, index) => ({ id: `e${index}`, session_id: row.id,
        user_id: 'user-1', performed_movement_id: 'squat', planned_movement_id: 'squat', role: 'main', order_index: 0 })),
      set_logs: [0, 1, 2, 3].flatMap(index => [{ id: `clean${index}`, exercise_log_id: `e${index}`, user_id: 'user-1', set_index: 1,
        actual_load: 200 + index, actual_reps: 5, actual_rir: null, completed: true },
        ...(index === 3 ? [{ id: 'unusual', exercise_log_id: 'e3', user_id: 'user-1', set_index: 2,
          actual_load: 800, actual_reps: 5, actual_rir: null, completed: true }] : [])]),
    })
    const dashboard = await getHistoryDashboard(ctx, { bestSetLimit: null })
    const entries = await getMovementHistory(ctx, { movementId: 'squat' })
    expect(entries[0]).toMatchObject({ sessionId: 'session-0003', units: 'lb', unitsInferred: true })
    expect(entries[0].sets.map(set => [set.id, set.assessment?.unusual])).toEqual([['clean3', false], ['unusual', true]])
    expect(dashboard.bestSets[0]).toMatchObject({ id: 'clean3', exerciseId: 'e3', units: 'lb', assessment: entries[0].sets[0].assessment })
    expect(dashboard.insights.liftSeries.find(lift => lift.movementId === 'squat')?.points.at(-1)).toMatchObject({ setId: 'clean3', exerciseId: 'e3', outlier: false })
  })

  it('returns every loaded summary beyond row 60 while default callers keep 60', async () => {
    const { ctx } = makeStubCtx(dashboardTables(250))
    expect((await getHistoryDashboard(ctx, { limit: 240 })).recentSessions).toHaveLength(60)
    const result = await getHistoryDashboard(ctx, { limit: 240, recentSessionLimit: null, bestSetLimit: null })
    expect(result.recentSessions).toHaveLength(240)
    expect(result.recentSessions[239]).toMatchObject({ completedSetCount: 0, recordedSetCount: 0 })
  })
})
