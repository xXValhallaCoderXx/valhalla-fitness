import type { QueryClient } from '@tanstack/react-query'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import { reconcileSessionSets } from '@sheetless/domain/session/session-cache'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'

export function updateSessionManagementCaches(
  queryClient: QueryClient,
  userId: string,
  session: WorkoutSession,
) {
  const sessionKey = accountQueryKeys.session(userId, session.sessionId)
  const reconciled = reconcileSessionSets(queryClient.getQueryData<WorkoutSession>(sessionKey), session)
  queryClient.setQueryData(sessionKey, reconciled)
  queryClient.setQueryData<TodayPayload>(accountQueryKeys.today(userId), (current) =>
    current &&
    session.status === 'in_progress' &&
    (!current.activeSession || current.activeSession.sessionId === session.sessionId)
      ? { ...current, activeSession: reconciled }
      : current,
  )
}

export async function invalidateSessionManagementCaches({
  queryClient,
  userId,
  sessionId,
  includeProgram,
}: {
  queryClient: QueryClient
  userId: string
  sessionId: string
  includeProgram: boolean
}) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.session(userId, sessionId) }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
  ]
  if (includeProgram) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
    )
  }
  await Promise.all(invalidations)
}
