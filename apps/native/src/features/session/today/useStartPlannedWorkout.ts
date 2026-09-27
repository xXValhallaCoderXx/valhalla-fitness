import { useLayoutEffect, useRef } from 'react'
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { router } from 'expo-router'
import { startSession } from '@sheetless/data/session/lifecycle'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { invalidateProgramOverviewBestEffort, patchProgramHasActiveSession } from '@/features/program/program-cache'

/** Today and Plan share the same serialized, idempotent entry operation. */
export function useStartPlannedWorkout(user: User | null, expectedProgramId?: string) {
  const client = useQueryClient()
  const account = useRef<string | null>(user?.id ?? null)
  const targetProgram = useRef(expectedProgramId)
  useLayoutEffect(() => {
    account.current = user?.id ?? null
    targetProgram.current = expectedProgramId
    return () => { account.current = null }
  }, [expectedProgramId, user?.id])
  const request = useStableMutationRequest()
  const activeStarts = useIsMutating({ mutationKey: ['startSession', user?.id] })
  const mutation = useMutation({
    mutationKey: ['startSession', user?.id, 'planned'],
    scope: { id: `account:${user?.id ?? 'anonymous'}:start-session` },
    mutationFn: (intent: { user: User; timeZone?: string; requestId: string; expectedProgramId?: string }) => startSession(buildUserContext(intent.user), {
      clientMutationId: intent.requestId, timeZone: intent.timeZone, expectedProgramId: intent.expectedProgramId,
    }),
    onSuccess: (session, intent) => {
      if (account.current !== intent.user.id || targetProgram.current !== intent.expectedProgramId) return
      const user = intent.user
      request.clearRequest(intent.requestId)
      client.setQueryData(accountQueryKeys.session(user.id, session.sessionId), session)
      patchProgramHasActiveSession(client, user.id, true)
      void client.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) })
      void invalidateProgramOverviewBestEffort(client, user.id)
      router.push({ pathname: '/session/[sessionId]', params: { sessionId: session.sessionId } })
    },
    onError: (_error, intent) => {
      if (account.current !== intent.user.id || targetProgram.current !== intent.expectedProgramId) return
      const user = intent.user
      void client.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) })
      void invalidateProgramOverviewBestEffort(client, user.id)
    },
  })
  return { ...mutation, activeStarts, mutate: (_unused?: undefined, options?: { onSuccess?: () => void }) => {
    if (!user) return
    const timeZone = browserIanaTimeZone() ?? undefined
    const intent = { user, timeZone, expectedProgramId, requestId: request.requestIdFor({
      userId: user.id, timeZone: timeZone ?? null, expectedProgramId: expectedProgramId ?? null,
    }) }
    mutation.mutate(intent, { onSuccess: () => {
      if (account.current === intent.user.id && targetProgram.current === intent.expectedProgramId) options?.onSuccess?.()
    } })
  } }
}
