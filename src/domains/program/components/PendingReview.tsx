import { Badge, Button, Card, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Clock3, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import { resolveProgressionDecisionFn } from '~/server/api'
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
    <Card className={cn('border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] p-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-[var(--vf-danger-text)]" size={19} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-extrabold text-[var(--mantine-color-text)]">Progression review pending</p>
              <Badge color="danger">{countLabel}</Badge>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-[var(--mantine-color-dimmed)]">
              {firstDecision.movementName}: {firstDecision.recommendation}
            </p>
          </div>
        </div>
        <Button color="danger" variant="filled" className="w-full sm:w-auto" onClick={onReview}>
          Review
        </Button>
      </div>
    </Card>
  )
}

export function PendingProgressionReviewModal({
  opened,
  decisions,
  isSaving = false,
  onClose,
  onResolve,
}: {
  opened: boolean
  decisions: ProgressionDecision[]
  isSaving?: boolean
  onClose: () => void
  onResolve: (decisionId: string, action: ProgressionDecisionResolution) => void
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Progression review"
      size="md"
      classNames={{
        inner: '!items-end sm:!items-center',
        content: '!mb-0 !flex !max-h-[90dvh] !flex-col !overflow-hidden !rounded-b-none !border !border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)] sm:!mb-auto sm:!rounded-lg',
        header: '!bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        title: 'text-lg font-bold !text-[var(--mantine-color-text)]',
        body: '!min-h-0 !flex-1 !overflow-hidden !text-[var(--mantine-color-text)]',
        close: '!text-[var(--mantine-color-dimmed)] hover:!bg-[var(--vf-surface-2)] hover:!text-[var(--mantine-color-text)]',
      }}
    >
      <div className="grid max-h-[calc(90dvh-5rem)] min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
        <div className="rounded-lg border border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-[var(--vf-danger-text)]" size={18} />
            <div>
              <p className="text-sm font-extrabold">Review before the next block</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">
                Accepting updates future loads. Dismissing clears the recommendation. Later leaves it pending.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          {decisions.length ? (
            decisions.map((decision) => (
              <ProgressionDecisionCard
                key={decision.id}
                decision={decision}
                isSaving={isSaving}
                onResolve={onResolve}
                onLater={onClose}
              />
            ))
          ) : (
            <ReviewModalStatus>No pending progression decisions.</ReviewModalStatus>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ProgressionDecisionCard({
  decision,
  isSaving,
  onLater,
  onResolve,
}: {
  decision: ProgressionDecision
  isSaving: boolean
  onLater: () => void
  onResolve: (decisionId: string, action: ProgressionDecisionResolution) => void
}) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold">{decision.movementName}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
            {formatRuleId(decision.ruleId)}
          </p>
        </div>
        <Badge color="danger">Pending</Badge>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">{decision.inputSummary}</p>
      <p className="mt-1 text-sm font-semibold">{decision.recommendation}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <ReviewActionButton
          color="success"
          disabled={isSaving}
          icon={<Check size={15} />}
          label="Accept"
          onClick={() => onResolve(decision.id, 'accepted')}
        />
        <ReviewActionButton
          disabled={isSaving}
          icon={<Clock3 size={15} />}
          label="Later"
          onClick={onLater}
          variant="default"
        />
        <ReviewActionButton
          color="danger"
          disabled={isSaving}
          icon={<X size={15} />}
          label="Dismiss"
          onClick={() => onResolve(decision.id, 'dismissed')}
        />
      </div>
    </div>
  )
}

function ReviewActionButton({
  color,
  disabled,
  icon,
  label,
  onClick,
  variant = 'light',
}: {
  color?: 'success' | 'danger'
  disabled?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'light'
}) {
  return (
    <Button color={color} disabled={disabled} variant={variant} onClick={onClick}>
      {icon}
      {label}
    </Button>
  )
}

function ReviewModalStatus({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 text-sm text-[var(--mantine-color-dimmed)]">
      {children}
    </p>
  )
}

function formatRuleId(ruleId: string) {
  return ruleId.replaceAll('_', ' ')
}
