import { useExperienceMode } from '~/domains/account/components'
import { buildCycleInspector } from '~/domains/program/lib/cycle-inspector'
import { CycleInspectorPanel } from './inspector/CycleInspectorPanel'
import { ReturnGuideCard } from './return/ReturnGuideCard'
import { Button } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { EmptyState, Page, PageLoadError, PageSkeleton, InspectorLayout } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { buildProgramTimeline } from '~/domains/program/lib/program-timeline'
import { buildProgramPhaseMap } from '~/domains/program/lib/program-phase-map'
import { buildProgramTrajectory } from '~/domains/program/lib/program-trajectory'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { ProgramCommandBar } from './ProgramCommandBar'
import { CurrentLoadsCard } from './ProgramLoads'
import { RecentProgramSessions } from './ProgramRecentSessions'
import { ProgramTimeline } from './ProgramTimeline'
import { PendingProgressionReviewModal, PendingReviewAlert } from './PendingReview'

export function ProgramPage({ user }: { user: AuthUser | null }) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to review your programme">Programme timelines and load state are account data.</EmptyState>
      </Page>
    )
  }
  return <AuthedProgram />
}

function AuthedProgram() {
  const userId = useRequiredAccountId()
  const { isFull } = useExperienceMode()
  const overviewQuery = useQuery(programOverviewQueryOptions(userId))
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
          title="No active programme"
          action={
            <Link to="/templates">
              <Button>Browse plans</Button>
            </Link>
          }
        >
          Choose a training template to view your programme timeline, progression schedule, and current training loads.
        </EmptyState>
      </Page>
    )
  }

  // The server always pins a definition on the active program (with its own fallback), so a
  // missing one means a partial payload — retry rather than crash on a client-side fallback
  // (the catalogue lookup throws for custom template ids and would bloat the bundle anyway).
  const definition = program.templateDefinition
  if (!definition) {
    return <PageLoadError error={new Error('Programme definition unavailable')} onRetry={() => void overviewQuery.refetch()} />
  }

  const timeline = buildProgramTimeline(program, definition)
  const phaseMap = buildProgramPhaseMap(timeline)
  const trajectory = buildProgramTrajectory({
    definition,
    currentGlobalIndex: program.currentWeekIndex,
    loadAdjustments: program.loadAdjustments,
    returnSettings: program.returnPeriod?.status === 'active' || program.returnPeriod?.status === 'review' ? program.returnPeriod.settings : undefined,
    rounding: program.rounding,
    units: program.units,
    stateValues: overview.stateValues,
    acceptedDecisions: overview.acceptedDecisions,
    sessionStamps: overview.sessionStamps,
  })

  // The trajectory's forward numbers are top-set loads for the heaviest upcoming week, not
  // training maxes — the panel labels them as such.
  const projectedByMovement = Object.fromEntries(
    (trajectory.phases.find((phase) => phase.projected)?.projected?.values ?? []).map((pill) => [
      pill.movementId,
      pill.value,
    ]),
  )
  const cycleModel = buildCycleInspector({
    definition,
    weekNumber: phaseMap.currentWeekNumber,
    totalWeeks: phaseMap.totalWeeks,
    stateValues: overview.stateValues,
    decisions: [...overview.pendingDecisions, ...overview.acceptedDecisions],
    projectedByMovement,
  })

  return (
    <Page>
      <ReturnGuideCard program={program} hasActiveSession={overview.hasActiveSession} />
      <ProgramCommandBar overview={overview} program={program} phaseMap={phaseMap} />

      <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />

      <InspectorLayout inspector={<CycleInspectorPanel model={cycleModel} units={program.units} />}>
        {/* With the inspector docked there is not room for a third track, so the loads and recent
            sessions stack under the timeline instead of sitting beside it. */}
        <div className={isFull ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]'}>
          <ProgramTimeline key={trajectory.currentWeekNumber} trajectory={trajectory} />

          <div className="space-y-4">
            <CurrentLoadsCard overview={overview} program={program} />
            <RecentProgramSessions overview={overview} />
          </div>
        </div>
      </InspectorLayout>

      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        onClose={() => setReviewOpen(false)}
        onResolved={(decisionId) => setResolvedDecisionIds((current) => new Set(current).add(decisionId))}
      />
    </Page>
  )
}
