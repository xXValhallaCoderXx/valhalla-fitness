/**
 * Native port of the web finish mutation (SessionPage.tsx). Cache refreshes
 * are best-effort: the session is already finished on the server, so a failed
 * refetch must never strand the user — always reach the summary. A retry after
 * a lost response ("already finished") also lands on the summary.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import { finishSession } from '@sheetless/data/session/completion'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import type { FinishReflection } from '@/features/session/FinishWorkoutSheet'

export function useFinishSession(
  user: User,
  session: WorkoutSession,
  notesDraft = session.notes ?? '',
) {
  const userId = user.id
  const sessionId = session.sessionId
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()

  const goToSummary = () =>
    router.replace({ pathname: '/session/[sessionId]/summary', params: { sessionId } })

  const mutation = useMutation({
    mutationKey: ['finishSession', sessionId],
    scope: { id: `session:${sessionId}` },
    mutationFn: (reflection: FinishReflection) => {
      const notes = notesDraft.trim() || null
      return finishSession(buildUserContext(user), {
        sessionId,
        requestId: request.requestIdFor({ notes, ...reflection }),
        // The RPC always writes p_notes — omitting it would erase the draft.
        notes,
        ...reflection,
      })
    },
    onSuccess: async (summary) => {
      request.clearRequest()
      queryClient.setQueryData(accountQueryKeys.summary(userId, sessionId), summary)
      queryClient.setQueryData(accountQueryKeys.session(userId, sessionId), summary.session)
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(userId) }),
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
        ])
      } catch {
        void queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) })
      }
      goToSummary()
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Unable to finish this session')
      if (message.includes('already finished')) goToSummary()
    },
  })

  const errorMessage =
    mutation.isError &&
    !getApiErrorMessage(mutation.error, '').includes('already finished')
      ? getApiErrorMessage(mutation.error, 'Unable to finish this session')
      : null

  return { ...mutation, errorMessage }
}
