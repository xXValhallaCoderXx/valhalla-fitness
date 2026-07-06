import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Box, Button, Card } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Dumbbell, ListChecks, NotebookText, Sparkles, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { sessionQueryOptions } from '~/domains/session/queries'
import type { SessionSummary, WorkoutSession } from '~/shared/types'
import { Caption, EmptyState, Heading, Page, PageLoadError, PageSkeleton, Panel, SectionLabel, StatValue, Text } from '~/components'
import { cn } from '~/shared/lib/cn'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { buildSessionReceipt, type ReceiptEntry, type ReceiptTone } from '~/domains/session/lib/session-receipt'
import { buildWorkoutSummary, type SummaryExercise } from '~/domains/history/lib/workout-summary'
import { summaryHeadline, updatesStat } from '~/domains/session/lib/summary-decisions'
import { SessionSummaryDecisionHero, type DecidedState } from './SessionSummaryDecisionHero'
import { PendingProgressionReviewModal, useResolveProgressionDecision } from '~/domains/program/components/PendingReview'
import { DecisionFeedbackTrigger } from '~/domains/feedback/components/DecisionFeedback'
import { PostWorkoutFeedbackPrompt } from '~/domains/feedback/components/PostWorkoutFeedbackPrompt'
import { resolveProgressionDecisionFn } from '~/domains/program/server/program-functions'

export function SessionSummaryPage({ sessionId, user }: { sessionId: string; user: unknown }) {
  const sessionQuery = useQuery({
    ...sessionQueryOptions(sessionId),
    enabled: Boolean(user),
  })

  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to open this summary">Workout summaries are tied to your account.</EmptyState>
      </Page>
    )
  }

  if (sessionQuery.isPending) return <PageSkeleton />
  if (sessionQuery.isError) return <PageLoadError error={sessionQuery.error} onRetry={() => void sessionQuery.refetch()} />

  return <LoadedSummaryRoute sessionId={sessionId} session={sessionQuery.data} />
}

function LoadedSummaryRoute({ session, sessionId }: { session: WorkoutSession; sessionId: string }) {
  const queryClient = useQueryClient()
  const summary = queryClient.getQueryData<SessionSummary>(['summary', sessionId])
  const recap = buildWorkoutSummary(session)
  const receipt = buildSessionReceipt(session, summary)
  const allDecisions = summary?.decisions ?? []

  const [reviewOpen, setReviewOpen] = useState(false)
  const [decided, setDecided] = useState<Map<string, DecidedState>>(() => new Map())
  const pendingDecisions = allDecisions.filter((decision) => !decided.has(decision.id))
  const appliedCount = [...decided.values()].filter((state) => state === 'applied').length

  // Single Apply / Keep — reuse the shared resolve hook; mark the row instead of pruning it (decided rows
  // stay as quiet confirmations until all are done).
  const decisionMutation = useResolveProgressionDecision({
    onResolved: (decisionId, action) => {
      setDecided((current) => new Map(current).set(decisionId, action === 'accepted' ? 'applied' : 'kept'))
    },
  })

  // "Apply all" — accept every pending decision in one go, one toast.
  const applyAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((decisionId) => resolveProgressionDecisionFn({ data: { decisionId, action: 'accepted' as const } })))
      return ids
    },
    onSuccess: async (ids) => {
      setDecided((current) => {
        const next = new Map(current)
        for (const id of ids) next.set(id, 'applied')
        return next
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
        queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
      ])
      notifications.show({ color: 'success', title: 'Loads updated', message: 'Your next workout is ready.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not apply updates',
        message: getApiErrorMessage(error, 'Unable to apply the load updates'),
      })
    },
  })

  const isSaving = decisionMutation.isPending || applyAllMutation.isPending
  const hasPending = pendingDecisions.length > 0
  const headline = summaryHeadline(recap.completion.completed, recap.completion.planned)
  const updates = updatesStat(pendingDecisions.length, appliedCount)
  const notes = session.notes?.trim()

  const handleApplyAll = () => applyAllMutation.mutate(pendingDecisions.map((decision) => decision.id))

  const hero = (
    <SessionSummaryDecisionHero
      decisions={allDecisions}
      decided={decided}
      units={session.units}
      isSaving={isSaving}
      appliedCount={appliedCount}
      onApply={(id) => decisionMutation.mutate({ decisionId: id, action: 'accepted' })}
      onKeep={(id) => decisionMutation.mutate({ decisionId: id, action: 'dismissed' })}
      onApplyAll={handleApplyAll}
      onReviewEach={() => setReviewOpen(true)}
    />
  )

  return (
    <Page className="pb-40 lg:pb-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <SectionLabel>{session.title} · Session summary</SectionLabel>
          <Heading order={1} size="h2" lh={1.1} mt={4}>{headline}</Heading>
        </div>
        <div className="flex items-center gap-2">
          <Caption fw={600}>
            {recap.completion.completed} of {recap.completion.planned} sets · {recap.stats.durationMinutes} min
          </Caption>
          <Badge color="success">Completed</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Hero — leads on mobile (order-first), sticky right rail on desktop. */}
        <div className="order-first flex flex-col gap-3 lg:order-2 lg:sticky lg:top-4">
          {hero}
          {hasPending ? (
            <Link to="/today" className="hidden lg:block">
              <Text component="span" size="sm" fw={700} tone="dimmed" ta="center" className="block">
                Skip for now — back to Today
              </Text>
            </Link>
          ) : null}
        </div>

        {/* Recap (demoted). */}
        <div className="order-2 space-y-4 lg:order-1">
          <div className="vf-stat-strip">
            <SummaryStat icon={<Dumbbell size={15} />} label="Movements" value={recap.stats.movementCount} />
            <SummaryStat icon={<ListChecks size={15} />} label="Sets" value={`${recap.completion.completed}/${recap.completion.planned}`} />
            <SummaryStat icon={<Trophy size={15} />} label="Top sets" value={recap.stats.topSetCount} />
            <SummaryStat icon={<ArrowRight size={15} />} label="Updates" value={updates.value} tone={updates.tone} />
          </div>

          <Card>
            <SectionLabel>Completed work</SectionLabel>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {recap.exercises.map((exercise) => (
                <CompletedWorkCard key={exercise.id} exercise={exercise} />
              ))}
            </div>
          </Card>

          {notes ? (
            <Card>
              <div className="flex items-center gap-2">
                <NotebookText size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <SectionLabel>Notes</SectionLabel>
              </div>
              <Text component="p" mt="xs" size="sm" tone="dimmed" lh={1.4}>{notes}</Text>
            </Card>
          ) : null}

          {receipt.length ? <WhatChangedCard receipt={receipt} sessionId={sessionId} /> : null}

          {/* Fresh finishes only: `summary` lives in the finish-time cache, so revisits skip the prompt. */}
          {summary && !session.isAdHoc && (allDecisions.length > 0 || receipt.length > 0) ? (
            <PostWorkoutFeedbackPrompt session={session} decisions={allDecisions} />
          ) : null}
        </div>
      </div>

      {/* Mobile sticky action bar — keeps the primary action reachable, offset above the app bottom nav. */}
      <div
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t p-3 backdrop-blur lg:hidden"
        style={{
          borderColor: 'var(--mantine-color-default-border)',
          backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 96%, transparent)',
          boxShadow: '0 -12px 36px rgb(0 0 0 / 0.12)',
        }}
      >
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2">
          {hasPending ? (
            <>
              <Button fullWidth size="md" loading={isSaving} onClick={handleApplyAll}>
                <Check size={18} />
                Apply all {pendingDecisions.length} &amp; finish
              </Button>
              <Link to="/today">
                <Text component="span" size="sm" fw={700} tone="dimmed" ta="center" className="block">
                  Skip for now — back to Today
                </Text>
              </Link>
            </>
          ) : (
            <Link to="/today">
              <Button fullWidth size="md">Back to Today</Button>
            </Link>
          )}
        </div>
      </div>

      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        contextLabel={session.title}
        onClose={() => setReviewOpen(false)}
        onResolved={(decisionId, action) => setDecided((current) => new Map(current).set(decisionId, action === 'accepted' ? 'applied' : 'kept'))}
      />
    </Page>
  )
}

function SummaryStat({
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

/** A demoted "Completed work" card, built from the shared `buildWorkoutSummary` exercise model. */
function CompletedWorkCard({ exercise }: { exercise: SummaryExercise }) {
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
function WhatChangedCard({ receipt, sessionId }: { receipt: ReceiptEntry[]; sessionId: string }) {
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
