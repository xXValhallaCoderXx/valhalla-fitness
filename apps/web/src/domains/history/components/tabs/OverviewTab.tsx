import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { formatCalendarRelativeDate } from '~/shared/lib/dates'
import { useAccountClock } from '~/domains/account/components/AccountIdentityProvider'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import type { HistoryDashboardWithInsights, InsightGating } from '~/domains/history'
import { lockedInsightSteps, type InsightGate, type InsightGateId } from '~/domains/history/lib/insight-gates'
import type { ProgramOverview } from '~/domains/program'
import { Caption, EmptyState, Heading, Panel, Text } from '~/components'
import { BodyweightTrendCard } from '../cards/BodyweightTrendCard'
import { MilestonesStrip } from '../cards/MilestonesStrip'
import { PlanPulseCard } from '../cards/PlanPulseCard'
import { formatLoad, type HistoryTab } from '../insight-format'
import { OverviewFooterPanels, RecentSessionsPanel } from './OverviewFooterPanels'
import { OverviewInsightGrid } from './OverviewInsightGrid'
import { OverviewKpiStrip, type OverviewKpi } from './OverviewKpiStrip'

export function OverviewTab({
  data,
  gating,
  gates,
  range,
  programOverview,
  activeProgramTitle,
  onOpenSession,
  onNavigate,
}: {
  data: HistoryDashboardWithInsights
  gating: InsightGating
  gates: Record<InsightGateId, InsightGate>
  range: InsightRange
  programOverview: ProgramOverview | null
  activeProgramTitle?: string | null
  onOpenSession: (sessionId: string) => void
  onNavigate: (tab: HistoryTab) => void
}) {
  const { insights } = data
  const clock = useAccountClock()
  const latestSession = data.recentSessions[0]

  const kpis: OverviewKpi[] = [
    { label: 'Sessions', value: data.overview.completedSessions },
    { label: 'Logged sets', value: data.overview.loggedSets },
    { label: 'Total volume', value: formatLoad(data.overview.completedVolume, data.overview.units) },
    { label: 'Movements', value: data.overview.uniqueMovements },
    {
      label: 'Latest',
      value: latestSession
        ? formatCalendarRelativeDate(latestSession.scheduledDate, clock.today)
        : '—',
      desktopOnly: true,
    },
  ]

  if (gating.lifecycle === 'empty') {
    return (
      <div className="space-y-4">
        <BodyweightTrendCard insights={insights} range={range} />
        <EmptyState
          centered
          title="No completed sessions yet"
          action={
            <Link to="/templates">
              <Button>Browse plans</Button>
            </Link>
          }
        >
          {activeProgramTitle
            ? `${activeProgramTitle} is active. Complete your first session to start building your strength trends, consistency, and volume.`
            : 'Complete a session to start building your strength trends, consistency, and volume.'}
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <BodyweightTrendCard insights={insights} range={range} />
      <OverviewKpiStrip kpis={kpis} />

      {gating.lifecycle === 'cold_start' ? (
        <>
          <Panel p="md">
            <Heading order={3} size="h4">
              First session logged 🎉
            </Heading>
            <Caption mt={4}>Insights unlock as you train:</Caption>
            <div className="mt-3 space-y-1.5">
              {lockedInsightSteps(gates).map((step) => (
                <Text key={step} size="sm" tone="dimmed">
                  • {step}
                </Text>
              ))}
            </div>
          </Panel>
          <RecentSessionsPanel data={data} onOpenSession={onOpenSession} onNavigate={onNavigate} />
        </>
      ) : (
        <>
          {gating.staleWelcomeBack ? (
            <Panel p="md">
              <Heading order={3} size="h4">
                Welcome back
              </Heading>
              <Caption mt={4}>
                It&apos;s been a while — the numbers below are from{' '}
                {formatCalendarRelativeDate(
                  data.overview.latestTrainingDate ?? latestSession?.scheduledDate ?? null,
                  clock.today,
                ).toLowerCase()}. Ease back in;
                strength returns fast.
              </Caption>
            </Panel>
          ) : null}

          <OverviewInsightGrid data={data} gating={gating} gates={gates} range={range} onNavigate={onNavigate} />

          {programOverview?.activeProgram ? <PlanPulseCard programOverview={programOverview} gating={gating} /> : null}
          <MilestonesStrip milestones={insights.milestones} />

          <OverviewFooterPanels data={data} onOpenSession={onOpenSession} onNavigate={onNavigate} />
        </>
      )}
    </div>
  )
}
