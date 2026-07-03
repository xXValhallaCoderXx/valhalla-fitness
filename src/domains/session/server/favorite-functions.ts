import { createServerFn } from '@tanstack/react-start'
import type { FavoriteWorkout, PlannedSession, WorkoutSession } from '~/shared/types'
import { favoriteWorkoutFromRow, normalizeAdHocTitle } from '~/domains/session/lib/ad-hoc'
import { getSessionInternal } from '~/domains/session/server/session-functions'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export const setSessionFavoriteFn = createServerFn({ method: 'POST' })
  .validator((data: { sessionId: string; favorite: boolean; title?: string }) => data)
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const { supabase, user } = await requireUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id, status, program_instance_id, prescription_snapshot')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    if (sessionRow.program_instance_id !== null) throw new Error('Only ad-hoc workouts can be favourited.')
    if (sessionRow.status !== 'completed') throw new Error('Only completed workouts can be favourited.')

    const update: Record<string, unknown> = { is_favorite: data.favorite }
    if (data.favorite) {
      // Favourites need a recognisable name — the dialog always submits one.
      const title = normalizeAdHocTitle(data.title)
      if (!title) throw new Error('Give the workout a name before favouriting it.')
      const snapshot = sessionRow.prescription_snapshot as PlannedSession
      update.prescription_snapshot = { ...snapshot, title }
    }

    const { error } = await supabase
      .from('workout_sessions')
      .update(update)
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    return getSessionInternal(data.sessionId)
  })

export const listFavoriteWorkoutsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FavoriteWorkout[]> => {
    const { supabase, user } = await requireUser()
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, completed_at, prescription_snapshot')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(favoriteWorkoutFromRow)
  },
)
