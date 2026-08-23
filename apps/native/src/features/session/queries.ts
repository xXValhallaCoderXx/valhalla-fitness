import { queryOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
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
