import { Tabs } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { PendingProgressionReviewModal } from '~/domains/program/components/PendingReview'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import type { MovementSortKey, SortDir } from '~/domains/history/lib/insights'
import type { LedgerFilter } from '~/domains/history/lib/session-ledger'
import type { HistoryTab } from '~/domains/history/lib/history-tabs'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import { resolveInsightGates } from '~/domains/history/lib/insight-gates'
import { resolveInsightGating } from '~/domains/history/lib/insight-state'
import { sessionQueryOptions } from '~/domains/session/queries'
import { EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
import { WorkoutSummaryModal } from './WorkoutSummaryModal'
import { InsightsHeader } from './InsightsHeader'
import { InsightTabs } from './InsightTabs'

const BodyLoadTab = lazy(() => import('./tabs/BodyLoadTab').then((module) => ({ default: module.BodyLoadTab })))
const MovementsTab = lazy(() => import('./tabs/MovementsTab').then((module) => ({ default: module.MovementsTab })))
const OverviewTab = lazy(() => import('./tabs/OverviewTab').then((module) => ({ default: module.OverviewTab })))
const RecordsTab = lazy(() => import('./tabs/RecordsTab').then((module) => ({ default: module.RecordsTab })))
const SessionsTab = lazy(() => import('./tabs/SessionsTab').then((module) => ({ default: module.SessionsTab })))
const StrengthTab = lazy(() => import('./tabs/StrengthTab').then((module) => ({ default: module.StrengthTab })))

/** Tabs whose cards respond to the global range switch. */
const RANGED_TABS: HistoryTab[] = ['overview', 'strength', 'sessions', 'movements']

export { HISTORY_TAB_VALUES } from '~/domains/history/lib/history-tabs'
export type { HistoryTab } from '~/domains/history/lib/history-tabs'

export function HistoryPage({
  user,
  initialTab,
}: {
  user: AuthUser | null
  initialTab?: HistoryTab
}) {
  // Movement detail is a child route; without this the tab shell would render over it.
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== '/history') return <Outlet />
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to see training insights">Completed sessions appear here.</EmptyState>
      </Page>
    )
  }
  return <AuthedHistory initialTab={initialTab} />
}

function AuthedHistory({ initialTab }: { initialTab?: HistoryTab }) {
  const userId = useRequiredAccountId()
  const historyQuery = useQuery(historyDashboardQueryOptions(userId))
  const programOverviewQuery = useQuery(programOverviewQueryOptions(userId))
  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab ?? 'overview')
  const [range, setRange] = useState<InsightRange>('8w')
  const [movementQuery, setMovementQuery] = useState('')
  const [movementCategory, setMovementCategory] = useState<string | null>(null)
  const [movementSort, setMovementSort] = useState<{ key: MovementSortKey; dir: SortDir }>({ key: 'volume', dir: 'desc' })
  const [sessionFilter, setSessionFilter] = useState<LedgerFilter>('all')
  const [decisionReviewOpen, setDecisionReviewOpen] = useState(false)
  const [sessionSearch, setSessionSearch] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const selectedSessionQuery = useQuery({
    ...sessionQueryOptions(userId, selectedSessionId ?? ''),
    enabled: Boolean(selectedSessionId),
  })

  if (historyQuery.isPending) return <PageSkeleton />
  if (historyQuery.isError) return <PageLoadError error={historyQuery.error} onRetry={() => void historyQuery.refetch()} />

  const data = historyQuery.data
  const programOverview = programOverviewQuery.data ?? null
  const activeProgramTitle = programOverview?.activeProgram?.title ?? null
  const selectedHistoryEntry = data.recentSessions.find((session) => session.id === selectedSessionId) ?? null
  const gating = resolveInsightGating({
    completedSessions: data.overview.completedSessions,
    lastCompletedAt: data.overview.latestTrainingDate ?? null,
    now: data.insights.today,
    program: programOverview?.activeProgram
      ? {
          status: programOverview.activeProgram.status,
          weekNumber: programOverview.position?.weekNumber ?? null,
          hardness: programOverview.position?.hardness ?? null,
        }
      : null,
  })

  const gates = resolveInsightGates({
    liftSeries: data.insights.liftSeries,
    weeklyVolume: data.insights.weeklyVolume,
    weeklyRegionSets: data.insights.weeklyRegionSets,
    consistency: data.insights.consistency,
    calibration: data.insights.calibration,
    strengthScore: data.insights.strengthScore,
  })

  return (
    <Page className="max-w-[1400px] md:px-8 lg:px-10">
      <InsightsHeader
        gating={gating}
        completedSessions={data.overview.completedSessions}
        range={range}
        showRange={RANGED_TABS.includes(activeTab)}
        onRangeChange={setRange}
      />

      <InsightTabs value={activeTab} onChange={setActiveTab}>
        <Tabs.Panel value="overview">
          <HistoryTabBoundary>
            <OverviewTab
              data={data}
              gating={gating}
              gates={gates}
              range={range}
              programOverview={programOverview}
              activeProgramTitle={activeProgramTitle}
              onNavigate={setActiveTab}
            />
          </HistoryTabBoundary>
        </Tabs.Panel>
        <Tabs.Panel value="strength">
          <HistoryTabBoundary>
            <StrengthTab
              insights={data.insights}
              gating={gating}
              range={range}
              programOverview={programOverview}
              completedSessions={data.overview.completedSessions}
            />
          </HistoryTabBoundary>
        </Tabs.Panel>
        <Tabs.Panel value="body-load">
          <HistoryTabBoundary>
            <BodyLoadTab data={data} gating={gating} />
          </HistoryTabBoundary>
        </Tabs.Panel>
        <Tabs.Panel value="movements">
          <HistoryTabBoundary>
            <MovementsTab
              data={data}
              range={range}
              query={movementQuery}
              onQueryChange={setMovementQuery}
              category={movementCategory}
              onCategoryChange={setMovementCategory}
              sort={movementSort}
              onSortChange={setMovementSort}
            />
          </HistoryTabBoundary>
        </Tabs.Panel>
        <Tabs.Panel value="records">
          <HistoryTabBoundary>
            <RecordsTab data={data} milestones={data.insights.milestones} />
          </HistoryTabBoundary>
        </Tabs.Panel>
        <Tabs.Panel value="sessions">
          <HistoryTabBoundary>
            <SessionsTab
              data={data}
              range={range}
              activeProgramTitle={activeProgramTitle}
              pendingDecisions={programOverview?.pendingDecisions ?? []}
              onOpenSession={setSelectedSessionId}
              onReviewDecisions={() => setDecisionReviewOpen(true)}
              filter={sessionFilter}
              onFilterChange={setSessionFilter}
              search={sessionSearch}
              onSearchChange={setSessionSearch}
            />
          </HistoryTabBoundary>
        </Tabs.Panel>
      </InsightTabs>

      {/* Decisions are keyed to the programme instance, never to a session, so the review opened
          from here is the programme's ledger and says so. */}
      <PendingProgressionReviewModal
        opened={decisionReviewOpen}
        decisions={programOverview?.pendingDecisions ?? []}
        contextLabel={activeProgramTitle ?? undefined}
        onClose={() => setDecisionReviewOpen(false)}
      />

      <WorkoutSummaryModal
        open={Boolean(selectedSessionId)}
        fallback={selectedHistoryEntry}
        session={selectedSessionQuery.data}
        isLoading={selectedSessionQuery.isPending}
        error={selectedSessionQuery.error}
        onClose={() => setSelectedSessionId(null)}
      />
    </Page>
  )
}

function HistoryTabBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-40" aria-label="Loading insights" />}>
      {children}
    </Suspense>
  )
}
