import type { MovementHistoryEntry } from '~/domains/history'
import { collectPostgrestPages } from '~/domains/history/lib/postgrest-pagination'
import { getMovementName } from '~/domains/movement/lib/movements'
import type { PlannedSession } from '~/domains/session'
import { collectChunkedSessionQueryPages } from '~/domains/session/lib/session-query-pages'
import type { MovementRole } from '~/shared/types'
import type { SupabaseServerClient } from '~/shared/server/supabase'

const RESULT_LIMIT = 12
const SESSION_PAGE_SIZE = 100

type SnapshotWithTimeZone = PlannedSession & { timeZone?: string | null }

/**
 * Literal performed-movement history. Completed sessions are paged in workout
 * date order so unfinished exercise rows can never crowd older completed work
 * out of the result.
 */
export async function getMovementHistoryEntries(
  supabase: SupabaseServerClient,
  userId: string,
  movementId: string,
): Promise<MovementHistoryEntry[]> {
  const entries: MovementHistoryEntry[] = []
  let offset = 0

  while (entries.length < RESULT_LIMIT) {
    const { data: sessionPage, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id, planned_session_id, completed_at, scheduled_date, prescription_snapshot')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false })
      .order('completed_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + SESSION_PAGE_SIZE - 1)
    if (sessionError) throw new Error(sessionError.message)

    const sessions = sessionPage ?? []
    if (!sessions.length) break
    const sessionIds = sessions.map((session) => session.id)
    const exercises = await collectPostgrestPages((from, to) =>
      supabase
        .from('exercise_logs')
        .select('id, session_id, planned_movement_id, performed_movement_id, role, target_summary')
        .eq('user_id', userId)
        .eq('performed_movement_id', movementId)
        .in('session_id', sessionIds)
        .order('session_id', { ascending: true })
        .order('id', { ascending: false })
        .range(from, to),
    )
    const exerciseIds = exercises.map((exercise) => exercise.id)

    if (exerciseIds.length) {
      const setRows = await collectChunkedSessionQueryPages(exerciseIds, (idChunk, from, to) =>
        supabase
          .from('set_logs')
          .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, actual_load, actual_reps, actual_rir, completed, is_top_set, is_amrap, is_backoff')
          .eq('user_id', userId)
          .eq('completed', true)
          .not('actual_reps', 'is', null)
          .in('exercise_log_id', idChunk)
          .order('exercise_log_id', { ascending: true })
          .order('set_index', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      )
      const sessionsById = new Map(sessions.map((session) => [session.id, session]))
      const setsByExerciseId = new Map<string, typeof setRows>()
      for (const set of setRows) {
        const existing = setsByExerciseId.get(set.exercise_log_id) ?? []
        existing.push(set)
        setsByExerciseId.set(set.exercise_log_id, existing)
      }

      for (const exercise of exercises) {
        const session = sessionsById.get(exercise.session_id)
        const completedSets = setsByExerciseId.get(exercise.id) ?? []
        if (!session || !completedSets.length) continue
        const snapshot = session.prescription_snapshot as SnapshotWithTimeZone | null
        entries.push({
          id: exercise.id,
          sessionId: session.id,
          sessionTitle: snapshot?.title ?? session.planned_session_id ?? 'Workout',
          programTitle: snapshot?.programTitle ?? null,
          scheduledDate: session.scheduled_date,
          completedAt: session.completed_at,
          timeZone: snapshot?.timeZone ?? null,
          units: snapshot?.units ?? null,
          plannedMovementId: exercise.planned_movement_id,
          performedMovementId: exercise.performed_movement_id,
          performedMovementName: getMovementName(exercise.performed_movement_id),
          role: exercise.role as MovementRole,
          targetSummary: exercise.target_summary,
          sets: completedSets.map((set) => ({
            id: set.id,
            setIndex: set.set_index,
            targetLoad: set.target_load === null ? null : Number(set.target_load),
            targetReps: set.target_reps,
            targetRepMin: set.target_rep_min,
            targetRepMax: set.target_rep_max,
            targetRir: set.target_rir === null ? null : Number(set.target_rir),
            actualLoad: set.actual_load === null ? null : Number(set.actual_load),
            actualReps: set.actual_reps,
            actualRir: set.actual_rir === null ? null : Number(set.actual_rir),
            completed: true,
            isTopSet: set.is_top_set,
            isAmrap: set.is_amrap,
            isBackoff: set.is_backoff,
          })),
        })
      }
    }

    entries.sort(compareMovementHistoryEntries)
    if (sessions.length < SESSION_PAGE_SIZE) break
    offset += sessions.length
  }

  return entries.slice(0, RESULT_LIMIT)
}

function compareMovementHistoryEntries(left: MovementHistoryEntry, right: MovementHistoryEntry) {
  const workoutDate = right.scheduledDate.localeCompare(left.scheduledDate)
  if (workoutDate !== 0) return workoutDate
  const completion = (right.completedAt ?? '').localeCompare(left.completedAt ?? '')
  if (completion !== 0) return completion
  return right.id.localeCompare(left.id)
}
