import { Badge, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatCompactDate, formatRelativeTime } from '~/shared/lib/dates'
import { intensityColor } from '~/domains/history/lib/insights'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import type {
  HistoryBestSet,
  HistoryDashboardWithInsights,
  HistorySubstitutionSummary,
  InsightGating,
  ProgramOverview,
  RecentHistoryEntry,
} from '~/shared/types'
import { Caption, EmptyState, Heading, Panel, SectionLabel, StatValue, Text } from '~/components'
import { CalibrationCard } from '../cards/CalibrationCard'
import { ConsistencyCard } from '../cards/ConsistencyCard'
import { MilestonesStrip } from '../cards/MilestonesStrip'
import { MuscleSetsCard } from '../cards/MuscleSetsCard'
import { PlanPulseCard } from '../cards/PlanPulseCard'
import { StallWatchStrip } from '../cards/StallWatchStrip'
import { StrengthScoreCard } from '../cards/StrengthScoreCard'
import { VolumeTrendCard } from '../cards/VolumeTrendCard'
import { ACCENT_TEXT, formatBestSetPrimary, formatE1rm, formatLoad, type HistoryTab } from '../insight-format'

const UNLOCK_STEPS = [
  'Volume trend — 2 sessions',
  'Strength trends — 4 sessions on a big lift',
  'Consistency picture — 2 weeks',
  'Muscle balance — ~20 sets',
]

export function OverviewTab({
  data,
  gating,
  range,
  programOverview,
  activeProgramTitle,
  onOpenSession,
  onNavigate,
}: {
  data: HistoryDashboardWithInsights
  gating: InsightGating
  range: InsightRange
  programOverview: ProgramOverview | null
  activeProgramTitle?: string | null
  onOpenSession: (sessionId: string) => void
  onNavigate: (tab: HistoryTab) => void
}) {
  const { insights } = data
  const latestSession = data.recentSessions[0]

  const kpis: Array<{ label: string; value: ReactNode; desktopOnly?: boolean }> = [
    { label: 'Sessions', value: data.overview.completedSessions },
    { label: 'Logged sets', value: data.overview.loggedSets },
    { label: 'Total volume', value: formatLoad(data.overview.completedVolume, data.overview.units) },
    { label: 'Movements', value: data.overview.uniqueMovements },
    {
      label: 'Latest',
      value: latestSession ? formatRelativeTime(latestSession.completedAt ?? latestSession.scheduledDate) : '—',
      desktopOnly: true,
    },
  ]

  if (gating.lifecycle === 'empty') {
    return (
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
    )
  }

  return (
    <div className="space-y-4">
      <KpiStrip kpis={kpis} />

      {gating.lifecycle === 'cold_start' ? (
        <>
          <Panel p="md">
            <Heading order={3} size="h4">
              First session logged 🎉
            </Heading>
            <Caption mt={4}>Insights unlock as you train:</Caption>
            <div className="mt-3 space-y-1.5">
              {UNLOCK_STEPS.map((step) => (
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
                {formatRelativeTime(data.overview.latestTrainingDate ?? latestSession?.scheduledDate ?? null)}. Ease back in;
                strength returns fast.
              </Caption>
            </Panel>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StrengthScoreCard insights={insights} completedSessions={data.overview.completedSessions} range={range} onNavigate={onNavigate} />
            <VolumeTrendCard insights={insights} gating={gating} range={range} />
            <ConsistencyCard consistency={insights.consistency} />
            <StallWatchStrip insights={insights} staleWelcomeBack={gating.staleWelcomeBack} />
            <MuscleSetsCard insights={insights} range={range} />
            {insights.calibration.signal !== 'no_rir_data' ? <CalibrationCard calibration={insights.calibration} /> : null}
          </div>

          {programOverview?.activeProgram ? <PlanPulseCard programOverview={programOverview} gating={gating} /> : null}
          <MilestonesStrip milestones={insights.milestones} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <RecentSessionsPanel data={data} onOpenSession={onOpenSession} onNavigate={onNavigate} />
            <div className="space-y-4">
              <Panel p="md">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Latest records</SectionLabel>
                  <NavLink label="All" onClick={() => onNavigate('records')} />
                </div>
                <div className="mt-1 flex flex-col">
                  {data.bestSets.slice(0, 3).map((set) => (
                    <LatestRecordRow key={`${set.movementId}-${set.id}`} set={set} />
                  ))}
                  {!data.bestSets.length ? (
                    <Text size="sm" tone="dimmed" mt="sm">
                      No completed sets yet.
                    </Text>
                  ) : null}
                </div>
              </Panel>

              {data.substitutions.length ? (
                <Panel p="md">
                  <SectionLabel>Substitutions</SectionLabel>
                  <div className="mt-3 space-y-2">
                    {data.substitutions.slice(0, 3).map((substitution) => (
                      <SubstitutionRow key={substitution.id} substitution={substitution} />
                    ))}
                  </div>
                </Panel>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KpiStrip({ kpis }: { kpis: Array<{ label: string; value: ReactNode; desktopOnly?: boolean }> }) {
  return (
    <Panel p={0} className="overflow-hidden">
      <div
        className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5"
        style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
      >
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={kpi.desktopOnly ? 'hidden p-4 lg:block' : 'p-4'}
            style={{ backgroundColor: 'var(--mantine-color-default)' }}
          >
            <SectionLabel>{kpi.label}</SectionLabel>
            <StatValue size="xl" mt={4} truncate>
              {kpi.value}
            </StatValue>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function RecentSessionsPanel({
  data,
  onOpenSession,
  onNavigate,
}: {
  data: HistoryDashboardWithInsights
  onOpenSession: (sessionId: string) => void
  onNavigate: (tab: HistoryTab) => void
}) {
  return (
    <Panel p="md">
      <div className="mb-1 flex items-center justify-between gap-3">
        <SectionLabel>Recent sessions</SectionLabel>
        <NavLink label="View all" onClick={() => onNavigate('sessions')} />
      </div>
      <div className="flex flex-col">
        {data.recentSessions.slice(0, 5).map((session) => (
          <RecentMiniRow key={session.id} session={session} onOpen={() => onOpenSession(session.id)} />
        ))}
      </div>
    </Panel>
  )
}

function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1">
      <Text component="span" size="xs" fw={700} c="var(--vf-action-text)">
        {label}
      </Text>
    </button>
  )
}

function RecentMiniRow({ session, onOpen }: { session: RecentHistoryEntry; onOpen: () => void }) {
  const color = intensityColor(session.hardness)
  const date = session.completedAt ?? session.scheduledDate
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-3 border-t py-2.5 text-left first:border-t-0"
      style={{ borderColor: 'var(--mantine-color-default-border)' }}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT_TEXT[color] }} />
      <div className="min-w-0 flex-1">
        <Text size="sm" fw={700} truncate>
          {session.title}
        </Text>
        <Caption truncate>{session.weekLabel ?? session.programTitle ?? 'Session'}</Caption>
      </div>
      <Badge color="success" style={{ flexShrink: 0 }}>
        {session.completedSetCount}/{session.plannedSetCount}
      </Badge>
      <Caption className="w-14 shrink-0" ta="right">
        {formatCompactDate(date)}
      </Caption>
    </button>
  )
}

function LatestRecordRow({ set }: { set: HistoryBestSet }) {
  return (
    <div
      className="flex items-center gap-3 border-t py-2.5 first:border-t-0"
      style={{ borderColor: 'var(--mantine-color-default-border)' }}
    >
      <Trophy size={16} color="var(--vf-warning-text)" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <Text size="sm" fw={700} truncate>
          {set.movementName}
        </Text>
        <Caption truncate>{formatBestSetPrimary(set)}</Caption>
      </div>
      <div className="shrink-0 text-right">
        <Text size="sm" fw={800} tone="action">
          {formatE1rm(set)}
        </Text>
        <SectionLabel>e1RM</SectionLabel>
      </div>
    </div>
  )
}

function SubstitutionRow({ substitution }: { substitution: HistorySubstitutionSummary }) {
  return (
    <Panel surface="inset" p="sm">
      <Text size="xs" fw={900}>
        {substitution.plannedMovementName} <Text component="span" size="xs" tone="dimmed">to</Text>{' '}
        {substitution.performedMovementName}
      </Text>
      <Caption mt={4} fw={700}>
        {substitution.reason.replaceAll('_', ' ')} · {formatCompactDate(substitution.performedAt)}
      </Caption>
    </Panel>
  )
}
