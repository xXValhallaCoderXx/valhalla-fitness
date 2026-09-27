import { useLayoutEffect, useMemo, useRef } from 'react'
import { useMutation, useQueryClient, type MutateOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { startAdHocSession } from '@sheetless/data/session/lifecycle'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import {
  invalidateProgramOverviewBestEffort,
  patchProgramHasActiveSession,
} from '@/features/program/program-cache'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { updateSessionManagementCaches } from '../session-management-cache'

export type StartAdHocWorkoutIntent = {
  sourceSessionId?: string
}

type StartOptions = MutateOptions<WorkoutSession, Error, StartAdHocWorkoutIntent, unknown>
type SubmittedStart = {
  actor: User
  intent: StartAdHocWorkoutIntent
  timeZone?: string
  requestId: string
  lifetime: object
}

/** Starts blank and repeated workouts with one idempotency token per user intent. */
export function useStartAdHocWorkout(user: User) {
  const queryClient = useQueryClient()
  const { clearRequest, requestIdFor } = useStableMutationRequest()
  const lifetime = useMemo(() => ({ accountId: user.id }), [user.id])
  const current = useRef<object | null>(lifetime)
  useLayoutEffect(() => {
    current.current = lifetime
    clearRequest()
    return () => { current.current = null }
  }, [lifetime, clearRequest])

  const mutation = useMutation({
    mutationKey: ['startSession', user.id, 'adHoc'],
    scope: { id: `account:${user.id}:start-session` },
    mutationFn: (submitted: SubmittedStart) => {
      if (current.current !== submitted.lifetime) throw new Error('Workout entry is no longer active.')
      return startAdHocSession(buildUserContext(submitted.actor), {
        clientMutationId: submitted.requestId,
        sourceSessionId: submitted.intent.sourceSessionId,
        timeZone: submitted.timeZone,
      })
    },
    onSuccess: (session, submitted) => {
      if (current.current !== submitted.lifetime) return
      const accountId = submitted.actor.id
      clearRequest(submitted.requestId)
      updateSessionManagementCaches(queryClient, accountId, session)
      patchProgramHasActiveSession(queryClient, accountId, true)
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(accountId) })
      void invalidateProgramOverviewBestEffort(queryClient, accountId)
    },
  })

  const submit = (intent: StartAdHocWorkoutIntent = {}): SubmittedStart => {
    const timeZone = browserIanaTimeZone() ?? undefined
    return { actor: user, intent: { ...intent }, timeZone, lifetime,
      requestId: requestIdFor({ userId: user.id, sourceSessionId: intent.sourceSessionId ?? null, timeZone: timeZone ?? null }) }
  }
  const guardOptions = (submitted: SubmittedStart, options?: StartOptions): MutateOptions<WorkoutSession, Error, SubmittedStart, unknown> => ({
    onSuccess: (session, _variables, context, mutationContext) => {
      if (current.current === submitted.lifetime) options?.onSuccess?.(session, submitted.intent, context, mutationContext)
    },
    onError: (error, _variables, context, mutationContext) => {
      if (current.current === submitted.lifetime) options?.onError?.(error, submitted.intent, context, mutationContext)
    },
    onSettled: (session, error, _variables, context, mutationContext) => {
      if (current.current === submitted.lifetime) options?.onSettled?.(session, error, submitted.intent, context, mutationContext)
    },
  })

  return { ...mutation, variables: mutation.variables?.intent,
    // Choosing Resume ends any failed start intent, including a committed write whose response was lost.
    confirmActiveSession: (session: WorkoutSession) => {
      if (current.current !== lifetime || mutation.isPending || session.status !== 'in_progress') return
      clearRequest()
      mutation.reset()
      updateSessionManagementCaches(queryClient, user.id, session)
      patchProgramHasActiveSession(queryClient, user.id, true)
    },
    mutate: (intent: StartAdHocWorkoutIntent = {}, options?: StartOptions) => {
      const submitted = submit(intent)
      mutation.mutate(submitted, guardOptions(submitted, options))
    },
    mutateAsync: (intent: StartAdHocWorkoutIntent = {}, options?: StartOptions) => {
      const submitted = submit(intent)
      return mutation.mutateAsync(submitted, guardOptions(submitted, options))
    },
  }
}
