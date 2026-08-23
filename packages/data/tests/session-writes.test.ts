import { describe, expect, it } from 'vitest'
import { addExerciseSet, upsertSetLog } from '@sheetless/data/session/sets'
import { makeStubCtx, type TestTables } from './support/supabase-stub'

const SESSION_ID = 'f93f3498-4d9c-4ec3-93ef-7520f8971c19'
const EXERCISE_LOG_ID = 'ffbe42d8-86d7-4714-88d5-8599fc5183d3'

const SNAPSHOT = {
  kind: 'ad_hoc',
  id: 'planned-1',
  title: 'Blank workout',
  movements: [
    { id: 'slot-1', slotId: 'slot-1', movementId: 'barbell-bench-press', role: 'accessory', sets: [] },
  ],
}

function tables(stateVersion: number): TestTables {
  return {
    workout_sessions: [
      {
        id: SESSION_ID,
        user_id: 'user-1',
        status: 'in_progress',
        started_at: '2026-08-23T10:00:00Z',
        state_version: stateVersion,
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
        id: EXERCISE_LOG_ID,
        session_id: SESSION_ID,
        user_id: 'user-1',
        slot_id: 'slot-1',
        order_index: 0,
        role: 'accessory',
        performed_movement_id: 'barbell-bench-press',
        notes: null,
      },
    ],
    set_logs: [],
  }
}

describe('upsertSetLog', () => {
  it('marshals the idempotency token and expected version into the RPC', async () => {
    const { ctx, stub } = makeStubCtx(tables(4))

    await upsertSetLog(ctx, {
      sessionId: SESSION_ID,
      exerciseLogId: EXERCISE_LOG_ID,
      setIndex: 0,
      actualLoad: 100,
      actualReps: 5,
      actualRir: 2,
      completed: true,
      clientMutationId: 'mut-abc',
      expectedStateVersion: 4,
    })

    expect(stub.rpcCalls[0].fn).toBe('upsert_session_set_v2')
    expect(stub.rpcCalls[0].args).toMatchObject({
      p_session_id: SESSION_ID,
      p_client_mutation_id: 'mut-abc',
      p_expected_state_version: 4,
      p_completed: true,
    })
  })
})

describe('addExerciseSet replay path', () => {
  it('replays with null payloads when the expected state version mismatches', async () => {
    // Session is at version 7; the client retries with the stale token/version 4.
    const { ctx, stub } = makeStubCtx(tables(7))

    await addExerciseSet(ctx, {
      sessionId: SESSION_ID,
      exerciseLogId: EXERCISE_LOG_ID,
      clientMutationId: 'mut-retry',
      expectedStateVersion: 4,
    })

    expect(stub.rpcCalls[0].fn).toBe('add_session_set_v2')
    expect(stub.rpcCalls[0].args).toMatchObject({
      p_request_id: 'mut-retry',
      p_expected_state_version: 4,
      p_set: null,
      p_next_snapshot: null,
    })
  })

  it('derives the next set from the last logged set on the happy path', async () => {
    const seeded = tables(4)
    seeded.set_logs = [
      {
        id: 'set-1',
        exercise_log_id: EXERCISE_LOG_ID,
        user_id: 'user-1',
        set_index: 1,
        target_load: '60',
        target_reps: 8,
        target_rep_min: null,
        target_rep_max: null,
        target_rpe: null,
        target_rir: 2,
        is_top_set: false,
        is_amrap: false,
        is_backoff: false,
        completed: true,
        actual_load: '60',
        actual_reps: 8,
        actual_rpe: null,
        actual_rir: 2,
        note: null,
        client_mutation_id: 'mut-1',
      },
    ]
    const { ctx, stub } = makeStubCtx(seeded)

    await addExerciseSet(ctx, {
      sessionId: SESSION_ID,
      exerciseLogId: EXERCISE_LOG_ID,
      clientMutationId: 'mut-new',
      expectedStateVersion: 4,
    })

    const call = stub.rpcCalls[0]
    expect(call.fn).toBe('add_session_set_v2')
    const newSet = call.args?.p_set as { setIndex: number; targetLoad: number | null; completed: boolean }
    expect(newSet.setIndex).toBe(2)
    expect(newSet.targetLoad).toBe(60)
    expect(newSet.completed).toBe(false)
  })
})
