import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import type { ProgressionDecision } from '~/domains/program'
import type { SessionSummary } from '~/domains/session'
import type { DecidedState } from '../components/SessionSummaryDecisionHero'
import { useResolveProgressionDecision } from '~/domains/program/components/PendingReview'
import { resolveProgressionDecisionsFn } from '~/domains/program/server/program-functions'
import { useStableProgramMutationRequest } from '~/domains/program/lib/useStableProgramMutationRequest'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'

export function useSummaryProgression(userId: string, sessionId: string, decisions: ProgressionDecision[]) {
  const queryClient = useQueryClient()
  const applyAllRequest = useStableProgramMutationRequest()
  const onResolved = (id: string, action: 'accepted' | 'dismissed') => {
    // Acknowledged writes update the same receipt used by the hero, coaching and feedback.
    queryClient.setQueryData<SessionSummary>(accountQueryKeys.sessionReceipt(userId, sessionId), (current) => current && ({
      ...current,
      decisions: current.decisions.map((decision) => decision.id === id ? { ...decision, status: action } : decision),
    }))
  }
  const decisionMutation = useResolveProgressionDecision({ onResolved })
  const applyAllMutation = useMutation({
    mutationFn: (ids: string[]) => resolveProgressionDecisionsFn({
      data: {
        decisionIds: ids,
        action: 'accepted',
        requestId: applyAllRequest.requestIdFor({ decisionIds: ids, action: 'accepted' }),
      },
    }),
    onSuccess: async (ids) => {
      applyAllRequest.clearRequest()
      for (const id of ids) onResolved(id, 'accepted')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
      ])
      notifications.show({ color: 'success', title: 'Loads updated', message: 'Your choices were saved.' })
    },
    onError: (error) => {
      notifications.show({ color: 'danger', title: 'Could not confirm updates', message: getApiErrorMessage(error, 'Unable to confirm the saved choices') })
    },
    // Also reconcile a committed write whose response was lost.
    onSettled: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.sessionReceipts(userId) }),
  })
  const decided = new Map<string, DecidedState>()
  for (const decision of decisions) {
    if (decision.status !== 'pending') {
      decided.set(decision.id, decision.status === 'accepted' ? 'applied' : decision.status === 'dismissed' ? 'kept' : 'superseded')
    }
  }
  return {
    decisionMutation, applyAllMutation, onResolved, decided,
    pendingDecisions: decisions.filter((decision) => decision.status === 'pending'),
    appliedCount: decisions.filter((decision) => decision.status === 'accepted').length,
  }
}
