import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Dumbbell, ListChecks, NotebookText, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { sessionQueryOptions } from '~/domains/session/queries'
import type { SessionSummary, WorkoutSession } from '~/domains/session'
import { Caption, EmptyState, Heading, Page, PageLoadError, PageSkeleton, SectionLabel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { buildSessionReceipt } from '~/domains/session/lib/session-receipt'
import { buildWorkoutSummary, topSetCountExplanation } from '~/domains/history/lib/workout-summary'
import { summaryHeadline, updatesStat } from '~/domains/session/lib/summary-decisions'
import { SessionSummaryDecisionHero, type DecidedState } from './SessionSummaryDecisionHero'
import { PendingProgressionReviewModal, useResolveProgressionDecision } from '~/domains/program/components/PendingReview'
import { PostWorkoutFeedbackPrompt } from '~/domains/feedback/components/PostWorkoutFeedbackPrompt'
import { resolveProgressionDecisionsFn } from '~/domains/program/server/program-functions'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { useStableProgramMutationRequest } from '~/domains/program/lib/useStableProgramMutationRequest'
import { CompletedWorkCard, PrBanner, ReflectionRow, SummaryStat, WhatChangedCard } from './SessionSummaryDetails'

export function SessionSummaryPage({
  sessionId,
  user,
}: {
  sessionId: string
  user: AuthUser | null
}) {
  const sessionQuery = useQuery({
    ...sessionQueryOptions(user?.id ?? '', sessionId),
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
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()
  const summary = queryClient.getQueryData<SessionSummary>(
    accountQueryKeys.summary(userId, sessionId),
  )
  const recap = buildWorkoutSummary(session)
  const receipt = buildSessionReceipt(session, summary)
  const allDecisions = summary?.decisions ?? []

  const [reviewOpen, setReviewOpen] = useState(false)
  const [decided, setDecided] = useState<Map<string, DecidedState>>(() => new Map())
  const applyAllRequest = useStableProgramMutationRequest()
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
    mutationFn: (ids: string[]) =>
      resolveProgressionDecisionsFn({
        data: {
          decisionIds: ids,
          action: 'accepted',
          requestId: applyAllRequest.requestIdFor({
            decisionIds: ids,
            action: 'accepted',
          }),
        },
      }),
    onSuccess: async (ids) => {
      applyAllRequest.clearRequest()
      setDecided((current) => {
        const next = new Map(current)
        for (const id of ids) next.set(id, 'applied')
        return next
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
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
  const effort = session.sessionRpe ?? null
  const reflectionWin = session.reflectionWin?.trim()
  const reflectionImprove = session.reflectionImprove?.trim()
  const hasReflection = effort !== null || Boolean(reflectionWin) || Boolean(reflectionImprove) || Boolean(notes)

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

      {session.prs?.length ? <PrBanner prs={session.prs} units={session.units} /> : null}

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
            <SummaryStat
              icon={<Trophy size={15} />}
              label="Top/AMRAP sets"
              value={recap.stats.topSetCount}
              hint={topSetCountExplanation}
            />
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

          {hasReflection ? (
            <Card>
              <div className="flex items-center gap-2">
                <NotebookText size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <SectionLabel>Your reflection</SectionLabel>
              </div>
              <div className="mt-2 space-y-2">
                {effort !== null ? (
                  <div className="flex items-baseline gap-2">
                    <Caption fw={800} tt="uppercase">Effort</Caption>
                    <Text size="sm" fw={800}>{effort}/10</Text>
                  </div>
                ) : null}
                {reflectionWin ? <ReflectionRow label="Went well" value={reflectionWin} /> : null}
                {reflectionImprove ? <ReflectionRow label="Work on" value={reflectionImprove} /> : null}
                {notes ? <ReflectionRow label="Notes" value={notes} /> : null}
              </div>
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
