/**
 * Native port of apps/web/src/domains/session/components/useDiscardWorkout.ts:
 * discard + full cache teardown, with the lost-response reconciliation (a
 * committed discard whose response was lost still counts as success once Today
 * no longer references the session AND the row provably 404s). Errors surface
 * on the mutation object for the dialog; success feedback is the navigation.
 */
import { useLayoutEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import { discardSession } from '@sheetless/data/session/lifecycle'
import { getSession, getToday } from '@sheetless/data/session/reads'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { clearWorkoutDrafts } from '../editing/workout-drafts'
import { useRestTimerControls } from '../rest-timer/rest-timer-context'
import { buildUserContext } from '@/lib/account'
import { consumeSetupReturn } from '@/features/templates/setup-return'

export function useDiscardWorkout(user: User, sessionId: string, onDiscarded?: () => void) {
  const userId = user.id
  const queryClient = useQueryClient()
  const rest = useRestTimerControls()
  const ownerKey = `${userId}:${sessionId}`
  const owner = useRef<string | null>(ownerKey)
  useLayoutEffect(() => {
    owner.current = ownerKey
    return () => { owner.current = null }
  }, [ownerKey])

  const finishDiscard = async () => {
    if (owner.current !== ownerKey) return
    rest.exit()
    clearWorkoutDrafts(queryClient, userId, sessionId)
    await Promise.allSettled([
      queryClient.cancelQueries({ queryKey: accountQueryKeys.session(userId, sessionId) }),
      queryClient.cancelQueries({ queryKey: accountQueryKeys.summary(userId, sessionId) }),
      queryClient.cancelQueries({
        queryKey: accountQueryKeys.movementSwapOptions(userId, sessionId),
      }),
    ])

    if (owner.current !== ownerKey) return
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

    if (owner.current !== ownerKey) return
    const destination = consumeSetupReturn(queryClient, userId, sessionId) ?? '/(tabs)'
    onDiscarded?.()
    if (owner.current === ownerKey) router.dismissTo(destination)
  }

  const mutation = useMutation({
    mutationKey: ['discardSession', userId, sessionId],
    scope: { id: `session:${sessionId}` },
    mutationFn: (intent: { user: User; sessionId: string; ownerKey: string }) =>
      discardSession(buildUserContext(intent.user), { sessionId: intent.sessionId }),
    onSuccess: (_result, intent) => {
      if (owner.current === intent.ownerKey) return finishDiscard()
    },
    onError: async (error, intent) => {
      if (owner.current !== intent.ownerKey) return
      // If the response was lost after the transaction committed, require both
      // a refreshed Today payload and proof that the target row no longer exists.
      try {
        await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) })
        if (owner.current !== ownerKey) return
        const today = await queryClient.fetchQuery({
          queryKey: accountQueryKeys.today(userId),
          queryFn: () => getToday(buildUserContext(user)),
          staleTime: 0,
        })
        if (owner.current !== ownerKey) return
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
  return { ...mutation,
    mutate: () => mutation.mutate({ user, sessionId, ownerKey }),
    mutateAsync: () => mutation.mutateAsync({ user, sessionId, ownerKey }),
  }
}

export function isMissingSessionError(error: unknown) {
  const message = getApiErrorMessage(error, '')
  return /not found|no rows|0 rows|single json object/i.test(message)
}
