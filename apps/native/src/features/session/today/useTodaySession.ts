import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { startSession } from '@sheetless/data/session/lifecycle'
import { getToday } from '@sheetless/data/session/reads'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { todayHistorySupportQueryOptions } from '@/features/history/queries'
import { invalidateProgramOverviewBestEffort, patchProgramHasActiveSession } from '@/features/program/program-cache'
import { buildUserContext, useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { useTimezoneSync } from '@/lib/use-timezone-sync'

export function useTodaySession() {
  const { user } = useSession()
  const me = useMe()
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()
  const activeStarts = useIsMutating({ mutationKey: ['startSession', user?.id] })
  useTimezoneSync()

  const today = useQuery({
    queryKey: user ? accountQueryKeys.today(user.id) : ['account', 'anonymous', 'today'],
    queryFn: () => getToday(buildUserContext(user!), me.data?.timezone ?? undefined),
    enabled: Boolean(user) && me.isSuccess,
    staleTime: queryStaleTimes.today,
  })
  const history = useQuery({
    ...todayHistorySupportQueryOptions(user!),
    enabled: Boolean(user && (today.data?.activeSession || today.data?.plannedSession)),
  })
  const start = useMutation({
    mutationKey: ['startSession', user?.id, 'planned'],
    scope: { id: `account:${user?.id ?? 'anonymous'}:start-session` },
    mutationFn: () => {
      const timeZone = browserIanaTimeZone() ?? undefined
      return startSession(buildUserContext(user!), {
        clientMutationId: request.requestIdFor({ timeZone: timeZone ?? null }),
        timeZone,
      })
    },
    onSuccess: (session) => {
      request.clearRequest()
      queryClient.setQueryData(accountQueryKeys.session(user!.id, session.sessionId), session)
      patchProgramHasActiveSession(queryClient, user!.id, true)
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user!.id) })
      void invalidateProgramOverviewBestEffort(queryClient, user!.id)
      router.push({ pathname: '/session/[sessionId]', params: { sessionId: session.sessionId } })
    },
    // A stale preview can meet an authoritative progression guard. Refetch so
    // the review appears while keeping the failed start's identity for retry.
    onError: () => { void today.refetch() },
  })

  return { user, me, today, history, start, activeStarts }
}
