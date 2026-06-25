import { queryOptions } from '@tanstack/react-query'
import {
  getHistoryDashboardFn,
  getMovementHistoryFn,
  getRecentHistoryFn,
} from '~/domains/history/server/history-functions'
import { queryStaleTimes } from '~/shared/lib/query-stale-times'

export const recentHistoryQueryOptions = () =>
  queryOptions({
    queryKey: ['history', 'recent'],
    queryFn: () => getRecentHistoryFn(),
    staleTime: queryStaleTimes.history,
  })

export const historyDashboardQueryOptions = () =>
  queryOptions({
    queryKey: ['history', 'dashboard'],
    queryFn: () => getHistoryDashboardFn(),
    staleTime: queryStaleTimes.history,
    gcTime: 30 * 60_000,
  })

export const movementHistoryQueryOptions = (movementId: string) =>
  queryOptions({
    queryKey: ['history', 'movement', movementId],
    queryFn: () => getMovementHistoryFn({ data: { movementId } }),
    staleTime: queryStaleTimes.history,
  })
