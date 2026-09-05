import { describe, expect, it } from 'vitest'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { getReturnBaseline } from '../src/program/return-baseline'
import { makeStubCtx, type TestTables } from './support/supabase-stub'

function fixture() {
  const tables: TestTables = { workout_sessions: [], exercise_logs: [], set_logs: [] }
  const add = (
    id: string,
    date: string,
    load: number,
    unit = 'kg',
    owner = 'user-1',
    programId = 'program',
  ) => {
    tables.workout_sessions.push({
      id,
      user_id: owner,
      program_instance_id: programId,
      status: 'completed',
      completed_at: `${date}T10:00:00Z`,
      scheduled_date: date,
      prescription_snapshot: { units: unit },
    })
    tables.exercise_logs.push({
      id,
      user_id: owner,
      session_id: id,
      slot_id: 'squat-slot',
      role: 'main',
      performed_movement_id: 'squat',
    })
    tables.set_logs.push({
      id,
      user_id: owner,
      exercise_log_id: id,
      completed: true,
      actual_load: load,
      actual_reps: 5,
    })
  }
  const program = { id: 'program', units: 'kg' } as ProgramInstance
  return { tables, add, program }
}

describe('return baseline', () => {
  it('selects the last matching performed work, scoped to the account and programme', async () => {
    const { tables, add, program } = fixture()
    add('older', '2026-08-01', 120)
    add('latest', '2026-08-02', 100)
    add('other-user', '2026-08-03', 200, 'kg', 'user-2')
    add('other-program', '2026-08-03', 200, 'kg', 'user-1', 'other')
    const { ctx } = makeStubCtx(tables)
    expect(await getReturnBaseline(ctx, program)).toEqual([
      { movementId: 'squat', slotId: 'squat-slot', load: 100, reps: 5, date: '2026-08-02' },
    ])
  })
  it('keeps the pre-guide goal after new workouts and converts historical units', async () => {
    const { tables, add, program } = fixture()
    add('before', '2026-08-02', 220.462262185, 'lb')
    add('after', '2026-09-06', 80)
    program.returnPeriod = { status: 'active', startedAt: '2026-09-01T00:00:00Z' } as NonNullable<
      ProgramInstance['returnPeriod']
    >
    const { ctx } = makeStubCtx(tables)
    expect((await getReturnBaseline(ctx, program))[0].load).toBeCloseTo(100)
    expect((await getReturnBaseline(ctx, program))[0].date).toBe('2026-08-02')
  })
  it('reads beyond the first page, preserves zero, and ignores incomplete work', async () => {
    const { tables, add, program } = fixture()
    add('before', '2026-01-01', 0)
    for (let i = 0; i < 505; i++) {
      tables.workout_sessions.push({
        id: `empty-${i}`,
        user_id: 'user-1',
        program_instance_id: program.id,
        status: 'completed',
        completed_at: '2026-09-01T10:00:00Z',
        scheduled_date: '2026-09-01',
        prescription_snapshot: { units: 'kg' },
      })
    }
    tables.set_logs.push({
      id: 'incomplete',
      user_id: 'user-1',
      exercise_log_id: 'before',
      completed: false,
      actual_load: 200,
      actual_reps: 1,
    })
    const { ctx } = makeStubCtx(tables)
    expect((await getReturnBaseline(ctx, program))[0].load).toBe(0)
  })
})
