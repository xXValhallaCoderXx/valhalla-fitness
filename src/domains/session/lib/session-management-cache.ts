import type { QueryClient } from '@tanstack/react-query'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import type { TodayPayload, WorkoutSession } from '~/domains/session'

export function updateSessionManagementCaches(
  queryClient: QueryClient,
  userId: string,
  session: WorkoutSession,
) {
  queryClient.setQueryData(accountQueryKeys.session(userId, session.sessionId), session)
  queryClient.setQueryData<TodayPayload>(accountQueryKeys.today(userId), (current) =>
    current ? { ...current, activeSession: session } : current,
  )
}

export function invalidateSessionManagementCaches(
  queryClient: QueryClient,
  userId: string,
  sessionId: string,
  includeProgram: boolean,
) {
  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: accountQueryKeys.session(userId, sessionId),
    }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
  ]
  if (includeProgram) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
    )
  }
  return Promise.all(invalidations)
}

export function invalidateSessionProgramCaches(queryClient: QueryClient, userId: string) {
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
  ])
}
