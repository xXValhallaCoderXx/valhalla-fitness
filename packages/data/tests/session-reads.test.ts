import { describe, expect, it } from 'vitest'
import { getSession, getToday } from '@sheetless/data/session/reads'
import { makeStubCtx, type TestTables } from './support/supabase-stub'

const SNAPSHOT = {
  kind: 'ad_hoc',
  id: 'planned-1',
  title: 'Blank workout',
  movements: [
    {
      id: 'slot-1',
      slotId: 'slot-1',
      movementId: 'barbell-bench-press',
      role: 'main',
      sets: [],
    },
  ],
}

function sessionTables(): TestTables {
  return {
    program_instances: [],
    workout_sessions: [
      {
        id: 'session-1',
        user_id: 'user-1',
        status: 'in_progress',
        started_at: '2026-08-23T10:00:00Z',
        completed_at: null,
        state_version: 4,
        program_instance_id: null,
        prescription_snapshot: SNAPSHOT,
        is_favorite: false,
        source_session_id: null,
        notes: null,
        session_rpe: null,
        reflection_win: null,
        reflection_improve: null,
        prs: null,
      },
    ],
    exercise_logs: [
      {
        id: 'ex-1',
        session_id: 'session-1',
        user_id: 'user-1',
        slot_id: 'slot-1',
        order_index: 0,
        performed_movement_id: 'barbell-bench-press',
        notes: null,
      },
    ],
    set_logs: [
      {
        id: 'set-1',
        exercise_log_id: 'ex-1',
        user_id: 'user-1',
        set_index: 0,
        target_load: '100',
        target_reps: 5,
        target_rep_min: null,
        target_rep_max: null,
        target_rpe: null,
        target_rir: 2,
        actual_load: '100',
        actual_reps: 5,
        actual_rpe: null,
        actual_rir: 2,
        completed: true,
        is_top_set: true,
        is_amrap: false,
        is_backoff: false,
        note: null,
        client_mutation_id: 'mut-1',
      },
    ],
  }
}

describe('getSession', () => {
  it('merges snapshot movements with logged sets and numbers strings', async () => {
    const { ctx } = makeStubCtx(sessionTables())

    const session = await getSession(ctx, 'session-1')

    expect(session.sessionId).toBe('session-1')
    expect(session.stateVersion).toBe(4)
    expect(session.isAdHoc).toBe(true)
    expect(session.syncState).toBe('synced')
    const [movement] = session.movements
    expect(movement.performedMovementName).toBeTruthy()
    expect(movement.sets).toHaveLength(1)
    expect(movement.sets[0]).toMatchObject({
      id: 'set-1',
      targetLoad: 100,
      actualLoad: 100,
      actualRir: 2,
      completed: true,
      isTopSet: true,
      clientMutationId: 'mut-1',
      syncState: 'synced',
    })
  })
})

describe('getToday', () => {
  it('returns an all-null payload when nothing is active', async () => {
    const { ctx } = makeStubCtx({ program_instances: [], workout_sessions: [] })

    const today = await getToday(ctx)

    expect(today).toEqual({
      activeProgram: null,
      plannedSession: null,
      activeSession: null,
      completedSession: null,
      pendingDecisions: [],
    })
  })

  it('surfaces an in-progress ad-hoc session even with no program', async () => {
    const { ctx } = makeStubCtx(sessionTables())

    const today = await getToday(ctx)

    expect(today.activeProgram).toBeNull()
    expect(today.plannedSession).toBeNull()
    expect(today.activeSession?.sessionId).toBe('session-1')
    expect(today.activeSession?.isAdHoc).toBe(true)
  })
})
