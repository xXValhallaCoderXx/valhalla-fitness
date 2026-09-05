/**
 * Native port of apps/web/src/domains/session/components/useDiscardWorkout.ts:
 * discard + full cache teardown, with the lost-response reconciliation (a
 * committed discard whose response was lost still counts as success once Today
 * no longer references the session AND the row provably 404s). Errors surface
 * on the mutation object for the dialog; success feedback is the navigation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import { discardSession } from '@sheetless/data/session/lifecycle'
import { getSession, getToday } from '@sheetless/data/session/reads'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'

export function useDiscardWorkout(user: User, sessionId: string, onDiscarded?: () => void) {
  const userId = user.id
  const queryClient = useQueryClient()

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
    router.dismissTo('/(tabs)')
  }

  return useMutation({
    mutationKey: ['discardSession', sessionId],
    scope: { id: `session:${sessionId}` },
    mutationFn: () => discardSession(buildUserContext(user), { sessionId }),
    onSuccess: finishDiscard,
    onError: async (error) => {
      // If the response was lost after the transaction committed, require both
      // a refreshed Today payload and proof that the target row no longer exists.
      try {
        await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) })
        const today = await queryClient.fetchQuery({
          queryKey: accountQueryKeys.today(userId),
          queryFn: () => getToday(buildUserContext(user)),
          staleTime: 0,
        })
        const noLongerActive = today.activeSession?.sessionId !== sessionId
        let targetMissing = false
        if (noLongerActive) {
          try {
            await getSession(buildUserContext(user), sessionId)
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
      void error
    },
  })
}

export function isMissingSessionError(error: unknown) {
  const message = getApiErrorMessage(error, '')
  return /not found|no rows|0 rows|single json object/i.test(message)
}
