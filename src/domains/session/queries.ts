import { queryOptions } from '@tanstack/react-query'
import { listAccessoryMovementOptionsFn } from '~/domains/movement/server/movement-functions'
import {
  getSessionFn,
  getTodayFn,
  listMovementSwapOptionsFn,
} from '~/domains/session/server/session-functions'
import { queryStaleTimes } from '~/shared/lib/query-stale-times'

export const todayQueryOptions = () =>
  queryOptions({
    queryKey: ['today'],
    queryFn: () => getTodayFn(),
    staleTime: queryStaleTimes.today,
  })

export const sessionQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionFn({ data: { sessionId } }),
    staleTime: queryStaleTimes.session,
  })

export const movementSwapOptionsQueryOptions = (sessionId: string, exerciseLogId: string) =>
  queryOptions({
    queryKey: ['movementSwapOptions', sessionId, exerciseLogId],
    queryFn: () => listMovementSwapOptionsFn({ data: { sessionId, exerciseLogId } }),
    staleTime: queryStaleTimes.options,
  })

export const accessoryMovementOptionsQueryOptions = () =>
  queryOptions({
    queryKey: ['accessoryMovementOptions'],
    queryFn: () => listAccessoryMovementOptionsFn(),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })
