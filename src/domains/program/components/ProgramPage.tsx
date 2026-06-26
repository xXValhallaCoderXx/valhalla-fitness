import { Badge, Button } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { EmptyState, Page, PageHeader, PageLoadError, PageSkeleton, Caption, Text } from '~/components'
import { buildProgramTimeline } from '~/domains/program/lib/program-timeline'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { CurrentLoadsCard, CustomizationCard, ProgramLoadChips } from './ProgramLoads'
import { ProgramMobileSection } from './ProgramMobileSection'
import { RecentProgramSessions } from './ProgramRecentSessions'
import { ProgramSummaryGrid } from './ProgramSummaryGrid'
import { ProgramTimeline } from './ProgramTimeline'
import { PendingProgressionReviewModal, PendingReviewAlert, useResolveProgressionDecision } from './PendingReview'

export function ProgramPage({ user }: { user: unknown }) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to review your program">Program timelines and load state are account data.</EmptyState>
      </Page>
    )
  }
  return <AuthedProgram />
}

function AuthedProgram() {
  const overviewQuery = useQuery(programOverviewQueryOptions())
  const [reviewOpen, setReviewOpen] = useState(false)
  const [resolvedDecisionIds, setResolvedDecisionIds] = useState<Set<string>>(() => new Set())
  const pendingDecisions = (overviewQuery.data?.pendingDecisions ?? []).filter((decision) => !resolvedDecisionIds.has(decision.id))
  const decisionMutation = useResolveProgressionDecision({
    onResolved: (decisionId) => {
      setResolvedDecisionIds((current) => new Set(current).add(decisionId))
      const remainingDecisions = (overviewQuery.data?.pendingDecisions ?? []).filter(
        (decision) => decision.id !== decisionId && !resolvedDecisionIds.has(decision.id),
      )
      if (!remainingDecisions.length) setReviewOpen(false)
    },
  })

  if (overviewQuery.isPending) return <PageSkeleton />
  if (overviewQuery.isError) return <PageLoadError error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} />

  const overview = overviewQuery.data
  const program = overview.activeProgram

  if (!program) {
    return (
      <Page>
        <EmptyState
          centered
          title="No active program"
          action={
            <Link to="/templates">
              <Button>Browse plans</Button>
            </Link>
          }
        >
          Choose a training template to view your program timeline, progression schedule, and current training loads.
        </EmptyState>
      </Page>
    )
  }

  const timeline = buildProgramTimeline(program, program.templateDefinition)

  return (
    <Page>
      <PageHeader
        title={program.title}
        eyebrow="Your Plan"
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {program.customizationStatus === 'customized' ? <Badge color="warning">Customized</Badge> : null}
            <Badge color="action">Week {overview.position?.weekNumber ?? timeline.currentWeekIndex + 1} of {timeline.totalWeeks}</Badge>
          </div>
        }
      >
        <Text component="span" className="block">
          {overview.position?.weekSummary ?? timeline.description}
        </Text>
        <Caption component="span" className="mt-1 block" fw={600}>
          Current position: {overview.position?.phaseLabel ?? 'Current phase'} · session {overview.position?.sessionNumber ?? timeline.currentSessionInWeek + 1} of {timeline.daysPerWeek}
        </Caption>
      </PageHeader>

      <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />

      <ProgramSummaryGrid overview={overview} timeline={timeline} />

      <ProgramLoadChips overview={overview} program={program} />

      {program.customizationStatus === 'customized' ? (
        <div className="hidden lg:block">
          <CustomizationCard program={program} />
        </div>
      ) : null}

      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ProgramTimeline key={timeline.currentWeekIndex} timeline={timeline} status={program.status} currentSessionIndex={program.currentWeekIndex} />

        <div className="space-y-4">
          <CurrentLoadsCard overview={overview} program={program} />
          <RecentProgramSessions overview={overview} />
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        <ProgramMobileSection title="Full timeline" badge={`${timeline.totalWeeks} weeks`}>
          <ProgramTimeline key={`mobile-${timeline.currentWeekIndex}`} timeline={timeline} status={program.status} currentSessionIndex={program.currentWeekIndex} />
        </ProgramMobileSection>
        <ProgramMobileSection title="Current loads" badge={program.units}>
          <CurrentLoadsCard overview={overview} program={program} />
        </ProgramMobileSection>
        <ProgramMobileSection title="Recent sessions" badge={overview.recentSessions.length}>
          <RecentProgramSessions overview={overview} />
        </ProgramMobileSection>
        {program.customizationStatus === 'customized' ? (
          <ProgramMobileSection title="Customization" badge="Custom">
            <CustomizationCard program={program} />
          </ProgramMobileSection>
        ) : null}
      </div>

      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        isSaving={decisionMutation.isPending}
        onClose={() => setReviewOpen(false)}
        onResolve={(decisionId, action) => decisionMutation.mutate({ decisionId, action })}
      />
    </Page>
  )
}
