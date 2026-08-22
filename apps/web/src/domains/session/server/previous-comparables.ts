import type { MovementSlot, PlannedSession, SetLog } from '~/domains/session'
import {
  selectPreviousComparables,
  type PreviousComparableCandidate,
} from '~/domains/session/lib/previous-comparable'
import {
  collectChunkedSessionQueryPages,
  collectSessionQueryPages,
} from '~/domains/session/lib/session-query-pages'
import type { SupabaseServerClient } from '~/shared/server/supabase'

type ComparableSessionRow = {
  id: string
  completed_at?: string | null
  scheduled_date: string
  prescription_snapshot?: PlannedSession | null
}

/**
 * Request-independent comparable read service. Callers provide their already
 * authenticated client and owner ID so session creation, accessories, swaps,
 * and data tooling all share the exact same selection behavior.
 */
export async function getPreviousComparablesBySlotId(
  supabase: SupabaseServerClient,
  userId: string,
  plannedSession: PlannedSession,
): Promise<Record<string, MovementSlot['previous']>> {
  const performedMovementIds = Array.from(
    new Set(
      plannedSession.movements.map(
        (movement) => movement.performedMovementId ?? movement.movementId,
      ),
    ),
  )
  if (!performedMovementIds.length) return {}

  // Only work actually performed as a requested movement can qualify. Planned
  // movement IDs still influence ranking after this eligibility boundary.
  const exerciseRows = await collectSessionQueryPages((from, to) =>
    supabase
      .from('exercise_logs')
      .select(
        'id, session_id, slot_id, planned_movement_id, performed_movement_id, role, created_at',
      )
      .eq('user_id', userId)
      .in('performed_movement_id', performedMovementIds)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to),
  )
  const exerciseIds = exerciseRows.map((exercise) => exercise.id)
  const sessionIds = Array.from(new Set(exerciseRows.map((exercise) => exercise.session_id)))
  if (!exerciseIds.length || !sessionIds.length) return {}

  const sessionRows = await collectChunkedSessionQueryPages(sessionIds, (idChunk, from, to) =>
    supabase
      .from('workout_sessions')
      .select('id, status, completed_at, scheduled_date, prescription_snapshot')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .in('id', idChunk)
      .order('id', { ascending: true })
      .range(from, to),
  )

  const completedSessionsById = new Map<string, ComparableSessionRow>(
    sessionRows.map((session) => [
      session.id,
      {
        ...session,
        prescription_snapshot:
          session.prescription_snapshot as PlannedSession | null,
      },
    ]),
  )
  const completedExerciseRows = exerciseRows.filter((exercise) =>
    completedSessionsById.has(exercise.session_id),
  )
  if (!completedExerciseRows.length) return {}

  const setRows = await collectChunkedSessionQueryPages(
    completedExerciseRows.map((exercise) => exercise.id),
    (idChunk, from, to) =>
      supabase
        .from('set_logs')
        .select(
          'id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, target_rpe, actual_load, actual_reps, actual_rir, actual_rpe, completed, is_top_set, is_amrap, is_backoff',
        )
        .eq('user_id', userId)
        .eq('completed', true)
        .in('exercise_log_id', idChunk)
        .order('exercise_log_id', { ascending: true })
        .order('set_index', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
  )

  const setsByExerciseId = new Map<string, SetLog[]>()
  for (const row of setRows) {
    const sets = setsByExerciseId.get(row.exercise_log_id) ?? []
    sets.push({
      id: row.id,
      exerciseLogId: row.exercise_log_id,
      setIndex: row.set_index,
      targetLoad: row.target_load === null ? null : Number(row.target_load),
      targetReps: row.target_reps,
      targetRepMin: row.target_rep_min,
      targetRepMax: row.target_rep_max,
      targetRir: row.target_rir === null ? null : Number(row.target_rir),
      targetRpe: row.target_rpe === null ? null : Number(row.target_rpe),
      actualLoad: row.actual_load === null ? null : Number(row.actual_load),
      actualReps: row.actual_reps,
      actualRir: row.actual_rir === null ? null : Number(row.actual_rir),
      actualRpe: row.actual_rpe === null ? null : Number(row.actual_rpe),
      completed: row.completed,
      isTopSet: row.is_top_set,
      isAmrap: row.is_amrap,
      isBackoff: row.is_backoff,
    })
    setsByExerciseId.set(row.exercise_log_id, sets)
  }

  const candidates = completedExerciseRows.map(
    (exercise): PreviousComparableCandidate => {
      const session = completedSessionsById.get(exercise.session_id)
      const snapshot = session?.prescription_snapshot ?? null
      return {
        exerciseId: exercise.id,
        slotId: exercise.slot_id,
        plannedMovementId: exercise.planned_movement_id,
        performedMovementId: exercise.performed_movement_id,
        role: exercise.role as MovementSlot['role'],
        completedAt: session?.completed_at,
        scheduledDate: session?.scheduled_date ?? plannedSession.scheduledDate,
        templateId: snapshot?.templateId ?? null,
        timeZone: snapshot?.timeZone ?? null,
        units: snapshot?.units ?? null,
        sets: setsByExerciseId.get(exercise.id) ?? [],
      }
    },
  )

  return selectPreviousComparables(plannedSession, candidates)
}
