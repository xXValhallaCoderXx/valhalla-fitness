import { createServerFn } from '@tanstack/react-start'
import type { PlannedSession, SetLog, SetTarget, WorkoutSession } from '~/domains/session'
import {
  addExerciseSetInputSchema,
  upsertSetLogInputSchema,
} from '~/domains/session/lib/schemas'
import type { Json, Tables } from '~/shared/types/database'
import { getSessionInternal } from '~/domains/session/server/session-read-functions'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const upsertSetLogFn = createServerFn({ method: 'POST' })
  .validator((data) => upsertSetLogInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase } = await requireSessionUser()
    const { error } = await supabase.rpc('upsert_session_set_v2', {
      p_session_id: data.sessionId,
      p_exercise_log_id: data.exerciseLogId,
      p_set_index: data.setIndex,
      p_actual_load: data.actualLoad ?? null,
      p_actual_reps: data.actualReps ?? null,
      p_actual_rir: data.actualRir ?? null,
      p_actual_rpe: data.actualRpe ?? null,
      p_completed: data.completed ?? false,
      p_note: data.note ?? null,
      p_client_mutation_id: data.clientMutationId,
      p_expected_state_version: data.expectedStateVersion,
    })
    if (error) throw new Error(error.message)
    return getSessionInternal(data.sessionId)
  })

function setTargetFromRow(row: Tables<'set_logs'> | undefined, setIndex: number): SetTarget {
  return {
    id: `set-${setIndex}`,
    setIndex,
    targetLoad: row?.target_load === null || row?.target_load === undefined ? null : Number(row.target_load),
    targetReps: row?.target_reps ?? null,
    targetRepMin: row?.target_rep_min ?? null,
    targetRepMax: row?.target_rep_max ?? null,
    targetRpe: row?.target_rpe === null || row?.target_rpe === undefined ? null : Number(row.target_rpe),
    targetRir: row?.target_rir === null || row?.target_rir === undefined ? null : Number(row.target_rir),
    isTopSet: Boolean(row?.is_top_set),
    isAmrap: Boolean(row?.is_amrap),
    isBackoff: Boolean(row?.is_backoff),
    label: row?.target_reps
      ? String(row.target_reps)
      : row?.target_rep_min && row?.target_rep_max
        ? `${row.target_rep_min}-${row.target_rep_max}`
        : undefined,
  }
}

function snapshotSetFromTarget(target: SetTarget): SetLog {
  return {
    ...target,
    actualLoad: target.targetLoad ?? null,
    actualReps: target.targetReps ?? target.targetRepMin ?? null,
    completed: false,
  }
}

export const addExerciseSetFn = createServerFn({ method: 'POST' })
  .validator((data) => addExerciseSetInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const { supabase, user } = await requireSessionUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    const intent = { exerciseLogId: data.exerciseLogId }
    if (
      sessionRow.status !== 'in_progress' ||
      Number(sessionRow.state_version) !== data.expectedStateVersion
    ) {
      const { error: replayError } = await supabase.rpc('add_session_set_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.clientMutationId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise_log_id: data.exerciseLogId,
        p_set: null,
        p_next_snapshot: null,
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }

    const { data: exerciseRow, error: exerciseError } = await supabase
      .from('exercise_logs')
      .select('id, slot_id, role')
      .eq('id', data.exerciseLogId)
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (exerciseError) throw new Error(exerciseError.message)
    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    if (!exerciseRow) {
      const { error: replayError } = await supabase.rpc('add_session_set_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.clientMutationId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise_log_id: data.exerciseLogId,
        p_set: null,
        p_next_snapshot: snapshot as unknown as Json,
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    // Ad-hoc sessions have no prescription to protect, so any movement can grow.
    if (exerciseRow.role !== 'accessory' && sessionRow.program_instance_id !== null) {
      throw new Error('Sets can only be added to accessory movements.')
    }

    const { data: setRows, error: setRowsError } = await supabase
      .from('set_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_log_id', data.exerciseLogId)
      .order('set_index', { ascending: true })
    if (setRowsError) throw new Error(setRowsError.message)

    const lastSet = (setRows ?? []).at(-1)
    const setIndex = Math.max(0, ...(setRows ?? []).map((set) => Number(set.set_index) || 0)) + 1
    const target = setTargetFromRow(lastSet, setIndex)

    const nextSet = snapshotSetFromTarget(target)
    const nextSnapshot: PlannedSession = {
      ...snapshot,
      movements: snapshot.movements.map((movement) => {
        if ((movement.slotId ?? movement.id) !== exerciseRow.slot_id) return movement
        return {
          ...movement,
          sets: [...movement.sets, nextSet],
        }
      }),
    }
    const { error: mutationError } = await supabase.rpc('add_session_set_v2', {
      p_session_id: data.sessionId,
      p_request_id: data.clientMutationId,
      p_expected_state_version: data.expectedStateVersion,
      p_intent: intent,
      p_exercise_log_id: data.exerciseLogId,
      p_set: nextSet as unknown as Json,
      p_next_snapshot: nextSnapshot as unknown as Json,
    })
    if (mutationError) throw new Error(mutationError.message)

    return getSessionInternal(data.sessionId)
  })
