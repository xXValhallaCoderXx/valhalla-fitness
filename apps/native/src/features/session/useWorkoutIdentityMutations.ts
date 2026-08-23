import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { renameSession } from '@sheetless/data/session/lifecycle'
import { getSession } from '@sheetless/data/session/reads'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import {
  invalidateSessionManagementCaches,
  updateSessionManagementCaches,
} from './session-management-cache'

export function useRenameWorkoutMutation({
  user,
  session,
  onRenamed,
}: {
  user: User
  session: WorkoutSession
  onRenamed?: () => void
}) {
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()

  return useMutation({
    mutationKey: ['renameSession', session.sessionId],
    scope: { id: `session:${session.sessionId}` },
    mutationFn: async (title: string) => {
      const ctx = buildUserContext(user)
      try {
        return await renameSession(ctx, {
          sessionId: session.sessionId,
          title,
          requestId: request.requestIdFor({ title: title.trim() }),
          expectedStateVersion: session.stateVersion,
        })
      } catch (error) {
        // A response can be lost after the idempotent RPC commits. The freshly
        // read title is sufficient proof that this rename intent succeeded.
        try {
          const refreshed = await getSession(ctx, session.sessionId)
          if (refreshed.title === title.trim()) return refreshed
        } catch {
          // Preserve the original mutation error when reconciliation cannot read.
        }
        throw error
      }
    },
    onError: async () => {
      await invalidateSessionManagementCaches({
        queryClient,
        userId: user.id,
        sessionId: session.sessionId,
        includeProgram: false,
      }).catch(() => undefined)
    },
    onSuccess: async (nextSession) => {
      request.clearRequest()
      updateSessionManagementCaches(queryClient, user.id, nextSession)
      await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) })
      onRenamed?.()
    },
  })
}
