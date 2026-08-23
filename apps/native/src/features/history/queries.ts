import { queryOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { getTodayHistorySupport } from '@sheetless/data/history/history'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { buildUserContext } from '@/lib/account'

export function todayHistorySupportQueryOptions(user: User) {
  return queryOptions({
    queryKey: accountQueryKeys.todayHistorySupport(user.id),
    queryFn: () => getTodayHistorySupport(buildUserContext(user)),
    staleTime: queryStaleTimes.history,
  })
}
