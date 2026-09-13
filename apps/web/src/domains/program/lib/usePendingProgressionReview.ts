import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { meQueryOptions } from '~/domains/account/queries'
import type { ProgressionDecision } from '~/domains/program'
import type { Unit } from '~/shared/types'
import { resolveProgressionDecisionFn, resolveProgressionDecisionsFn } from '../server/program-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { useStableProgramMutationRequest } from './useStableProgramMutationRequest'

type ProgressionDecisionResolution = 'accepted' | 'dismissed'
type ReviewState = 'accepted' | 'kept' | 'superseded' | undefined

export function usePendingProgressionReview({ opened, decisions, units: receiptUnits, onResolved }: {
  opened: boolean
  decisions: ProgressionDecision[]
  units?: Unit
  onResolved?: (id: string, action: ProgressionDecisionResolution) => void
}) {
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()
  const profileUnits = useQuery(meQueryOptions(userId)).data?.units
  const units = receiptUnits ?? profileUnits ?? 'kg'
  const resolveRequest = useStableProgramMutationRequest()
  const acceptAllRequest = useStableProgramMutationRequest()

  // Snapshot the pending set when the modal opens, so decided lifts stay visible (collapsed) even as the
  // caller's pending list shrinks underneath us.
  const [lifts, setLifts] = useState<ProgressionDecision[]>([])
  const [decided, setDecided] = useState<Map<string, 'accepted' | 'kept'>>(() => new Map())
  // Snapshot the pending set on the closed→open transition (adjusting state during render — the React-blessed
  // pattern) so decided lifts stay visible as the caller's pending list shrinks underneath us.
  const [prevOpened, setPrevOpened] = useState(false)
  if (opened !== prevOpened) {
    setPrevOpened(opened)
    if (opened) {
      setLifts(decisions.filter((decision) => decision.status === 'pending'))
      setDecided(new Map())
    }
  }

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.activeProgram(userId) }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.programOverview(userId) }),
    ])

  const resolveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ProgressionDecisionResolution }) =>
      resolveProgressionDecisionFn({
        data: {
          decisionId: id,
          action,
          requestId: resolveRequest.requestIdFor({ decisionId: id, action }),
        },
      }),
    onSuccess: async (_result, { id, action }) => {
      resolveRequest.clearRequest()
      setDecided((current) => new Map(current).set(id, action === 'accepted' ? 'accepted' : 'kept'))
      onResolved?.(id, action)
      await invalidate()
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.sessionReceipts(userId) }),
    onError: (error) =>
      notifications.show({ color: 'danger', title: 'Could not confirm decision', message: getApiErrorMessage(error, 'Unable to confirm progression decision') }),
  })

  const acceptAllMutation = useMutation({
    mutationFn: (ids: string[]) =>
      resolveProgressionDecisionsFn({
        data: {
          decisionIds: ids,
          action: 'accepted',
          requestId: acceptAllRequest.requestIdFor({
            decisionIds: ids,
            action: 'accepted',
          }),
        },
      }),
    onSuccess: async (ids) => {
      acceptAllRequest.clearRequest()
      setDecided((current) => {
        const next = new Map(current)
        for (const id of ids) next.set(id, 'accepted')
        return next
      })
      for (const id of ids) onResolved?.(id, 'accepted')
      await invalidate()
      notifications.show({ color: 'success', title: 'Loads updated', message: 'Your next workout is ready.' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.sessionReceipts(userId) }),
    onError: (error) =>
      notifications.show({ color: 'danger', title: 'Could not confirm updates', message: getApiErrorMessage(error, 'Unable to confirm the load updates') }),
  })

  const isSaving = resolveMutation.isPending || acceptAllMutation.isPending
  // Keep the opening rows visible, but let refreshed terminal statuses win even
  // when a committed mutation's response was lost and onSuccess never ran.
  const reviewedLifts = lifts.map((snapshot) => {
    const decision = decisions.find((current) => current.id === snapshot.id) ?? snapshot
    const state: ReviewState = decision.status === 'accepted' ? 'accepted'
      : decision.status === 'dismissed' ? 'kept'
        : decision.status === 'superseded' ? 'superseded'
          : decided.get(decision.id)
    return { decision, state }
  })
  const pending = reviewedLifts.filter(({ state }) => !state).map(({ decision }) => decision)
  const pendingCount = pending.length
  const decidedCount = lifts.length - pendingCount
  const pendingDelta = pending.reduce(
    (sum, decision) =>
      sum +
      (typeof decision.recommendedValue === 'number' && typeof decision.previousValue === 'number'
        ? decision.recommendedValue - decision.previousValue
        : 0),
    0,
  )
  const roundedDelta = Math.round(pendingDelta * 10) / 10
  const acceptAllDelta = roundedDelta !== 0 ? `${roundedDelta > 0 ? '+' : ''}${Number.isInteger(roundedDelta) ? roundedDelta : roundedDelta.toFixed(1)} ${units}` : ''
  return {
    units, lifts, reviewedLifts, pending, pendingCount, decidedCount, isSaving,
    acceptAllDelta, resolveMutation, acceptAllMutation,
  }
}
