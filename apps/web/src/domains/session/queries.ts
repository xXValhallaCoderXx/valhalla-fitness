import { queryOptions } from '@tanstack/react-query'
import {
  listAccessoryMovementOptionsFn,
  listMovementOptionsFn,
} from '~/domains/movement/server/movement-functions'
import { listFavoriteWorkoutsFn } from '~/domains/session/server/favorite-functions'
import {
  getSessionFn,
  getTodayFn,
  listMovementSwapOptionsFn,
} from '~/domains/session/server/session-functions'
import { queryStaleTimes } from '~/shared/lib/query-stale-times'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { reconcileSessionSets } from '~/domains/session/lib/session-cache'
import type { WorkoutSession } from '~/domains/session/types'

export const todayQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.today(userId),
    queryFn: () => getTodayFn(),
    staleTime: queryStaleTimes.today,
  })

export const sessionQueryOptions = (userId: string, sessionId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.session(userId, sessionId),
    queryFn: () => getSessionFn({ data: { sessionId } }),
    staleTime: queryStaleTimes.session,
    structuralSharing: (current, incoming) =>
      reconcileSessionSets(current as WorkoutSession | undefined, incoming as WorkoutSession),
  })

export const movementSwapOptionsQueryOptions = (
  userId: string,
  sessionId: string,
  exerciseLogId: string,
) =>
  queryOptions({
    queryKey: accountQueryKeys.movementSwapOptions(userId, sessionId, exerciseLogId),
    queryFn: () => listMovementSwapOptionsFn({ data: { sessionId, exerciseLogId } }),
    staleTime: queryStaleTimes.options,
  })

export const accessoryMovementOptionsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.accessoryMovementOptions(userId),
    queryFn: () => listAccessoryMovementOptionsFn(),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })

export const movementOptionsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.allMovementOptions(userId),
    queryFn: () => listMovementOptionsFn(),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })

export const favoriteWorkoutsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.favoriteWorkouts(userId),
    queryFn: () => listFavoriteWorkoutsFn(),
    staleTime: queryStaleTimes.history,
  })
