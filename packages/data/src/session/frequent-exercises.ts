import {
  buildFrequentExercises,
  frequentExercisesWindowStart,
  type FrequentExercise,
} from '@sheetless/domain/session/frequent-exercises'
import { calendarDateInTimeZone, resolveIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { getHistoryInputs } from '../history/history'
import { listMovementOptions } from '../movement/catalog'
import type { UserContext } from '../shared/context'

/** Uses the account calendar and the current Add exercise catalogue, never prescribed targets. */
export async function getFrequentExercises(
  ctx: UserContext,
  input: { freeWeightOnly?: boolean } = {},
): Promise<FrequentExercise[]> {
  const { data: profile, error } = await ctx.supabase.from('profiles').select('timezone')
    .eq('id', ctx.user.id).maybeSingle()
  if (error) throw new Error(error.message)
  const today = calendarDateInTimeZone(new Date(), resolveIanaTimeZone(profile?.timezone))
  const [history, options] = await Promise.all([
    getHistoryInputs(ctx.supabase, ctx.user.id, {
      scheduledAfter: frequentExercisesWindowStart(today),
      includeFavorites: false,
      includeSubstitutions: false,
    }),
    listMovementOptions(ctx),
  ])
  return buildFrequentExercises({ sessions: history.sessions, options, today, ...input })
}
