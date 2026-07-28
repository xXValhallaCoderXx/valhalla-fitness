import { Button, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock } from 'lucide-react'
import { useState } from 'react'
import { Caption, Heading, Panel, Text } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { meQueryOptions } from '~/domains/account/queries'
import {
  resolveProgressionDecisionFn,
  resolveProgressionDecisionsFn,
} from '~/domains/program/server/program-functions'
import { reviewDecisionView } from '~/domains/program/lib/progression-review'
import { useStableProgramMutationRequest } from '~/domains/program/lib/useStableProgramMutationRequest'
import type { ProgressionDecision } from '~/domains/program'
import { ProgressionReviewLiftCard } from './ProgressionReviewLiftCard'

export { PendingReviewAlert, PendingReviewGate } from './PendingReviewSurfaces'

type ProgressionDecisionResolution = 'accepted' | 'dismissed'

type ProgressionDecisionVariables = {
  decisionId: string
  action: ProgressionDecisionResolution
}

export function useResolveProgressionDecision({
  onResolved,
}: {
  onResolved?: (decisionId: string, action: ProgressionDecisionResolution) => void
} = {}) {
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()
  const request = useStableProgramMutationRequest()

  return useMutation({
    mutationFn: (data: ProgressionDecisionVariables) =>
      resolveProgressionDecisionFn({
        data: {
          ...data,
          requestId: request.requestIdFor(data),
        },
      }),
    onSuccess: async (_pendingDecisions, variables) => {
      request.clearRequest()
      onResolved?.(variables.decisionId, variables.action)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.activeProgram(userId) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.programOverview(userId) }),
      ])
      notifications.show({ color: 'success', title: 'Progression updated', message: 'Your decision was saved.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not save decision',
        message: getApiErrorMessage(error, 'Unable to save progression decision'),
      })
    },
  })
}

/**
 * Progression review v2 — self-contained. Closing is an explicit "Decide later" (loses nothing); each lift
 * shows Now → Next block (+delta) and the reason, with a calm per-lift Accept / Keep current; decided lifts
 * collapse to a confirmation. The modal owns resolution (single + bulk "Accept all"); callers sync their own
 * optimistic state via `onResolved`.
 */
export function PendingProgressionReviewModal({
  opened,
  decisions,
  contextLabel,
  onClose,
  onResolved,
}: {
  opened: boolean
  decisions: ProgressionDecision[]
  contextLabel?: string
  onClose: () => void
  onResolved?: (decisionId: string, action: ProgressionDecisionResolution) => void
}) {
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()
  const units = useQuery(meQueryOptions(userId)).data?.units ?? 'kg'
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
      setLifts(decisions)
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
    onError: (error) =>
      notifications.show({ color: 'danger', title: 'Could not save decision', message: getApiErrorMessage(error, 'Unable to save progression decision') }),
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
    onError: (error) =>
      notifications.show({ color: 'danger', title: 'Could not apply updates', message: getApiErrorMessage(error, 'Unable to apply the load updates') }),
  })

  const isSaving = resolveMutation.isPending || acceptAllMutation.isPending
  const pending = lifts.filter((decision) => !decided.has(decision.id))
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
  const subline = `${contextLabel ? `You finished ${contextLabel} · ` : ''}${lifts.length} lift${lifts.length === 1 ? '' : 's'} ready to review`
  const progressText = pendingCount === 0 ? `All ${lifts.length} reviewed` : `${decidedCount} of ${lifts.length} reviewed`

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="md"
      classNames={{
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
        content: '!mb-0 !flex !max-h-[90dvh] !flex-col !overflow-hidden !rounded-b-none sm:!mb-auto sm:!rounded-lg',
        header: '!hidden',
        body: '!min-h-0 !flex-1 !overflow-hidden !p-0',
      }}
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        body: { color: 'var(--mantine-color-text)' },
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="px-5 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Heading order={2} size="h4">Progression review</Heading>
              <Caption component="p" mt={2}>{subline}</Caption>
            </div>
            <Button variant="default" size="xs" className="shrink-0" onClick={onClose}>
              <Clock size={14} />
              Decide later
            </Button>
          </div>
          <div
            className="mt-3.5 rounded-lg border p-2.5"
            style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)' }}
          >
            <Caption component="p" tone="success" lh={1.4}>
              Nothing changes until you choose. Closing keeps these for next time.
            </Caption>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 pb-2">
          {lifts.length ? (
            lifts.map((decision) => (
              <ProgressionReviewLiftCard
                key={decision.id}
                decision={decision}
                view={reviewDecisionView(decision, units)}
                state={decided.get(decision.id)}
                isSaving={isSaving}
                onAccept={() => resolveMutation.mutate({ id: decision.id, action: 'accepted' })}
                onKeep={() => resolveMutation.mutate({ id: decision.id, action: 'dismissed' })}
              />
            ))
          ) : (
            <Panel surface="inset" p="sm">
              <Text component="p" size="sm" tone="dimmed">No pending progression decisions.</Text>
            </Panel>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-3 border-t px-5 py-3.5"
          style={{ borderColor: 'var(--mantine-color-default-border)' }}
        >
          <Caption>{progressText}</Caption>
          {pendingCount > 0 ? (
            <Button className="shrink-0" loading={isSaving} onClick={() => acceptAllMutation.mutate(pending.map((decision) => decision.id))}>
              <Check size={16} />
              Accept all {acceptAllDelta}
            </Button>
          ) : (
            <Button className="shrink-0" onClick={onClose}>Done</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
