import { Badge, Button, Card, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Clock3, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import { resolveProgressionDecisionFn } from '~/domains/program/server/program-functions'
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
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
        content: '!mb-0 !flex !max-h-[90dvh] !flex-col !overflow-hidden !rounded-b-none sm:!mb-auto sm:!rounded-lg',
        body: '!min-h-0 !flex-1 !overflow-hidden',
      }}
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        title: {
          color: 'var(--mantine-color-text)',
          fontSize: 'var(--mantine-font-size-lg)',
          fontWeight: 700,
        },
        body: {
          color: 'var(--mantine-color-text)',
        },
        close: {
          color: 'var(--mantine-color-dimmed)',
        },
      }}
    >
      <div className="grid max-h-[calc(90dvh-5rem)] min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
        <Card
          p="sm"
          style={{
            borderColor: 'var(--vf-danger-border)',
            backgroundColor: 'var(--vf-danger-soft)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0" style={{ color: 'var(--vf-danger-text)' }} size={18} />
            <div>
              <Text component="p" size="sm" fw={900}>
                Review before the next block
              </Text>
              <Caption component="p" mt={4} lh={1.5}>
                Accepting updates future loads. Dismissing clears the recommendation. Later leaves it pending.
              </Caption>
            </div>
          </div>
        </Card>

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
    <Panel surface="inset" p="sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Text component="p" fw={900}>
            {decision.movementName}
          </Text>
          <SectionLabel mt={4}>
            {formatRuleId(decision.ruleId)}
          </SectionLabel>
        </div>
        <Badge color="danger">Pending</Badge>
      </div>
      <Caption component="p" mt="sm" lh={1.5}>
        {decision.inputSummary}
      </Caption>
      <Text component="p" mt={4} size="sm" fw={700}>
        {decision.recommendation}
      </Text>
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
    </Panel>
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
    <Panel surface="inset" p="sm">
      <Text component="p" size="sm" tone="dimmed">
        {children}
      </Text>
    </Panel>
  )
}

function formatRuleId(ruleId: string) {
  return ruleId.replaceAll('_', ' ')
}
