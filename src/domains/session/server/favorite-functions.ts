import { createServerFn } from '@tanstack/react-start'
import type { FavoriteWorkout, PlannedSession, WorkoutSession } from '~/domains/session'
import { favoriteWorkoutFromRow } from '~/domains/session/lib/ad-hoc'
import { setSessionFavoriteInputSchema } from '~/domains/session/lib/schemas'
import { getSessionInternal } from '~/domains/session/server/session-functions'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export const setSessionFavoriteFn = createServerFn({ method: 'POST' })
  .validator((data) => setSessionFavoriteInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const { supabase } = await requireUser()
    const { error } = await supabase.rpc('set_session_favorite_v2', {
      p_session_id: data.sessionId,
      p_favorite: data.favorite,
      p_title: data.title ?? null,
    })
    if (error) {
      if (error.message.includes('ONLY_AD_HOC_FAVORITES')) {
        throw new Error('Only ad-hoc workouts can be favourited.')
      }
      if (error.message.includes('ONLY_COMPLETED_FAVORITES')) {
        throw new Error('Only completed workouts can be favourited.')
      }
      if (error.message.includes('FAVORITE_TITLE_REQUIRED')) {
        throw new Error('Give the workout a name before favouriting it.')
      }
      throw new Error(error.message)
    }

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
    return (data ?? []).map((row) =>
      favoriteWorkoutFromRow({ ...row, prescription_snapshot: row.prescription_snapshot as PlannedSession | null }),
    )
  },
)
