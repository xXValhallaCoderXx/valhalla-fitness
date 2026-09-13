import { ReturnSessionNotice } from './ReturnSessionNotice'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Dumbbell, ListChecks, NotebookText, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { sessionSummaryQueryOptions } from '~/domains/session/queries'
import type { SessionSummary } from '~/domains/session'
import {
  Caption,
  EmptyState,
  MobileActionBar,
  Page,
  PageSkeleton,
  SectionLabel,
  Text,
} from '~/components'
import { buildSessionReceipt } from '~/domains/session/lib/session-receipt'
import { buildWorkoutSummary, topSetCountExplanation } from '~/domains/history/lib/workout-summary'
import { summaryHeadline, updatesStat } from '~/domains/session/lib/summary-decisions'
import { SessionSummaryDecisionHero } from './SessionSummaryDecisionHero'
import { PendingProgressionReviewModal } from '~/domains/program/components/PendingReview'
import { PostWorkoutFeedbackPrompt } from '~/domains/feedback/components/PostWorkoutFeedbackPrompt'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { CompletedWorkCard, PrBanner, ReflectionRow, SummaryStat, WhatChangedCard } from './SessionSummaryDetails'
import { SessionSummaryHeader } from './SessionSummaryHeader'
import { SessionLoadError } from './SessionLoadError'
import { useSummaryProgression } from '../lib/useSummaryProgression'

export function SessionSummaryPage({
  sessionId,
  user,
}: {
  sessionId: string
  user: AuthUser | null
}) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to open this summary">Workout summaries are tied to your account.</EmptyState>
      </Page>
    )
  }

  return <AccountSummary key={`${user.id}-${sessionId}`} sessionId={sessionId} userId={user.id} />
}

function AccountSummary({ sessionId, userId }: { sessionId: string; userId: string }) {
  const queryClient = useQueryClient()
  const [freshFinish] = useState(() => Boolean(
    queryClient.getQueryData<SessionSummary>(accountQueryKeys.summary(userId, sessionId)),
  ))
  useEffect(() => {
    queryClient.removeQueries({ queryKey: accountQueryKeys.summary(userId, sessionId), exact: true })
  }, [queryClient, userId, sessionId])
  const summaryQuery = useQuery(sessionSummaryQueryOptions(userId, sessionId))

  if (summaryQuery.isError) return <SessionLoadError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
  if (summaryQuery.isPending || !summaryQuery.isFetchedAfterMount) return <PageSkeleton />

  return <LoadedSummaryRoute summary={summaryQuery.data} freshFinish={freshFinish} />
}

function LoadedSummaryRoute({ summary, freshFinish }: { summary: SessionSummary; freshFinish: boolean }) {
  const userId = useRequiredAccountId()
  const session = summary.session
  const sessionId = session.sessionId
  const recap = buildWorkoutSummary(session)
  const receiptAvailable = summary.decisionReceiptAvailable !== false
  const receipt = buildSessionReceipt(session, summary)
  const allDecisions = summary.decisions
  const [reviewOpen, setReviewOpen] = useState(false)
  const { decisionMutation, applyAllMutation, onResolved, decided, pendingDecisions, appliedCount } =
    useSummaryProgression(userId, sessionId, allDecisions)

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

  const hero = receiptAvailable ? (
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
  ) : (
    <Card>
      <Text size="sm">Progression details are unavailable for this older workout.</Text>
      <Button component={Link} to="/program" variant="default" mt="sm">Review current choices in Your Plan</Button>
    </Card>
  )

  return (
    <Page className="pb-40 lg:pb-8">
      <ReturnSessionNotice session={session} />
      <SessionSummaryHeader
        session={session}
        headline={headline}
        completedSets={recap.completion.completed}
        plannedSets={recap.completion.planned}
        durationMinutes={recap.stats.durationMinutes}
      />

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
            <SummaryStat icon={<ArrowRight size={15} />} label="Updates" value={receiptAvailable ? updates.value : 'Unavailable'} tone={updates.tone} />
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

          {/* Only the initial finish visit invites feedback; decisions always come from the saved receipt. */}
          {freshFinish && receiptAvailable && !session.isAdHoc && (allDecisions.length > 0 || receipt.length > 0) ? (
            <PostWorkoutFeedbackPrompt session={session} decisions={allDecisions} />
          ) : null}
        </div>
      </div>

      {/* Mobile sticky action bar — keeps the primary action reachable, offset above the app bottom nav. */}
      <MobileActionBar>
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
      </MobileActionBar>

      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={allDecisions}
        units={session.units}
        contextLabel={session.title}
        onClose={() => setReviewOpen(false)}
        onResolved={onResolved}
      />
    </Page>
  )
}
