import { Badge, Button } from '@mantine/core'
import { useRouter } from '@tanstack/react-router'
import { Activity, ListChecks, RotateCw } from 'lucide-react'
import { Heading, Page, PageHeader, Panel, SectionLabel, StatCard, Text } from '~/components'
import { OnboardingPanel } from '~/domains/onboarding/OnboardingPanel'
import { PendingProgressionReviewModal, PendingReviewAlert } from '~/domains/program/components/PendingReview'
import { AD_HOC_BADGE_LABEL, DEFAULT_AD_HOC_TITLE } from '~/domains/session/lib/ad-hoc'
import { countCompletedSets, isMeaningfulSyncState, nextIncompleteSetLabel } from '~/domains/session/lib/today-page'
import { countPlannedSets } from '~/domains/session/lib/today-numbers'
import type { HistoryDashboardWithInsights, ProgramOverview, ProgressionDecision, TodayPayload, WorkoutSession } from '~/shared/types'
import { SessionProgress, SyncPill } from '../Session'
import { ProgramProgressPanel, StreakBadge, WeeklyVolumePanel } from './TodayPanels'

/** Today view while a workout is live — resume card, progress stats, and side panels. */
export function TodayActiveSession({
  data,
  session,
  overview,
  history,
  pendingDecisions,
  reviewOpen,
  onReviewOpen,
  onReviewClose,
  onDecisionResolved,
}: {
  data: TodayPayload
  session: WorkoutSession
  overview?: ProgramOverview
  history?: HistoryDashboardWithInsights
  pendingDecisions: ProgressionDecision[]
  reviewOpen: boolean
  onReviewOpen: () => void
  onReviewClose: () => void
  onDecisionResolved: (decisionId: string) => void
}) {
  const router = useRouter()
  const isAdHoc = Boolean(session.isAdHoc)
  const nextIncompleteLabel = nextIncompleteSetLabel(session)
  const syncAction = isMeaningfulSyncState(session.syncState)
    ? <SyncPill state={session.syncState} />
    : null
  const completedSets = countCompletedSets(session)
  const totalSets = countPlannedSets(session)
  const completionPercent = totalSets ? Math.round((completedSets / totalSets) * 100) : 0
  const eyebrow =
    !isAdHoc && data.activeProgram && data.plannedSession
      ? `${data.activeProgram.title} · ${data.plannedSession.weekLabel}`
      : DEFAULT_AD_HOC_TITLE

  return (
    <Page className="max-w-5xl">
      <OnboardingPanel />
      <PageHeader
        title="Today"
        eyebrow={eyebrow}
        actions={syncAction}
      >
        Resume the workout currently in progress.
      </PageHeader>
      {pendingDecisions.length ? (
        <PendingReviewAlert decisions={pendingDecisions} onReview={onReviewOpen} className="mb-4" />
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel className="space-y-4 vf-card-hover" p="md" style={{ borderColor: 'var(--vf-action-border)' }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge color="action" variant="filled">In progress</Badge>
                {isAdHoc ? (
                  <Badge color="accent">{AD_HOC_BADGE_LABEL}</Badge>
                ) : (
                  <Badge color="warning">{session.hardness}</Badge>
                )}
                <StreakBadge history={history} />
              </div>
              <Heading order={2} size="h3" lh={1.15} className="truncate">
                {session.title}
              </Heading>
              <Text mt="xs" size="sm" tone="dimmed">
                {session.movements.length} movements
                {session.estimatedMinutes ? ` · ${session.estimatedMinutes} min` : ''}
              </Text>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => router.navigate({ to: '/sessions/$sessionId', params: { sessionId: session.sessionId } })}>
              <RotateCw size={16} />
              Resume workout
            </Button>
          </div>
          {nextIncompleteLabel ? (
            <Panel surface="inset" px="sm" py="xs">
              <SectionLabel>Next up</SectionLabel>
              <Text mt={2} size="sm" fw={800} truncate>{nextIncompleteLabel}</Text>
            </Panel>
          ) : null}
          <SessionProgress session={session} compact />
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard label="Completed sets" value={`${completedSets}/${totalSets}`} icon={<ListChecks size={15} />} />
          <StatCard label="Session progress" value={`${completionPercent}%`} icon={<Activity size={15} />} />
          {data.activeProgram ? (
            <>
              <ProgramProgressPanel overview={overview} />
              <WeeklyVolumePanel history={history} />
            </>
          ) : null}
        </div>
      </div>
      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        onClose={onReviewClose}
        onResolved={onDecisionResolved}
      />
    </Page>
  )
}
