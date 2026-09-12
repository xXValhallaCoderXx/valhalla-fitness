import type { UserContext } from '../shared/context'

export type ExperienceSignals = {
  completedSessions: number
}

/**
 * Exact completed-session count, cheaply. The full history dashboard also knows this number, but
 * it pulls every session plus every exercise and set log to get there — far too much for Today.
 * A head-only count is served straight from `workout_sessions_user_status_completed_idx`.
 */
export async function getExperienceSignals(ctx: UserContext): Promise<ExperienceSignals> {
  const { supabase, user } = ctx
  const { count, error } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')
  if (error) throw new Error(error.message)
  return { completedSessions: count ?? 0 }
}
