import { ActionIcon, Badge, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, ChevronRight, Minus, TrendingUp } from 'lucide-react'
import { Caption, Heading, Panel, Text } from '~/components'
import { decisionUpdate, type DecisionUpdate } from '~/domains/session/lib/summary-decisions'
import type { ProgressionDecision, Unit } from '~/shared/types'

export type DecidedState = 'applied' | 'kept'

/**
 * The Session Summary v2 hero: when load updates are pending it leads with each lift's from → to (+delta)
 * and inline Apply / Keep, plus an "Apply all" (desktop here; mobile uses the page's sticky bar, so this
 * shows "Review each instead"). Once every decision is made it flips to a green "Back to Today" confirmation.
 */
export function SessionSummaryDecisionHero({
  decisions,
  decided,
  units,
  isSaving,
  appliedCount,
  onApply,
  onKeep,
  onApplyAll,
  onReviewEach,
}: {
  decisions: ProgressionDecision[]
  decided: Map<string, DecidedState>
  units: Unit
  isSaving: boolean
  appliedCount: number
  onApply: (id: string) => void
  onKeep: (id: string) => void
  onApplyAll: () => void
  onReviewEach: () => void
}) {
  const pendingCount = decisions.filter((decision) => !decided.has(decision.id)).length

  if (pendingCount === 0) return <DonePanel appliedCount={appliedCount} />

  return (
    <Panel p={0} style={{ borderColor: 'var(--vf-action-border)' }}>
      <div
        className="p-4 sm:p-5"
        style={{ backgroundColor: 'var(--vf-action-soft)', borderBottom: '1px solid var(--vf-action-border)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--mantine-primary-color-filled)' }}
          >
            <TrendingUp size={20} color="var(--mantine-color-white)" />
          </span>
          <div className="min-w-0">
            <Heading order={2} size="h4" lh={1.15}>
              {pendingCount} load update{pendingCount === 1 ? '' : 's'} ready
            </Heading>
            <Text mt={2} size="sm" tone="success">
              You hit your targets — Sheetless suggests adding weight.
            </Text>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-3 sm:p-4">
        {decisions.map((decision) => (
          <DecisionRow
            key={decision.id}
            update={decisionUpdate(decision, units)}
            state={decided.get(decision.id)}
            isSaving={isSaving}
            onApply={() => onApply(decision.id)}
            onKeep={() => onKeep(decision.id)}
          />
        ))}

        <div className="hidden lg:block">
          <Button fullWidth size="md" radius="md" mt={4} loading={isSaving} onClick={onApplyAll}>
            <Check size={18} />
            Apply all {pendingCount} &amp; finish
          </Button>
          <Caption component="p" ta="center" mt={8} lh={1.4}>
            Applies to your next workout. You can change loads anytime in Your Plan.
          </Caption>
        </div>
        <Button variant="default" fullWidth radius="md" mt={4} onClick={onReviewEach}>
          Review each instead
          <ChevronRight size={15} />
        </Button>
      </div>
    </Panel>
  )
}

function DecisionRow({
  update,
  state,
  isSaving,
  onApply,
  onKeep,
}: {
  update: DecisionUpdate
  state?: DecidedState
  isSaving: boolean
  onApply: () => void
  onKeep: () => void
}) {
  const applied = state === 'applied'
  const negative = typeof update.delta === 'number' && update.delta < 0

  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3"
      style={{
        borderColor: applied ? 'var(--vf-success-border)' : 'var(--mantine-color-default-border)',
        backgroundColor: applied ? 'var(--vf-success-soft)' : 'var(--vf-surface-2)',
      }}
    >
      <div className="min-w-0 flex-1">
        <Text size="sm" fw={800} truncate>{update.name}</Text>
        {update.isNumeric ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <Caption component="span">{update.fromLabel}</Caption>
            <ArrowRight size={13} color="var(--vf-action-text)" />
            <Text component="span" size="sm" fw={800} tone="action">{update.toLabel}</Text>
            {update.deltaLabel ? (
              <Badge color={negative ? 'warning' : 'success'} variant="light" size="xs">{update.deltaLabel}</Badge>
            ) : null}
          </div>
        ) : (
          <Caption component="p" mt={2}>{update.recommendation}</Caption>
        )}
      </div>

      {state ? (
        <span className="flex shrink-0 items-center gap-1">
          {applied ? (
            <Check size={14} color="var(--vf-success-text)" />
          ) : (
            <Minus size={14} color="var(--mantine-color-dimmed)" />
          )}
          <Caption fw={700} tone={applied ? 'success' : 'dimmed'}>{applied ? 'Applied' : 'Kept'}</Caption>
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <ActionIcon
            variant="filled"
            color="action"
            size="lg"
            radius="md"
            disabled={isSaving}
            aria-label={`Apply ${update.name}`}
            onClick={onApply}
          >
            <Check size={17} />
          </ActionIcon>
          <Button variant="default" size="xs" disabled={isSaving} onClick={onKeep}>
            Keep
          </Button>
        </div>
      )}
    </div>
  )
}

function DonePanel({ appliedCount }: { appliedCount: number }) {
  const applied = appliedCount > 0
  return (
    <Panel p="lg" style={{ borderColor: 'var(--vf-success-border)' }}>
      <div className="flex flex-col items-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--vf-success-soft)' }}
        >
          <Check size={26} color="var(--vf-success-text)" />
        </div>
        <Heading order={2} size="h4" mt="sm" ta="center">
          {applied ? 'Next workout updated' : 'All set'}
        </Heading>
        <Text mt={4} size="sm" tone="dimmed" lh={1.5} ta="center">
          {applied
            ? `${appliedCount} load${appliedCount === 1 ? '' : 's'} increased for your next session. Nothing else to do.`
            : 'You kept your current loads. Nothing else to do.'}
        </Text>
        <Link to="/today" className="mt-4 w-full">
          <Button fullWidth size="md" radius="md">Back to Today</Button>
        </Link>
      </div>
    </Panel>
  )
}
