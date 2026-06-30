import { Badge, Button, Card, Modal, Popover } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, Check, Clock, Minus, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import { meQueryOptions } from '~/domains/account/queries'
import { resolveProgressionDecisionFn } from '~/domains/program/server/program-functions'
import { reviewDecisionView, type ReviewDecisionView } from '~/domains/program/lib/progression-review'
import type { ProgressionDecision } from '~/shared/types'

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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProgressionDecisionVariables) => resolveProgressionDecisionFn({ data }),
    onSuccess: async (_pendingDecisions, variables) => {
      onResolved?.(variables.decisionId, variables.action)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
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
 * Wraps a session-start button so that, while progression decisions are pending, the button is shown
 * disabled and a tap/click reveals a Popover (mobile-safe — not a hover Tooltip) explaining why, with a
 * "Review changes" link that opens the review modal. The caller renders the child button disabled with
 * `pointerEvents: 'none'` so the wrapping span receives the tap. With no pending items, renders the child as-is.
 */
export function PendingReviewGate({
  pendingCount,
  onReview,
  className,
  children,
}: {
  pendingCount: number
  onReview: () => void
  className?: string
  children: ReactNode
}) {
  if (pendingCount <= 0) return <>{children}</>

  return (
    <Popover withArrow withinPortal position="top" radius="md" shadow="md" offset={6} width={224}>
      <Popover.Target>
        <span className={className}>{children}</span>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} color="var(--vf-warning-text)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div className="min-w-0">
            <Caption component="p" lh={1.35}>
              {pendingCount} pending change{pendingCount === 1 ? '' : 's'} to review before your next session.
            </Caption>
            <Button variant="subtle" color="action" size="compact-xs" mt={6} onClick={onReview}>
              Review changes
            </Button>
          </div>
        </div>
      </Popover.Dropdown>
    </Popover>
  )
}

export function PendingReviewAlert({
  decisions,
  onReview,
  className,
}: {
  decisions: ProgressionDecision[]
  onReview: () => void
  className?: string
}) {
  const firstDecision = decisions[0]
  if (!firstDecision) return null

  const countLabel = decisions.length === 1 ? '1 pending' : `${decisions.length} pending`

  return (
    <Card
      className={cn('p-4', className)}
      style={{
        borderColor: 'var(--vf-danger-border)',
        backgroundColor: 'var(--vf-danger-soft)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0" style={{ color: 'var(--vf-danger-text)' }} size={19} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Text component="p" size="sm" fw={900}>
                Progression review pending
              </Text>
              <Badge color="danger">{countLabel}</Badge>
            </div>
            <Caption component="p" mt={2} lh={1.2}>
              {firstDecision.movementName}: {firstDecision.recommendation}
            </Caption>
          </div>
        </div>
        <Button color="danger" variant="filled" className="w-full sm:w-auto" onClick={onReview}>
          Review
        </Button>
      </div>
    </Card>
  )
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
  const queryClient = useQueryClient()
  const units = useQuery(meQueryOptions()).data?.units ?? 'kg'

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
      queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
      queryClient.invalidateQueries({ queryKey: ['today'] }),
      queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
    ])

  const resolveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ProgressionDecisionResolution }) =>
      resolveProgressionDecisionFn({ data: { decisionId: id, action } }),
    onSuccess: async (_result, { id, action }) => {
      setDecided((current) => new Map(current).set(id, action === 'accepted' ? 'accepted' : 'kept'))
      onResolved?.(id, action)
      await invalidate()
    },
    onError: (error) =>
      notifications.show({ color: 'danger', title: 'Could not save decision', message: getApiErrorMessage(error, 'Unable to save progression decision') }),
  })

  const acceptAllMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => resolveProgressionDecisionFn({ data: { decisionId: id, action: 'accepted' as const } }))).then(() => ids),
    onSuccess: async (ids) => {
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
              <ReviewLiftCard
                key={decision.id}
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

function ReviewLiftCard({
  view,
  state,
  isSaving,
  onAccept,
  onKeep,
}: {
  view: ReviewDecisionView
  state?: 'accepted' | 'kept'
  isSaving: boolean
  onAccept: () => void
  onKeep: () => void
}) {
  const accepted = state === 'accepted'
  const kept = state === 'kept'
  const negative = typeof view.delta === 'number' && view.delta < 0
  const confirmText = accepted
    ? view.nextLabel
      ? `Next block uses ${view.nextLabel}`
      : 'Update applied'
    : view.currentLabel
      ? `Staying at ${view.currentLabel} this block`
      : 'Kept current'

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: accepted ? 'var(--vf-success-border)' : 'var(--mantine-color-default-border)',
        backgroundColor: accepted ? 'var(--vf-success-soft)' : kept ? 'var(--vf-surface-2)' : 'var(--mantine-color-default)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Text size="md" fw={800} truncate>{view.name}</Text>
            {view.kindLabel ? <Badge color="action" variant="light" size="xs">{view.kindLabel}</Badge> : null}
          </div>
          {view.reason ? (
            <div className="mt-1.5 flex items-start gap-1.5">
              <Sparkles size={13} color="var(--vf-action-text)" className="mt-0.5 shrink-0" />
              <Caption component="p" lh={1.4}>{view.reason}</Caption>
            </div>
          ) : null}
        </div>
        <Badge color={accepted ? 'success' : kept ? 'neutral' : 'warning'} className="shrink-0">
          {accepted ? 'Accepted' : kept ? 'Kept' : 'Pending'}
        </Badge>
      </div>

      {view.isNumeric ? (
        <div className="mt-3.5 flex items-center gap-3.5">
          <div>
            <SectionLabel>Now</SectionLabel>
            <Text mt={2} size="lg" fw={700} tone="dimmed">{view.currentLabel}</Text>
          </div>
          <ArrowRight size={20} color="var(--mantine-color-dimmed)" className="shrink-0" />
          <div>
            <SectionLabel tone="action">Next block</SectionLabel>
            <Text mt={2} size="lg" fw={800} tone="action">{view.nextLabel}</Text>
          </div>
          {view.deltaLabel ? (
            <Badge color={negative ? 'warning' : 'success'} variant="light">{view.deltaLabel}</Badge>
          ) : null}
        </div>
      ) : null}

      {state ? (
        <div
          className="mt-3.5 flex items-center gap-2 rounded-lg p-2.5"
          style={{ backgroundColor: accepted ? 'var(--vf-success-soft)' : 'var(--vf-surface-2)' }}
        >
          {accepted ? (
            <Check size={15} color="var(--vf-success-text)" className="shrink-0" />
          ) : (
            <Minus size={15} color="var(--mantine-color-dimmed)" className="shrink-0" />
          )}
          <Caption fw={600} tone={accepted ? 'success' : 'dimmed'}>{confirmText}</Caption>
        </div>
      ) : (
        <div className="mt-3.5 flex gap-2.5">
          <Button className="flex-1" disabled={isSaving} onClick={onAccept}>
            <Check size={16} />
            {view.isNumeric && view.deltaLabel ? `Accept ${view.deltaLabel}` : 'Accept'}
          </Button>
          <Button variant="default" className="shrink-0" disabled={isSaving} onClick={onKeep}>
            {view.isNumeric && view.currentLabel ? `Keep ${view.currentLabel}` : 'Keep current'}
          </Button>
        </div>
      )}
    </div>
  )
}
