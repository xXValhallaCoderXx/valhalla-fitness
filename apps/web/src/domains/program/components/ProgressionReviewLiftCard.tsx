import { Badge, Button } from '@mantine/core'
import { ArrowRight, Check, Minus, Sparkles } from 'lucide-react'
import { Caption, FormulaChip, SectionLabel, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { decisionScopeLabel, decisionSubject } from '~/domains/program/lib/decision-labels'
import { DecisionFeedbackTrigger } from '~/domains/feedback/components/DecisionFeedback'
import type { ReviewDecisionView } from '~/domains/program/lib/progression-review'
import type { ProgressionDecision } from '~/domains/program'

export function ProgressionReviewLiftCard({
  decision,
  view,
  state,
  isSaving,
  onAccept,
  onKeep,
}: {
  decision: ProgressionDecision
  view: ReviewDecisionView
  state?: 'accepted' | 'kept'
  isSaving: boolean
  onAccept: () => void
  onKeep: () => void
}) {
  const { mode, isFull, showFormulas } = useExperienceMode()
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
            <Text size="md" fw={800} className={isFull ? 'font-mono' : undefined} truncate>
              {isFull ? decisionSubject(decision, mode) : view.name}
            </Text>
            {view.kindLabel ? <Badge color="action" variant="light" size="xs">{view.kindLabel}</Badge> : null}
            {/* A rule id is a machine identifier; Badge's uppercase would misspell it. */}
            {isFull ? (
              <Badge color="neutral" variant="light" size="xs" className="font-mono" tt="none">
                {decision.ruleId}
              </Badge>
            ) : null}
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

      {/* Full adds what the rule read and the arithmetic it produced. The rationale above is
          shipped copy and is shown in both modes — it is the explanation, not a Guided version. */}
      {isFull ? (
        <div className="mt-3">
          {/* With no rationale stored, `view.reason` already falls back to the input summary —
              printing it again here would just repeat the same sentence. */}
          {decision.inputSummary.trim() !== view.reason.trim() ? (
            <Caption component="p" lh={1.45}>{decision.inputSummary}</Caption>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {showFormulas && view.isNumeric && view.deltaLabel ? (
              <FormulaChip result={view.nextLabel ?? undefined}>
                {`${view.currentLabel} ${view.deltaLabel.startsWith('-') ? '−' : '+'} ${view.deltaLabel.replace(/^[+-]/, '')}`}
              </FormulaChip>
            ) : null}
            <Caption className="font-mono">{decisionScopeLabel(decision, mode)}</Caption>
          </div>
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
      <div className="mt-2">
        <DecisionFeedbackTrigger decision={decision} />
      </div>
    </div>
  )
}
