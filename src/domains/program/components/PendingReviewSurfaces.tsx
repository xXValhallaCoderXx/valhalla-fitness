import { Badge, Button, Card, Popover } from '@mantine/core'
import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Text } from '~/components'
import { cn } from '~/shared/lib/cn'
import type { ProgressionDecision } from '~/domains/program'

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
