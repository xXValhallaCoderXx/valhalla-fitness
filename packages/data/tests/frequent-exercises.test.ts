import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFrequentExercises } from '../src/session/frequent-exercises'
import { makeStubCtx, type TestRow } from './support/supabase-stub'

const session = (id: string, scheduledDate = '2026-09-27', userId = 'user-1', status = 'completed'): TestRow => ({
  id, user_id: userId, status, scheduled_date: scheduledDate, completed_at: `${scheduledDate}T09:00:00Z`,
  prescription_snapshot: null, program_instance_id: null,
})
const exercise = (id: string, sessionId: string, movementId: string, userId = 'user-1'): TestRow => ({
  id, user_id: userId, session_id: sessionId, planned_movement_id: 'planned-other',
  performed_movement_id: movementId, order_index: 0, role: 'main',
})
const set = (id: string, exerciseId: string, userId = 'user-1', actualReps: number | null = 5): TestRow => ({
  id, user_id: userId, exercise_log_id: exerciseId, set_index: 1, completed: true,
  actual_load: 0, actual_reps: actualReps, target_reps: 8, target_load: 100,
})
const movement = (id: string, status = 'active', machine = false): TestRow => ({
  id, name: id, status, category: 'upper', equipment: [], default_unit: 'kg',
  is_competition: true, resistance_mode: machine ? 'machine_stack' : 'bodyweight',
  required_equipment: machine ? ['machine'] : [], primary_muscles: [], secondary_muscles: [], aliases: [],
})

afterEach(() => vi.useRealTimers())

describe('getFrequentExercises', () => {
  it('uses the account date and isolates every history level, without substituting prescribed values', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-27T23:30:00Z'))
    const { ctx } = makeStubCtx({
      profiles: [{ id: 'user-1', timezone: 'Asia/Singapore' }, { id: 'user-2', timezone: 'UTC' }],
      movements: [movement('bodyweight'), movement('other'), movement('retired', 'deprecated'), movement('target-only')],
      workout_sessions: [session('first', '2026-07-01'), session('today', '2026-09-28'),
        session('old', '2026-06-30'), session('future', '2026-09-29'),
        session('other', '2026-09-28', 'user-2'), session('active', '2026-09-28', 'user-1', 'in_progress')],
      exercise_logs: [exercise('first', 'first', 'bodyweight'), exercise('today', 'today', 'bodyweight'),
        exercise('old', 'old', 'bodyweight'), exercise('future', 'future', 'bodyweight'),
        exercise('other', 'other', 'other', 'user-2'), exercise('foreign-child', 'today', 'other', 'user-2'),
        exercise('foreign-set', 'today', 'other'), exercise('retired', 'today', 'retired'),
        exercise('active', 'active', 'other'), exercise('target-only', 'today', 'target-only')],
      set_logs: [set('first', 'first'), set('today', 'today'), set('old', 'old'), set('future', 'future'),
        set('other', 'other', 'user-2'), set('foreign-child', 'foreign-child', 'user-2'),
        set('foreign-set', 'foreign-set', 'user-2'), set('retired', 'retired'), set('active', 'active'),
        set('target-only', 'target-only', 'user-1', null)],
    })
    const result = await getFrequentExercises(ctx)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ movementId: 'bodyweight', completedWorkoutCount: 2, lastWorkoutDate: '2026-09-28' })
  })

  it('loads every history page and applies equipment eligibility before taking the top three', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-27T12:00:00Z'))
    const ids = Array.from({ length: 501 }, (_, index) => `workout-${index}`)
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', timezone: 'UTC' }],
      movements: [movement('bodyweight'), movement('machine', 'active', true)],
      workout_sessions: ids.map(id => session(id)),
      exercise_logs: ids.flatMap(id => [exercise(id, id, 'bodyweight'), exercise(`machine-${id}`, id, 'machine')]),
      set_logs: ids.flatMap(id => [set(id, id), set(`machine-${id}`, `machine-${id}`)]),
    })
    const result = await getFrequentExercises(ctx, { freeWeightOnly: true })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ movementId: 'bodyweight', completedWorkoutCount: 501 })
    expect(stub.rangeCalls.filter(call => call.table === 'workout_sessions')).toHaveLength(2)
    expect(stub.fromCalls).not.toContain('substitution_logs')
  })

  it('returns an empty suggestion list for an account without completed workouts', async () => {
    const { ctx } = makeStubCtx({ profiles: [], workout_sessions: [], movements: [] })
    expect(await getFrequentExercises(ctx)).toEqual([])
  })
})
