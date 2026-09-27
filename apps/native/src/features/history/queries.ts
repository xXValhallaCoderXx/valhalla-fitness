import { queryOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import {
  getHistoryDashboard,
  getMovementHistory,
  getRecentHistory,
  getTodayHistorySupport,
} from '@sheetless/data/history/history'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { buildUserContext } from '@/lib/account'

export function todayHistorySupportQueryOptions(user: User | null) {
  return queryOptions({
    queryKey: accountQueryKeys.todayHistorySupport(user?.id ?? 'anonymous'),
    queryFn: () => {
      if (!user) throw new Error('Sign in to load your week.')
      return getTodayHistorySupport(buildUserContext(user))
    },
    enabled: Boolean(user),
    staleTime: queryStaleTimes.history,
  })
}

export function movementHistoryQueryOptions(user: User, movementId: string) {
  return queryOptions({
    queryKey: accountQueryKeys.movementHistory(user.id, movementId),
    queryFn: () => getMovementHistory(buildUserContext(user), { movementId }),
    staleTime: queryStaleTimes.history,
  })
}

export function recentHistoryQueryOptions(user: User) {
  return queryOptions({
    queryKey: accountQueryKeys.recentHistory(user.id),
    queryFn: () => getRecentHistory(buildUserContext(user)),
    staleTime: queryStaleTimes.history,
  })
}

export function historyDashboardQueryOptions(user: User) {
  return queryOptions({
    queryKey: accountQueryKeys.historyDashboard(user.id),
    queryFn: () => getHistoryDashboard(buildUserContext(user), { limit: 240 }),
    staleTime: queryStaleTimes.history,
    gcTime: 30 * 60_000,
  })
}
