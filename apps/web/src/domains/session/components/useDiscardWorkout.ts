import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { todayQueryOptions } from '~/domains/session/queries'
import { discardSessionFn, getSessionFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type { TodayPayload } from '~/shared/types'

export function useDiscardWorkout(sessionId: string, onDiscarded?: () => void) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const finishDiscard = async () => {
    await Promise.allSettled([
      queryClient.cancelQueries({ queryKey: ['session', sessionId] }),
      queryClient.cancelQueries({ queryKey: ['summary', sessionId] }),
      queryClient.cancelQueries({ queryKey: ['movementSwapOptions', sessionId] }),
    ])

    queryClient.removeQueries({ queryKey: ['session', sessionId] })
    queryClient.removeQueries({ queryKey: ['summary', sessionId] })
    queryClient.removeQueries({ queryKey: ['movementSwapOptions', sessionId] })
    queryClient.setQueryData<TodayPayload>(['today'], (current) => {
      if (current?.activeSession?.sessionId !== sessionId) return current
      return { ...current, activeSession: null }
    })

    try {
      const { clearLocalSession } = await import('~/domains/session/lib/local-db')
      await clearLocalSession(sessionId)
    } catch {
      // The server is authoritative; IndexedDB cleanup is best-effort.
    }

    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['today'] }),
      queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
      queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
      queryClient.invalidateQueries({ queryKey: ['history'] }),
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
    mutationFn: () => discardSessionFn({ data: { sessionId } }),
    onSuccess: finishDiscard,
    onError: async (error) => {
      const message = getApiErrorMessage(error, 'Unable to discard this workout.')

      // If the response was lost after the transaction committed, require both
      // a refreshed Today payload and proof that the target row no longer exists.
      try {
        await queryClient.invalidateQueries({ queryKey: ['today'] })
        const today = await queryClient.fetchQuery({
          ...todayQueryOptions(),
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
