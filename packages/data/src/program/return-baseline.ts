import {
  collectSessionQueryPages,
  collectChunkedSessionQueryPages,
} from '@sheetless/domain/session/session-query-pages'
import { convertWeight } from '@sheetless/domain/shared/math'
import { isReturnActive } from '@sheetless/domain/program/return-settings'
import type { ReturnBaseline } from '@sheetless/domain/program/return-outlook'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { UserContext } from '../shared/context'

/** Last performed main-lift work before this guide, never a historical strength estimate. */
export async function getReturnBaseline(
  ctx: UserContext,
  program: ProgramInstance,
): Promise<ReturnBaseline[]> {
  const sessions = await collectSessionQueryPages((from, to) => {
    let query = ctx.supabase
      .from('workout_sessions')
      .select('id, completed_at, scheduled_date, prescription_snapshot')
      .eq('user_id', ctx.user.id)
      .eq('program_instance_id', program.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('scheduled_date', { ascending: false })
      .order('id')
    if (isReturnActive(program.returnPeriod))
      query = query.lt('completed_at', program.returnPeriod!.startedAt)
    return query.range(from, to)
  })
  if (!sessions.length) return []
  const exercises = await collectChunkedSessionQueryPages(
    sessions.map((session) => session.id),
    (ids, from, to) =>
      ctx.supabase
        .from('exercise_logs')
        .select('id, session_id, slot_id, performed_movement_id')
        .eq('user_id', ctx.user.id)
        .eq('role', 'main')
        .in('session_id', ids)
        .order('id')
        .range(from, to),
  )
  const sets = await collectChunkedSessionQueryPages(
    exercises.map((exercise) => exercise.id),
    (ids, from, to) =>
      ctx.supabase
        .from('set_logs')
        .select('id, exercise_log_id, actual_load, actual_reps')
        .eq('user_id', ctx.user.id)
        .eq('completed', true)
        .in('exercise_log_id', ids)
        .order('id')
        .range(from, to),
  )
  const result = new Map<string, ReturnBaseline>()
  const exercisesBySession = new Map<string, typeof exercises>()
  const setsByExercise = new Map<string, typeof sets>()
  for (const exercise of exercises)
    exercisesBySession.set(exercise.session_id, [
      ...(exercisesBySession.get(exercise.session_id) ?? []),
      exercise,
    ])
  for (const set of sets)
    setsByExercise.set(set.exercise_log_id, [
      ...(setsByExercise.get(set.exercise_log_id) ?? []),
      set,
    ])
  for (const session of sessions) {
    const snapshot = session.prescription_snapshot as { units?: string } | null
    if (snapshot?.units !== 'kg' && snapshot?.units !== 'lb') continue
    for (const exercise of exercisesBySession.get(session.id) ?? []) {
      const key = `${exercise.performed_movement_id}:${exercise.slot_id}`
      if (result.has(key)) continue
      const best = (setsByExercise.get(exercise.id) ?? [])
        .filter(
          (set) =>
            set.exercise_log_id === exercise.id &&
            set.actual_load != null &&
            set.actual_reps != null &&
            set.actual_reps > 0,
        )
        .sort((a, b) => b.actual_load! - a.actual_load! || b.actual_reps! - a.actual_reps!)[0]
      if (best)
        result.set(key, {
          movementId: exercise.performed_movement_id,
          slotId: exercise.slot_id,
          load: convertWeight(best.actual_load!, snapshot.units, program.units),
          reps: best.actual_reps!,
          date: session.scheduled_date,
        })
    }
  }
  return [...result.values()]
}
