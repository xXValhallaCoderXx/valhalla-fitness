import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import {
  resolveProgressionDecision,
  resolveProgressionDecisions,
} from '@sheetless/data/program/active-program'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import type { TodayPayload } from '@sheetless/domain/session/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'

export type ProgressionResolution = 'accepted' | 'dismissed'
export type ProgressionDecisionState = 'accepted' | 'kept'

type ResolveVariables = {
  decisionId: string
  action: ProgressionResolution
}

function removeResolvedFromCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  resolvedIds: string[],
) {
  const resolved = new Set(resolvedIds)
  queryClient.setQueryData<TodayPayload>(accountQueryKeys.today(userId), (current) =>
    current
      ? {
          ...current,
          pendingDecisions: current.pendingDecisions.filter(
            (decision) => !resolved.has(decision.id),
          ),
        }
      : current,
  )
  queryClient.setQueryData<ProgramOverview>(
    accountQueryKeys.programOverview(userId),
    (current) =>
      current
        ? {
            ...current,
            pendingDecisions: current.pendingDecisions.filter(
              (decision) => !resolved.has(decision.id),
            ),
            stateValues: current.stateValues.map((state) =>
              state.pendingDecision && resolved.has(state.pendingDecision.id)
                ? { ...state, pendingDecision: null }
                : state,
            ),
          }
        : current,
  )
}

export function useProgressionReview({
  user,
  onResolved,
}: {
  user: User
  onResolved?: (decisionId: string, action: ProgressionResolution) => void
}) {
  const queryClient = useQueryClient()
  const singleRequest = useStableMutationRequest()
  const allRequest = useStableMutationRequest()

  const reconcile = (resolvedIds: string[]) => {
    removeResolvedFromCaches(queryClient, user.id, resolvedIds)
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(user.id) }),
    ]).catch(() => undefined)
  }

  const single = useMutation({
    mutationFn: ({ decisionId, action }: ResolveVariables) =>
      resolveProgressionDecision(buildUserContext(user), {
        decisionId,
        action,
        requestId: singleRequest.requestIdFor({ decisionId, action }),
      }),
    onSuccess: (_remaining, variables) => {
      singleRequest.clearRequest()
      onResolved?.(variables.decisionId, variables.action)
      reconcile([variables.decisionId])
    },
  })

  const applyAllMutation = useMutation({
    mutationFn: (decisionIds: string[]) =>
      resolveProgressionDecisions(buildUserContext(user), {
        decisionIds,
        action: 'accepted',
        requestId: allRequest.requestIdFor({ decisionIds, action: 'accepted' }),
      }),
    onSuccess: (decisionIds) => {
      allRequest.clearRequest()
      for (const decisionId of decisionIds) onResolved?.(decisionId, 'accepted')
      reconcile(decisionIds)
    },
  })

  const error = single.error ?? applyAllMutation.error

  return {
    applyAll: (decisionIds: string[]) => {
      single.reset()
      applyAllMutation.mutate(decisionIds)
    },
    errorMessage: error
      ? getApiErrorMessage(error, 'Unable to save that progression choice. Try again.')
      : null,
    isApplyingAll: applyAllMutation.isPending,
    isSaving: single.isPending || applyAllMutation.isPending,
    resolve: (variables: ResolveVariables) => {
      applyAllMutation.reset()
      single.mutate(variables)
    },
  }
}
