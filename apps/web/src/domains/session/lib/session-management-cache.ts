import type { QueryClient } from '@tanstack/react-query'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import type { TodayPayload, WorkoutSession } from '~/domains/session'
import { reconcileSessionSets } from '~/domains/session/lib/session-cache'

export function updateSessionManagementCaches(
  queryClient: QueryClient,
  userId: string,
  session: WorkoutSession,
) {
  const sessionKey = accountQueryKeys.session(userId, session.sessionId)
  const reconciled = reconcileSessionSets(queryClient.getQueryData<WorkoutSession>(sessionKey), session)
  queryClient.setQueryData(sessionKey, reconciled)
  queryClient.setQueryData<TodayPayload>(accountQueryKeys.today(userId), (current) =>
    current && session.status === 'in_progress' &&
    (!current.activeSession || current.activeSession.sessionId === session.sessionId)
      ? { ...current, activeSession: reconciled }
      : current,
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
