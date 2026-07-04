import { Button } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
import { buildProgramTimeline } from '~/domains/program/lib/program-timeline'
import { buildProgramPhaseMap } from '~/domains/program/lib/program-phase-map'
import { buildProgramTrajectory } from '~/domains/program/lib/program-trajectory'
import { getFallbackTemplateDefinition } from '~/domains/program/lib/template-definitions'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { ProgramCommandBar } from './ProgramCommandBar'
import { CurrentLoadsCard } from './ProgramLoads'
import { RecentProgramSessions } from './ProgramRecentSessions'
import { ProgramTimeline } from './ProgramTimeline'
import { PendingProgressionReviewModal, PendingReviewAlert } from './PendingReview'

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
  const phaseMap = buildProgramPhaseMap(timeline)
  const trajectory = buildProgramTrajectory({
    definition: program.templateDefinition ?? getFallbackTemplateDefinition(program.templateId),
    currentGlobalIndex: program.currentWeekIndex,
    rounding: program.rounding,
    units: program.units,
    stateValues: overview.stateValues,
    acceptedDecisions: overview.acceptedDecisions,
    sessionStamps: overview.sessionStamps,
  })

  return (
    <Page>
      <ProgramCommandBar overview={overview} program={program} phaseMap={phaseMap} />

      <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ProgramTimeline key={trajectory.currentWeekNumber} trajectory={trajectory} />

        <div className="space-y-4">
          <CurrentLoadsCard overview={overview} program={program} />
          <RecentProgramSessions overview={overview} />
        </div>
      </div>

      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        onClose={() => setReviewOpen(false)}
        onResolved={(decisionId) => setResolvedDecisionIds((current) => new Set(current).add(decisionId))}
      />
    </Page>
  )
}
