import type { z } from 'zod'
import type { UserContext } from '../shared/context'
import type { FavoriteWorkout, PlannedSession, WorkoutSession } from '@sheetless/domain/session/types'
import { favoriteWorkoutFromRow } from '@sheetless/domain/session/ad-hoc'
import { setSessionFavoriteInputSchema } from '@sheetless/domain/session/schemas'
import { getSession } from './reads'

export async function setSessionFavorite(
  ctx: UserContext,
  data: z.infer<typeof setSessionFavoriteInputSchema>,
): Promise<WorkoutSession> {
    const { supabase } = ctx
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

    return getSession(ctx, data.sessionId)
}

export async function listFavoriteWorkouts(ctx: UserContext): Promise<FavoriteWorkout[]> {
    const { supabase, user } = ctx
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, scheduled_date, completed_at, prescription_snapshot')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false })
      .order('completed_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) =>
      favoriteWorkoutFromRow({ ...row, prescription_snapshot: row.prescription_snapshot as PlannedSession | null }),
    )
}
