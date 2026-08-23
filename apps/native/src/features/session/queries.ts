import { queryOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import {
  listAccessoryMovementOptions,
  listMovementOptions,
} from '@sheetless/data/movement/catalog'
import { listFavoriteWorkouts } from '@sheetless/data/session/favorites'
import { listMovementSwapOptions } from '@sheetless/data/session/movements'
import { getSession, getToday } from '@sheetless/data/session/reads'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { buildUserContext } from '@/lib/account'

export function todayQueryOptions(user: User, timeZone?: string) {
  return queryOptions({
    queryKey: accountQueryKeys.today(user.id),
    queryFn: () => getToday(buildUserContext(user), timeZone),
    staleTime: queryStaleTimes.today,
  })
}

export function sessionQueryOptions(user: User, sessionId: string) {
  return queryOptions({
    queryKey: accountQueryKeys.session(user.id, sessionId),
    queryFn: () => getSession(buildUserContext(user), sessionId),
    staleTime: queryStaleTimes.session,
  })
}

export function favoriteWorkoutsQueryOptions(user: User) {
  return queryOptions({
    queryKey: accountQueryKeys.favoriteWorkouts(user.id),
    queryFn: () => listFavoriteWorkouts(buildUserContext(user)),
    staleTime: queryStaleTimes.history,
  })
}

export function movementSwapOptionsQueryOptions(
  user: User,
  sessionId: string,
  exerciseLogId: string,
) {
  return queryOptions({
    queryKey: accountQueryKeys.movementSwapOptions(
      user.id,
      sessionId,
      exerciseLogId,
    ),
    queryFn: () =>
      listMovementSwapOptions(buildUserContext(user), {
        sessionId,
        exerciseLogId,
      }),
    staleTime: queryStaleTimes.options,
  })
}

export function accessoryMovementOptionsQueryOptions(user: User) {
  return queryOptions({
    queryKey: accountQueryKeys.accessoryMovementOptions(user.id),
    queryFn: () => listAccessoryMovementOptions(buildUserContext(user)),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })
}

export function allMovementOptionsQueryOptions(user: User) {
  return queryOptions({
    queryKey: accountQueryKeys.allMovementOptions(user.id),
    queryFn: () => listMovementOptions(buildUserContext(user)),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })
}
