import { queryOptions } from '@tanstack/react-query'
import {
  getHistoryDashboardFn,
  getMovementHistoryFn,
  getRecentHistoryFn,
  getTodayHistorySupportFn,
} from '~/domains/history/server/history-functions'
import { queryStaleTimes } from '~/shared/lib/query-stale-times'
import { accountQueryKeys } from '~/shared/lib/query-keys'

export const recentHistoryQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.recentHistory(userId),
    queryFn: () => getRecentHistoryFn(),
    staleTime: queryStaleTimes.history,
  })

export const historyDashboardQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.historyDashboard(userId),
    queryFn: () => getHistoryDashboardFn(),
    staleTime: queryStaleTimes.history,
    gcTime: 30 * 60_000,
  })

export const todayHistorySupportQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.todayHistorySupport(userId),
    queryFn: () => getTodayHistorySupportFn(),
    staleTime: queryStaleTimes.history,
  })

export const movementHistoryQueryOptions = (userId: string, movementId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.movementHistory(userId, movementId),
    queryFn: () => getMovementHistoryFn({ data: { movementId } }),
    staleTime: queryStaleTimes.history,
  })
