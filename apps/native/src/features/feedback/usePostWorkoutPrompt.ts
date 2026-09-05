import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { dismissPostWorkoutFeedback, getMe } from '@sheetless/data/account/profile'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { buildUserContext } from '@/lib/account'
import { markFeedbackHandled, readFeedbackHandled } from './handled-feedback'

/** Account-keyed reads gate the optional prompt. Failed preferences never imply consent. */
export function usePostWorkoutPrompt(user: User, sessionId: string) {
  const client = useQueryClient()
  const [optOutPending, setOptOutPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scope = useRef({ active: true, busy: false })
  useEffect(() => {
    const next = { active: true, busy: false }
    scope.current = next
    return () => { next.active = false }
  }, [user.id, sessionId])
  const profile = useQuery({
    queryKey: accountQueryKeys.profile(user.id), queryFn: () => getMe(buildUserContext(user)), retry: false,
  })
  const markerKey = ['account', user.id, 'feedback-handled', sessionId] as const
  const marker = useQuery({ queryKey: markerKey, queryFn: () => readFeedbackHandled(user.id, sessionId),
    retry: false, networkMode: 'always', staleTime: Infinity })

  const mark = () => {
    client.setQueryData(markerKey, true)
    return markFeedbackHandled(user.id, sessionId)
  }
  const optOut = async () => {
    const current = scope.current
    if (current.busy || !current.active) return
    current.busy = true
    setOptOutPending(true)
    setError(null)
    try {
      const updated = await dismissPostWorkoutFeedback(buildUserContext(user))
      if (!current.active) return
      client.setQueryData(accountQueryKeys.profile(user.id), updated)
      await mark()
    } catch (cause) {
      if (current.active) setError(getApiErrorMessage(cause, 'Could not turn off the check-in. Try again.'))
    } finally {
      current.busy = false
      if (current.active) setOptOutPending(false)
    }
  }
  return {
    visible: profile.isSuccess && profile.isFetchedAfterMount && !profile.isFetching && profile.data.id === user.id && !profile.data.postWorkoutFeedbackDismissed && marker.isSuccess && !marker.data,
    loadingError: profile.isError || marker.isError,
    retry: () => { void profile.refetch(); void marker.refetch() },
    mark, optOut, optOutPending, error,
  }
}
