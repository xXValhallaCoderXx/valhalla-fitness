import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { todayQueryOptions } from '~/domains/session/queries'
import { discardSessionFn, getSessionFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import type { TodayPayload } from '~/domains/session'

export function useDiscardWorkout(sessionId: string, onDiscarded?: () => void) {
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()
  const router = useRouter()

  const finishDiscard = async () => {
    await Promise.allSettled([
      queryClient.cancelQueries({ queryKey: accountQueryKeys.session(userId, sessionId) }),
      queryClient.cancelQueries({ queryKey: accountQueryKeys.summary(userId, sessionId) }),
      queryClient.cancelQueries({
        queryKey: accountQueryKeys.movementSwapOptions(userId, sessionId),
      }),
    ])

    queryClient.removeQueries({ queryKey: accountQueryKeys.session(userId, sessionId) })
    queryClient.removeQueries({ queryKey: accountQueryKeys.summary(userId, sessionId) })
    queryClient.removeQueries({
      queryKey: accountQueryKeys.movementSwapOptions(userId, sessionId),
    })
    queryClient.setQueryData<TodayPayload>(accountQueryKeys.today(userId), (current) => {
      if (current?.activeSession?.sessionId !== sessionId) return current
      return { ...current, activeSession: null }
    })

    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(userId) }),
    ])

    onDiscarded?.()
    await router.navigate({ to: '/today', replace: true })
    notifications.show({
      color: 'success',
      title: 'Workout discarded',
      message: 'The workout, saved logs, and changes from this attempt were removed.',
    })
  }

  return useMutation({
    mutationKey: ['discardSession', sessionId],
    scope: { id: `session:${sessionId}` },
    mutationFn: () => discardSessionFn({ data: { sessionId } }),
    onSuccess: finishDiscard,
    onError: async (error) => {
      const message = getApiErrorMessage(error, 'Unable to discard this workout.')

      // If the response was lost after the transaction committed, require both
      // a refreshed Today payload and proof that the target row no longer exists.
      try {
        await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) })
        const today = await queryClient.fetchQuery({
          ...todayQueryOptions(userId),
          staleTime: 0,
        })
        const noLongerActive = today.activeSession?.sessionId !== sessionId
        let targetMissing = false
        if (noLongerActive) {
          try {
            await getSessionFn({ data: { sessionId } })
          } catch (lookupError) {
            targetMissing = isMissingSessionError(lookupError)
          }
        }
        if (noLongerActive && targetMissing) {
          await finishDiscard()
          return
        }
      } catch {
        // Preserve the original discard error when reconciliation also fails.
      }

      notifications.show({
        color: 'danger',
        title: 'Could not discard workout',
        message,
      })
    },
  })
}

function isMissingSessionError(error: unknown) {
  const message = getApiErrorMessage(error, '')
  return /not found|no rows|0 rows|single json object/i.test(message)
}
