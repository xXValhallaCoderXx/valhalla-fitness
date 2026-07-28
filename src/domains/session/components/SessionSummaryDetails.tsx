import { Badge, Box, Card } from '@mantine/core'
import { Check, Sparkles, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, StatValue, Text } from '~/components'
import { DecisionFeedbackTrigger } from '~/domains/feedback/components/DecisionFeedback'
import type { SummaryExercise } from '~/domains/history/lib/workout-summary'
import { prBannerTitle, prKindLabels } from '~/domains/session/lib/session-prs'
import type { ReceiptEntry, ReceiptTone } from '~/domains/session/lib/session-receipt'
import { cn } from '~/shared/lib/cn'
import { formatWeight } from '~/shared/lib/set-notation'
import type { SessionPr } from '~/domains/session'
import type { Unit } from '~/shared/types'

/** Finish-time celebration: the records this session broke, frozen server-side. */
export function PrBanner({ prs, units }: { prs: SessionPr[]; units: Unit }) {
  return (
    <Card
      data-testid="pr-banner"
      className="vf-pr-pop mb-4"
      style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)' }}
    >
      <div className="flex items-center gap-2">
        <Trophy size={16} color="var(--vf-success-text)" />
        <Heading order={2} size="h4">{prBannerTitle}</Heading>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {prs.map((pr) => (
          <div
            key={pr.movementId}
            className="rounded-lg border p-3"
            style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--mantine-color-default)' }}
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Text size="sm" fw={800} truncate>{pr.movementName}</Text>
              <Text size="sm" fw={900} style={{ color: 'var(--vf-success-text)' }}>
                {formatWeight(pr.load, units)} × {pr.reps}
              </Text>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pr.kinds.map((kind) => (
                <Badge key={kind} color="success" variant="light" size="xs">{prKindLabels[kind]}</Badge>
              ))}
            </div>
            {pr.previousLabel ? <Caption component="p" mt={6}>{pr.previousLabel}</Caption> : null}
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ReflectionRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Caption fw={800} tt="uppercase">{label}</Caption>
      <Text component="p" size="sm" tone="dimmed" lh={1.4}>{value}</Text>
    </div>
  )
}

export function SummaryStat({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  tone?: 'neutral' | 'warning' | 'success'
}) {
  const color = tone === 'warning' ? 'var(--vf-warning-text)' : tone === 'success' ? 'var(--vf-success-text)' : undefined
  return (
    <Panel surface="inset" p="sm" className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <Box c="dimmed" className="shrink-0">{icon}</Box>
        <StatValue c={color} size="md" ta="right" truncate>{value}</StatValue>
      </div>
      <Caption component="p" mt={4} fw={800} tt="uppercase">{label}</Caption>
    </Panel>
  )
}

/** A demoted "Completed work" card, built from the shared workout summary model. */
export function CompletedWorkCard({ exercise }: { exercise: SummaryExercise }) {
  const tagColor = exercise.role === 'main' ? 'action' : exercise.role === 'variation' ? 'accent' : 'success'
  return (
    <Panel surface="inset" p="sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Text size="sm" fw={800} truncate>{exercise.name}</Text>
          <Badge color={tagColor} variant="light" size="xs">{exercise.tagLabel}</Badge>
        </div>
        {exercise.hitEveryTarget ? (
          <span className="flex shrink-0 items-center gap-1">
            <Check size={13} color="var(--vf-success-text)" />
            <Caption fw={700} tone="success">Hit target</Caption>
          </span>
        ) : null}
      </div>
      <Caption mt={4}>{exercise.targetSummary} · best {exercise.bestSetLabel}</Caption>
      <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
        {exercise.sets.map((set) => (
          <span
            key={set.index}
            className="rounded-md border px-2 py-1"
            style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)' }}
          >
            <Caption fw={700} tone="success">{set.resultLabel}</Caption>
          </span>
        ))}
      </div>
    </Panel>
  )
}

function receiptToneStyle(tone: ReceiptTone) {
  if (tone === 'success') return { borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)' }
  if (tone === 'warning') return { borderColor: 'var(--vf-warning-border)', backgroundColor: 'var(--vf-warning-soft)' }
  return { borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--vf-surface-2)' }
}

function receiptChangeColor(tone: ReceiptTone) {
  if (tone === 'success') return 'var(--vf-success-text)'
  if (tone === 'warning') return 'var(--vf-warning-text)'
  return 'var(--mantine-color-text)'
}

function ReceiptRow({ entry, sessionId }: { entry: ReceiptEntry; sessionId: string }) {
  return (
    <div className="rounded-lg border p-3" style={receiptToneStyle(entry.tone)}>
      <Text size="sm" fw={700} truncate>{entry.movementName}</Text>
      <Text mt={1} size="sm" fw={900} lh={1.25} style={{ color: receiptChangeColor(entry.tone) }}>{entry.change}</Text>
      {entry.why ? (
        <Text mt={1} size="xs" tone="dimmed" lh={1.3} className="line-clamp-2">{entry.why}</Text>
      ) : null}
      {entry.decision ? (
        <div className="mt-1.5 -ml-2">
          <DecisionFeedbackTrigger decision={entry.decision} sessionId={sessionId} />
        </div>
      ) : null}
    </div>
  )
}

// Coaching "receipt" — kept as a secondary reference below the recap.
export function WhatChangedCard({ receipt, sessionId }: { receipt: ReceiptEntry[]; sessionId: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={15} style={{ color: 'var(--vf-action-text)' }} />
        <SectionLabel>What changed, and why</SectionLabel>
      </div>
      <div className={cn('mt-3 grid gap-2.5', 'sm:grid-cols-2')}>
        {receipt.map((entry, index) => (
          <ReceiptRow key={`${entry.movementName}-${index}`} entry={entry} sessionId={sessionId} />
        ))}
      </div>
    </Card>
  )
}
