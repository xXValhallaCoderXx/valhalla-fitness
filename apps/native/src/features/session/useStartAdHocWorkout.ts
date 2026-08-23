import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { startAdHocSession } from '@sheetless/data/session/lifecycle'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { updateSessionManagementCaches } from './session-management-cache'

export type StartAdHocWorkoutIntent = {
  sourceSessionId?: string
}

/** Starts blank and repeated workouts with one idempotency token per user intent. */
export function useStartAdHocWorkout(user: User) {
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()

  return useMutation({
    mutationKey: ['startSession', user.id, 'adHoc'],
    scope: { id: `account:${user.id}:start-session` },
    mutationFn: (intent: StartAdHocWorkoutIntent = {}) => {
      const timeZone = browserIanaTimeZone() ?? undefined
      return startAdHocSession(buildUserContext(user), {
        clientMutationId: request.requestIdFor({
          sourceSessionId: intent.sourceSessionId ?? null,
          timeZone: timeZone ?? null,
        }),
        sourceSessionId: intent.sourceSessionId,
        timeZone,
      })
    },
    onSuccess: (session) => {
      request.clearRequest()
      updateSessionManagementCaches(queryClient, user.id, session)
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) })
    },
  })
}
