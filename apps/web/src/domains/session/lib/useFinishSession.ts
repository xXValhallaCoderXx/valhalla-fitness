import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { WorkoutSession } from '~/domains/session'
import type { FinishReflection } from '~/domains/session/components/FinishSessionModal'
import { hasUnsettledSessionSets } from '~/domains/session/lib/session-cache'
import { useStableMutationRequest } from '~/domains/session/lib/useStableMutationRequest'
import { todayQueryOptions } from '~/domains/session/queries'
import { finishSessionFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'

export function useFinishSession(session: WorkoutSession, notes: string) {
  const router = useRouter()
  const userId = useRequiredAccountId()
  const sessionId = session.sessionId
  const queryClient = router.options.context.queryClient
  const request = useStableMutationRequest()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationKey: ['finishSession', sessionId],
    scope: { id: `session:${sessionId}` },
    mutationFn: ({ reflection, requestId }: { reflection: FinishReflection; requestId: string }) => {
      const current = queryClient.getQueryData<WorkoutSession>(accountQueryKeys.session(userId, sessionId)) ?? session
      if (hasUnsettledSessionSets(current)) throw new Error('Save or retry all sets before finishing.')
      return finishSessionFn({ data: { sessionId, requestId, notes, ...reflection } })
    },
    onMutate: () => {
      setErrorMessage(null)
    },
    onSuccess: async (summary) => {
      request.clearRequest()
      notifications.show({
        color: 'success',
        title: 'Session finished',
        message: `${summary.completedSets} of ${summary.totalSets} sets completed. ${
          session.isAdHoc ? 'Logged to your history.' : 'Your next session is ready.'
        }`,
      })
      queryClient.setQueryData(accountQueryKeys.summary(userId, sessionId), summary)
      queryClient.setQueryData(accountQueryKeys.session(userId, sessionId), summary.session)
      // Refreshes are best-effort: a completed session must still reach its summary.
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(userId) }),
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
        ])
        await queryClient.fetchQuery(todayQueryOptions(userId))
      } catch {
        void queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) })
      }
      await router.navigate({ to: '/sessions/$sessionId/summary', params: { sessionId } })
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Unable to finish this session')
      // A lost response can report an already committed finish on retry.
      if (message.includes('already finished')) {
        void router.navigate({ to: '/sessions/$sessionId/summary', params: { sessionId } })
        return
      }
      setErrorMessage(message)
      notifications.show({ color: 'danger', title: 'Could not finish session', message })
    },
  })

  return {
    ...mutation,
    errorMessage,
    clearError: () => setErrorMessage(null),
    requestIdFor: request.requestIdFor,
  }
}
