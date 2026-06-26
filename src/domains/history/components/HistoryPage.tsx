import { Badge, Button, Modal, Tabs, TextInput } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity, BarChart3, ChevronRight, Dumbbell, History, ListChecks, Search, Trophy } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import { formatCompactDate, formatFullDate, formatRelativeTime } from '~/shared/lib/dates'
import { activeProgramQueryOptions } from '~/domains/program/queries'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { bodyLoadExplanation, bodyLoadTierLabels } from '~/domains/history/lib/body-load'
import { sessionQueryOptions } from '~/domains/session/queries'
import type {
  BodyLoadRegion,
  BodyRegionId,
  HistoryWeeklyVolume,
  HistoryBestSet,
  HistoryDashboard,
  HistoryMovementSummary,
  HistorySubstitutionSummary,
  RecentHistoryEntry,
  SetLog,
  Unit,
  WorkoutSession,
} from '~/shared/types'
import { Caption, EmptyState, Page, PageHeader, PageLoadError, PageSkeleton, Panel, SectionLabel, StatValue, Text } from '~/components'

type HistoryTab = 'overview' | 'body-load' | 'movements' | 'records' | 'sessions'

const HISTORY_TABS: Array<{ value: HistoryTab; label: string; icon: ReactNode }> = [
  { value: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
  { value: 'body-load', label: 'Muscle Fatigue', icon: <Activity size={14} /> },
  { value: 'movements', label: 'Movements', icon: <Dumbbell size={14} /> },
  { value: 'records', label: 'Records', icon: <Trophy size={14} /> },
  { value: 'sessions', label: 'Sessions', icon: <History size={14} /> },
]

export function HistoryPage({ user }: { user: unknown }) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to see training insights">Completed sessions appear here.</EmptyState>
      </Page>
    )
  }
  return <AuthedHistory />
}

function AuthedHistory() {
  const historyQuery = useQuery(historyDashboardQueryOptions())
  const activeProgramQuery = useQuery(activeProgramQueryOptions())
  const [activeTab, setActiveTab] = useState<HistoryTab>('overview')
  const [movementQuery, setMovementQuery] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const selectedSessionQuery = useQuery({
    ...sessionQueryOptions(selectedSessionId ?? ''),
    enabled: Boolean(selectedSessionId),
  })

  if (historyQuery.isPending) return <PageSkeleton />
  if (historyQuery.isError) return <PageLoadError error={historyQuery.error} onRetry={() => void historyQuery.refetch()} />

  const data = historyQuery.data
  const activeProgramTitle = activeProgramQuery.data?.title ?? null
  const selectedHistoryEntry = data.recentSessions.find((session) => session.id === selectedSessionId) ?? null

  return (
    <Page>
      <PageHeader
        title="Training Insights"
        eyebrow="Logged work"
        actions={activeProgramTitle ? <Badge color="action">Active: {activeProgramTitle}</Badge> : null}
      >
        Training output by week, movement, body region, records, and completed session.
      </PageHeader>

      <Tabs
        variant="pills"
        keepMounted={false}
        value={activeTab}
        onChange={(value) => setActiveTab((value as HistoryTab | null) ?? 'overview')}
        classNames={{
          list: 'mb-4 !flex !flex-nowrap gap-1 overflow-x-auto border-b border-[var(--mantine-color-default-border)] px-0.5 pb-2 pt-1 no-scrollbar',
          tab: '!my-0.5 !min-h-9 !shrink-0 !rounded-md !border-0 !px-2.5 !py-2 !text-xs !font-extrabold !leading-none data-[active=true]:!bg-[var(--vf-action-soft)] data-[active=true]:!text-[var(--vf-action-text)]',
          panel: 'focus-visible:outline-none',
        }}
      >
        <Tabs.List>
          {HISTORY_TABS.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              <TabLabel icon={tab.icon} label={tab.label} />
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="overview">
          <OverviewTab data={data} activeProgramTitle={activeProgramTitle} onOpenSession={setSelectedSessionId} />
        </Tabs.Panel>
        <Tabs.Panel value="body-load">
          <BodyLoadTab data={data} />
        </Tabs.Panel>
        <Tabs.Panel value="movements">
          <MovementsTab data={data} query={movementQuery} onQueryChange={setMovementQuery} />
        </Tabs.Panel>
        <Tabs.Panel value="records">
          <RecordsTab data={data} />
        </Tabs.Panel>
        <Tabs.Panel value="sessions">
          <SessionsTab sessions={data.recentSessions} activeProgramTitle={activeProgramTitle} onOpenSession={setSelectedSessionId} />
        </Tabs.Panel>
      </Tabs>

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

function OverviewTab({
  data,
  activeProgramTitle,
  onOpenSession,
}: {
  data: HistoryDashboard
  activeProgramTitle?: string | null
  onOpenSession: (sessionId: string) => void
}) {
  const latestSession = data.recentSessions[0]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <OverviewMetric label="Sessions" value={data.overview.completedSessions} icon={<History size={15} />} />
        <OverviewMetric label="Logged sets" value={data.overview.loggedSets} icon={<ListChecks size={15} />} tone="success" />
        <OverviewMetric label="Total weight lifted" value={formatLoad(data.overview.completedVolume, data.overview.units)} icon={<BarChart3 size={15} />} wide />
        <OverviewMetric label="Movements" value={data.overview.uniqueMovements} icon={<Dumbbell size={15} />} />
        <OverviewMetric
          label="Latest session"
          value={latestSession ? formatRelativeTime(latestSession.completedAt ?? latestSession.scheduledDate) : '-'}
          icon={<Trophy size={15} />}
        />
      </div>

      {data.overview.completedSessions ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Panel p="md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionLabel>Weekly volume</SectionLabel>
                  <Text mt={4} size="sm" fw={900}>Last {data.weeklyVolume.length || 0} training weeks</Text>
                </div>
                <Badge>{formatLoad(data.weeklyVolume.reduce((total, week) => total + week.volume, 0), data.overview.units)}</Badge>
              </div>
              <MiniVolumeChart weeks={data.weeklyVolume} units={data.overview.units} className="mt-4" />
              <WeeklyVolumeStrip weeks={data.weeklyVolume} units={data.overview.units} />
            </Panel>

            <Panel p="md">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionLabel>Recent sessions</SectionLabel>
                <Badge>{data.recentSessions.length}</Badge>
              </div>
              <SessionCompletionChart sessions={data.recentSessions.slice(0, 6).reverse()} className="mb-3" />
              <div className="grid gap-3">
                {data.recentSessions.slice(0, 4).map((session) => (
                  <RecentWorkoutCard key={session.id} session={session} onOpen={() => onOpenSession(session.id)} />
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel p="md">
              <SectionLabel>Most worked recently</SectionLabel>
              <div className="mt-3 space-y-2">
                {data.bodyLoad.topRegions.slice(0, 4).map((region) => (
                  <BodyRegionRow key={region.regionId} region={region} compact />
                ))}
                {!data.bodyLoad.topRegions.length ? (
                  <Text size="sm" tone="dimmed">No muscle fatigue data yet.</Text>
                ) : null}
              </div>
            </Panel>

            <Panel p="md">
              <SectionLabel>Records</SectionLabel>
              <div className="mt-3 space-y-2">
                {data.bestSets.slice(0, 4).map((set) => (
                  <BestSetCard key={`${set.movementId}-${set.id}`} set={set} compact />
                ))}
                {!data.bestSets.length ? (
                  <Text size="sm" tone="dimmed">No completed sets yet.</Text>
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
      ) : (
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
            ? `${activeProgramTitle} is active. Complete your first session to start building your training stats, muscle fatigue, and volume trends.`
            : 'Complete a session to start building your training history, muscle fatigue, and volume trends.'}
        </EmptyState>
      )}
    </div>
  )
}

function BodyLoadTab({ data }: { data: HistoryDashboard }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel p="md">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>Muscle Fatigue</SectionLabel>
            <Text mt={4} size="sm" fw={900}>Last {data.bodyLoad.windowDays} days</Text>
          </div>
          <Badge color="success">{data.bodyLoad.freshRegionCount} of {data.bodyLoad.regions.length} fresh</Badge>
        </div>
        <Caption mb="md">{bodyLoadExplanation}</Caption>
        <BodyLoadMap regions={data.bodyLoad.regions} />
      </Panel>

      <Panel p="md">
        <SectionLabel>Affected regions</SectionLabel>
        <div className="mt-3 space-y-2">
          {data.bodyLoad.regions
            .filter((region) => region.impactPercent > 0)
            .sort((left, right) => right.impactPercent - left.impactPercent)
            .map((region) => (
              <BodyRegionRow key={region.regionId} region={region} />
            ))}
          {!data.bodyLoad.topRegions.length ? (
            <Text size="sm" tone="dimmed">No completed sets in the recent window.</Text>
          ) : null}
        </div>
      </Panel>
    </div>
  )
}

function MovementsTab({
  data,
  query,
  onQueryChange,
}: {
  data: HistoryDashboard
  query: string
  onQueryChange: (query: string) => void
}) {
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return data.movementSummaries
    return data.movementSummaries.filter((movement) =>
      `${movement.movementName} ${movement.category}`.toLowerCase().includes(normalized),
    )
  }, [data.movementSummaries, query])

  return (
    <div className="space-y-4">
      <TextInput
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        placeholder="Search movements"
        leftSection={<Search size={14} />}
        classNames={{ input: '!border-[var(--mantine-color-default-border)] !bg-[var(--vf-surface-2)]' }}
      />
      {filtered.length ? (
        <div className="grid gap-2">
          {filtered.map((movement) => (
            <MovementSummaryCard key={movement.movementId} movement={movement} units={data.overview.units} />
          ))}
        </div>
      ) : (
        <EmptyState title="No matching movements">Completed movement summaries will appear here.</EmptyState>
      )}
    </div>
  )
}

function RecordsTab({ data }: { data: HistoryDashboard }) {
  return data.bestSets.length ? (
    <div className="grid gap-2 md:grid-cols-2">
      {data.bestSets.map((set) => (
        <BestSetCard key={`${set.movementId}-${set.id}`} set={set} />
      ))}
    </div>
  ) : (
    <EmptyState title="No records yet">Complete sets with load and reps to build records.</EmptyState>
  )
}

function SessionsTab({
  sessions,
  activeProgramTitle,
  onOpenSession,
}: {
  sessions: RecentHistoryEntry[]
  activeProgramTitle?: string | null
  onOpenSession: (sessionId: string) => void
}) {
  return sessions.length ? (
    <div className="grid gap-3">
      {sessions.map((session) => (
        <RecentWorkoutCard key={session.id} session={session} onOpen={() => onOpenSession(session.id)} />
      ))}
    </div>
  ) : (
    <EmptyState title="No completed sessions yet">
      {activeProgramTitle
        ? `${activeProgramTitle} is active. Finished workouts will be listed here with movement history.`
        : 'Finish a workout and it will be listed here with movement history.'}
    </EmptyState>
  )
}

function TabLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="inline-flex shrink-0">{icon}</span>
      <span>{label}</span>
    </span>
  )
}

function OverviewMetric({
  label,
  value,
  icon,
  tone,
  wide = false,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  tone?: 'success'
  wide?: boolean
}) {
  return (
    <Panel surface="inset" p="sm" className={cn('min-w-0', wide && 'col-span-2 md:col-span-1')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="shrink-0" style={{ color: 'var(--mantine-color-dimmed)' }}>{icon}</span>
        <StatValue className="min-w-0 flex-1" ta="right" size="lg" tone={tone} truncate>{value}</StatValue>
      </div>
      <Caption fw={800} tt="uppercase">{label}</Caption>
    </Panel>
  )
}

function WeeklyVolumeStrip({ weeks, units }: { weeks: HistoryDashboard['weeklyVolume']; units?: Unit | null }) {
  const maxVolume = Math.max(...weeks.map((week) => week.volume), 1)
  return (
    <div className="mt-4 grid gap-2">
      {weeks.length ? weeks.map((week) => {
        const width = `${Math.max(4, Math.round((week.volume / maxVolume) * 100))}%`
        return (
          <div key={week.weekStart} className="grid grid-cols-[3.5rem_minmax(0,1fr)_5rem] items-center gap-2">
            <Caption fw={800}>{week.weekLabel}</Caption>
            <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
              <div className="h-full rounded-full" style={{ width, backgroundColor: 'var(--mantine-primary-color-filled)' }} />
            </div>
            <Text size="xs" fw={900} ta="right">{formatLoad(week.volume, units)}</Text>
          </div>
        )
      }) : (
        <Text size="sm" tone="dimmed">No weekly volume yet.</Text>
      )}
    </div>
  )
}

function MiniVolumeChart({
  weeks,
  units,
  className,
}: {
  weeks: HistoryWeeklyVolume[]
  units?: Unit | null
  className?: string
}) {
  if (!weeks.length) return null
  const values = weeks.map((week) => week.volume)
  const maxValue = Math.max(...values, 1)
  const barWidth = 100 / values.length

  return (
    <Panel surface="inset" p="xs" className={className}>
      <svg viewBox="0 0 240 72" role="img" aria-label="Weekly volume mini chart" className="block h-20 w-full">
        <line x1="0" y1="64" x2="240" y2="64" stroke="var(--mantine-color-default-border)" strokeWidth="1" />
        {values.map((value, index) => {
          const height = Math.max(8, (value / maxValue) * 52)
          const x = index * barWidth * 2.4 + 4
          const width = Math.max(8, barWidth * 2.4 - 8)
          return (
            <rect
              key={weeks[index]?.weekStart ?? index}
              x={x}
              y={64 - height}
              width={width}
              height={height}
              rx="3"
              fill="var(--mantine-primary-color-filled)"
            >
              <title>{`${weeks[index]?.weekLabel ?? 'Week'}: ${formatLoad(value, units)}`}</title>
            </rect>
          )
        })}
      </svg>
    </Panel>
  )
}

function SessionCompletionChart({
  sessions,
  className,
}: {
  sessions: RecentHistoryEntry[]
  className?: string
}) {
  if (!sessions.length) return null
  const points = sessions.map((session, index) => {
    const total = Math.max(session.plannedSetCount, 1)
    const percent = session.completedSetCount / total
    const x = sessions.length === 1 ? 120 : (index / (sessions.length - 1)) * 220 + 10
    const y = 58 - percent * 46
    return { x, y, percent }
  })
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <Panel surface="inset" p="xs" className={className}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center">
        <svg viewBox="0 0 240 64" role="img" aria-label="Recent session completion chart" className="block h-14 w-full">
          <line x1="10" y1="58" x2="230" y2="58" stroke="var(--mantine-color-default-border)" strokeWidth="1" />
          <polyline points={line} fill="none" stroke="var(--vf-action-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <circle key={sessions[index]?.id ?? index} cx={point.x} cy={point.y} r="3.5" fill="var(--vf-action-text)">
              <title>{`${sessions[index]?.title ?? 'Session'}: ${Math.round(point.percent * 100)}%`}</title>
            </circle>
          ))}
        </svg>
        <div>
          <SectionLabel>Completion</SectionLabel>
          <Caption mt={2}>Recent logged sets</Caption>
        </div>
      </div>
    </Panel>
  )
}

function BodyLoadMap({ regions }: { regions: BodyLoadRegion[] }) {
  const byId = new Map(regions.map((region) => [region.regionId, region]))
  const fill = (regionId: BodyRegionId) => bodyLoadFill(byId.get(regionId)?.tier ?? 'fresh')
  const opacity = (regionId: BodyRegionId) => 0.35 + ((byId.get(regionId)?.impactPercent ?? 0) / 100) * 0.65

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 300 420"
        role="img"
        aria-label="Muscle fatigue map"
        className="vf-body-load-map"
      >
        <g stroke="var(--mantine-color-default-border)" strokeWidth="3">
          <circle cx="150" cy="46" r="26" fill="var(--vf-surface-3)" />
          <rect x="118" y="76" width="64" height="34" rx="15" fill={fill('shoulders')} opacity={opacity('shoulders')} />
          <path d="M95 104 C114 86 135 82 150 98 C165 82 186 86 205 104 L196 156 C178 150 162 143 150 130 C138 143 122 150 104 156 Z" fill={fill('chest')} opacity={opacity('chest')} />
          <path d="M119 156 L181 156 L172 237 L128 237 Z" fill={fill('core')} opacity={opacity('core')} />
          <path d="M74 114 C91 122 102 143 103 168 L94 231 C80 229 70 215 72 196 L78 151 C79 137 76 125 74 114 Z" fill={fill('triceps')} opacity={opacity('triceps')} />
          <path d="M226 114 C209 122 198 143 197 168 L206 231 C220 229 230 215 228 196 L222 151 C221 137 224 125 226 114 Z" fill={fill('triceps')} opacity={opacity('triceps')} />
          <path d="M98 238 L143 238 L135 345 C116 343 102 327 100 305 Z" fill={fill('quads')} opacity={opacity('quads')} />
          <path d="M157 238 L202 238 L200 305 C198 327 184 343 165 345 Z" fill={fill('quads')} opacity={opacity('quads')} />
          <path d="M103 344 L137 344 L132 394 C120 397 108 390 106 377 Z" fill={fill('calves')} opacity={opacity('calves')} />
          <path d="M163 344 L197 344 L194 377 C192 390 180 397 168 394 Z" fill={fill('calves')} opacity={opacity('calves')} />
          <path d="M98 109 C119 120 133 129 150 129 C167 129 181 120 202 109 L190 151 C175 166 125 166 110 151 Z" fill={fill('upper_back')} opacity={opacity('upper_back')} transform="translate(0 2)" />
          <path d="M103 238 L143 238 L139 304 L121 329 C107 306 101 276 103 238 Z" fill={fill('glutes')} opacity={opacity('glutes')} transform="translate(0 -2)" />
          <path d="M157 238 L197 238 C199 276 193 306 179 329 L161 304 Z" fill={fill('glutes')} opacity={opacity('glutes')} transform="translate(0 -2)" />
          <path d="M113 251 L137 251 L132 339 C117 329 108 307 109 285 Z" fill={fill('hamstrings')} opacity={opacity('hamstrings')} />
          <path d="M163 251 L187 251 L191 285 C192 307 183 329 168 339 Z" fill={fill('hamstrings')} opacity={opacity('hamstrings')} />
          <path d="M63 177 L92 188 L85 255 C75 263 62 258 61 245 Z" fill={fill('biceps')} opacity={opacity('biceps')} />
          <path d="M237 177 L208 188 L215 255 C225 263 238 258 239 245 Z" fill={fill('biceps')} opacity={opacity('biceps')} />
        </g>
      </svg>
    </div>
  )
}

function BodyRegionRow({ region, compact = false }: { region: BodyLoadRegion; compact?: boolean }) {
  return (
    <Panel surface="inset" p={compact ? 'xs' : 'sm'}>
      <div className="grid grid-cols-[minmax(0,1fr)_3.75rem] items-start gap-3">
        <div className="min-w-0">
          <Text fw={900}>{region.label}</Text>
          {!compact ? (
            <Caption mt={2} lineClamp={2} lh={1.25}>
              {region.movementNames.length ? region.movementNames.join(', ') : 'No recent work'}
            </Caption>
          ) : null}
        </div>
        <div className="text-right">
          <StatValue size="sm" tone={toneForTier(region.tier)}>
            {region.impactPercent}%
          </StatValue>
          <Caption size="0.625rem" fw={800} tone={toneForTier(region.tier)}>
            {bodyLoadTierLabels[region.tier]}
          </Caption>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${region.impactPercent}%`,
            backgroundColor: bodyLoadColor(region.tier),
          }}
        />
      </div>
      {!compact ? (
        <Caption mt="xs" fw={700}>
          {region.recentSetCount} recent set{region.recentSetCount === 1 ? '' : 's'}
        </Caption>
      ) : null}
    </Panel>
  )
}

function MovementSummaryCard({ movement, units }: { movement: HistoryMovementSummary; units?: Unit | null }) {
  return (
    <Panel p="sm">
      <div className="md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Text size="sm" fw={900} truncate>{movement.movementName}</Text>
            <Caption mt={1} fw={700} tt="capitalize" truncate>{movement.category.replaceAll('_', ' ')}</Caption>
          </div>
          <Badge className="shrink-0">{movement.totalCompletedSets} sets</Badge>
        </div>
        <div className="mt-2 grid grid-cols-[4.5rem_5.25rem_minmax(0,1fr)] gap-2">
          <CompactInsightCell label="Last" value={formatCompactDate(movement.lastPerformedAt)} />
          <CompactInsightCell label="Volume" value={formatLoad(movement.totalVolume, units)} />
          <div className="min-w-0">
            <SectionLabel size="0.5rem">Best set</SectionLabel>
            <Text mt={1} size="xs" fw={800} tone="accent" truncate>
              {movement.bestSet ? formatBestSet(movement.bestSet) : 'No best set yet'}
            </Text>
          </div>
        </div>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-[minmax(0,1.4fr)_7rem_8rem_minmax(0,1.5fr)_auto] md:items-center">
        <div className="min-w-0">
          <Text fw={900} truncate>{movement.movementName}</Text>
          <Caption mt={2} fw={700} tt="capitalize">{movement.category.replaceAll('_', ' ')}</Caption>
        </div>
        <InsightCell label="Last" value={formatCompactDate(movement.lastPerformedAt)} />
        <InsightCell label="Volume" value={formatLoad(movement.totalVolume, units)} />
        <Panel
          surface="inset"
          px="sm"
          py="xs"
          style={{ borderColor: 'var(--vf-accent-border)', backgroundColor: 'var(--vf-accent-soft)' }}
        >
          <SectionLabel size="0.5625rem">Best set</SectionLabel>
          <Text mt={2} size="xs" fw={800} tone="accent" lineClamp={2} lh={1.25}>
            {movement.bestSet ? formatBestSet(movement.bestSet) : 'No best set yet'}
          </Text>
        </Panel>
        <Badge>{movement.totalCompletedSets} sets</Badge>
      </div>
      {movement.substitutionCount ? (
        <Caption mt="xs" fw={700}>{movement.substitutionCount} substitution{movement.substitutionCount === 1 ? '' : 's'}</Caption>
      ) : null}
    </Panel>
  )
}

function CompactInsightCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <SectionLabel size="0.5rem">{label}</SectionLabel>
      <Text mt={1} size="xs" fw={900} truncate>{value}</Text>
    </div>
  )
}

function BestSetCard({ set, compact = false }: { set: HistoryBestSet; compact?: boolean }) {
  const primary = formatBestSetPrimary(set)
  const rir = typeof set.rir === 'number' ? `RIR ${set.rir}` : null
  const e1rm = typeof set.e1rm === 'number' ? `e1RM ${formatNumber(set.e1rm)} ${set.units ?? ''}`.trim() : null
  const emphasized = set.type !== 'accessory'

  return (
    <Panel
      p="xs"
      style={{
        borderColor: emphasized ? 'var(--vf-accent-border)' : 'var(--mantine-color-default-border)',
        backgroundColor: emphasized ? 'var(--vf-accent-soft)' : 'var(--vf-surface-2)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-6 sm:w-6"
            style={{ backgroundColor: 'var(--mantine-color-default)', color: 'var(--vf-accent-text)' }}
          >
            <Trophy size={12} />
          </span>
          <div className="min-w-0">
            <Text size="sm" fw={900} truncate>{set.movementName}</Text>
            {!compact ? <Caption mt={1} truncate>{set.sessionTitle}</Caption> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge color={set.type === 'accessory' ? 'neutral' : 'action'}>
            {formatRecordType(set.type)}
          </Badge>
          {!compact ? <Caption size="0.625rem" fw={800}>{formatCompactDate(set.performedAt)}</Caption> : null}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StatValue size="sm">{primary}</StatValue>
        {rir ? <Badge color="neutral">{rir}</Badge> : null}
        {e1rm ? <Badge color="action">{e1rm}</Badge> : null}
      </div>
    </Panel>
  )
}

function SubstitutionRow({ substitution }: { substitution: HistorySubstitutionSummary }) {
  return (
    <Panel surface="inset" p="sm">
      <Text size="xs" fw={900}>
        {substitution.plannedMovementName} <Text component="span" size="xs" tone="dimmed">to</Text> {substitution.performedMovementName}
      </Text>
      <Caption mt={4} fw={700}>
        {formatReason(substitution.reason)} · {formatCompactDate(substitution.performedAt)}
      </Caption>
    </Panel>
  )
}

function InsightCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <Text mt={2} size="sm" fw={800} truncate>{value}</Text>
    </div>
  )
}

function RecentWorkoutCard({ session, onOpen }: { session: RecentHistoryEntry; onOpen: () => void }) {
  const date = session.completedAt ?? session.scheduledDate
  return (
    <button
      type="button"
      className="vf-card-hover relative rounded-lg border p-2.5 pr-8 transition sm:p-3 sm:pr-3"
      style={{
        backgroundColor: 'var(--mantine-color-default)',
        borderColor: 'var(--mantine-color-default-border)',
        boxShadow: 'var(--vf-shadow-card)',
        color: 'var(--mantine-color-text)',
        textAlign: 'left',
      }}
      onClick={onOpen}
    >
      <Caption
        size="0.625rem"
        fw={800}
        className="absolute right-8 top-2.5 sm:hidden"
      >
        {formatRelativeTime(date)}
      </Caption>
      <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border sm:h-9 sm:w-9 sm:rounded-lg"
            style={{
              backgroundColor: 'var(--vf-surface-2)',
              borderColor: 'var(--mantine-color-default-border)',
              color: 'var(--vf-action-text)',
            }}
          >
            {session.completedAt ? <Trophy size={16} /> : <Dumbbell size={16} />}
          </div>
          <div className="min-w-0">
            <Text size="sm" fw={900} truncate>{session.title}</Text>
            <Caption mt={1} truncate>{session.programTitle ?? 'Training session'}</Caption>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {session.weekLabel ? <Badge>{session.weekLabel}</Badge> : null}
              {session.hardness ? <Badge color={session.hardness === 'Hard' ? 'danger' : 'neutral'}>{session.hardness}</Badge> : null}
              <Badge>{session.movementCount} movements</Badge>
              <Badge>{session.completedSetCount}/{session.plannedSetCount} sets</Badge>
            </div>
          </div>
        </div>
        <div className="hidden shrink-0 items-center justify-between gap-2 sm:flex sm:justify-end">
          <div className="text-right">
            <Text size="xs" fw={900}>{formatCompactDate(date)}</Text>
            <Caption size="0.625rem" fw={700}>{formatRelativeTime(date)}</Caption>
          </div>
          <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
        </div>
        <ChevronRight
          className="absolute right-2 top-1/2 -translate-y-1/2 sm:hidden"
          size={16}
          color="var(--mantine-color-dimmed)"
        />
      </div>
    </button>
  )
}

function WorkoutSummaryModal({
  open,
  fallback,
  session,
  isLoading,
  error,
  onClose,
}: {
  open: boolean
  fallback: RecentHistoryEntry | null
  session?: WorkoutSession
  isLoading: boolean
  error: unknown
  onClose: () => void
}) {
  const date = session?.completedAt ?? fallback?.completedAt ?? session?.scheduledDate ?? fallback?.scheduledDate
  const sets = session?.movements.flatMap((movement) => movement.sets) ?? []
  const completedSets = sets.filter((set) => set.completed)
  const topSets = completedSets.filter((set) => set.isTopSet || set.isAmrap)

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title="Workout summary"
      size="lg"
      classNames={{
        inner: '!items-end sm:!items-center',
        content: '!mb-0 !flex !max-h-[90dvh] !flex-col !overflow-hidden !rounded-b-none sm:!mb-auto sm:!rounded-lg',
        body: '!min-h-0 !flex-1 !overflow-hidden',
      }}
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        title: {
          color: 'var(--mantine-color-text)',
          fontSize: '1rem',
          fontWeight: 800,
        },
        body: {
          color: 'var(--mantine-color-text)',
        },
        close: {
          color: 'var(--mantine-color-dimmed)',
        },
      }}
    >
      {isLoading ? (
        <HistoryModalStatus>Loading workout summary...</HistoryModalStatus>
      ) : error ? (
        <HistoryModalStatus tone="danger">{getApiErrorMessage(error, 'Unable to load workout summary')}</HistoryModalStatus>
      ) : session ? (
        <div className="grid max-h-[calc(90dvh-6rem)] min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] gap-4">
          <Panel surface="inset" p="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <SectionLabel>{session.programTitle}</SectionLabel>
                <Text mt={4} size="xl" fw={900}>{session.title}</Text>
                <Text mt={4} size="sm" tone="dimmed">
                  {session.weekLabel} · {session.hardness} · {session.estimatedMinutes} min
                </Text>
              </div>
              <Panel px="sm" py="xs" className="text-right">
                <Text size="sm" fw={900}>{formatFullDate(date)}</Text>
                <Caption>{formatRelativeTime(date)}</Caption>
              </Panel>
            </div>
          </Panel>

          <div className="grid grid-cols-3 gap-2">
            <SummaryMetric icon={<Dumbbell size={14} />} label="Movements" value={session.movements.length} />
            <SummaryMetric icon={<ListChecks size={14} />} label="Sets" value={`${completedSets.length}/${sets.length}`} />
            <SummaryMetric icon={<Trophy size={14} />} label="Top sets" value={topSets.length} />
          </div>

          {topSets.length ? (
            <div>
              <SectionLabel className="mb-2">Highlights</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {topSets.slice(0, 4).map((set) => (
                  <Badge key={set.id} color="accent" variant="light" tt="none">
                    {formatSetLog(set, session.units)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {session.movements.map((movement) => (
              <WorkoutMovementSummary key={movement.id} session={session} movement={movement} />
            ))}

            {session.notes ? (
              <Panel surface="inset" p="sm">
                <SectionLabel className="mb-1">Notes</SectionLabel>
                <Text size="sm" tone="dimmed">{session.notes}</Text>
              </Panel>
            ) : null}
          </div>
        </div>
      ) : fallback ? (
        <HistoryModalStatus>{fallback.title} is ready to review.</HistoryModalStatus>
      ) : null}
    </Modal>
  )
}

function WorkoutMovementSummary({ session, movement }: { session: WorkoutSession; movement: WorkoutSession['movements'][number] }) {
  const completedSets = movement.sets.filter((set) => set.completed)
  const displaySets = completedSets.length ? completedSets : movement.sets

  return (
    <Panel surface="inset" p="sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Text fw={900} truncate>{movement.movementName}</Text>
          <Caption mt={2}>{movement.targetSummary}</Caption>
        </div>
        <Badge color={movement.role === 'main' ? 'action' : 'neutral'}>{movement.role}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {displaySets.map((set) => (
          <Badge
            key={set.id}
            color={set.isTopSet || set.isAmrap ? 'accent' : set.completed ? 'success' : 'neutral'}
            tt="none"
          >
            {set.setIndex}: {formatSetLog(set, session.units)}
          </Badge>
        ))}
      </div>
    </Panel>
  )
}

function SummaryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Panel surface="inset" p="sm" className="text-center">
      <div
        className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-md"
        style={{ backgroundColor: 'var(--mantine-color-default)', color: 'var(--vf-action-text)' }}
      >
        {icon}
      </div>
      <StatValue>{value}</StatValue>
      <Caption size="0.625rem">{label}</Caption>
    </Panel>
  )
}

function HistoryModalStatus({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <Panel
      p="sm"
      style={{
        borderColor: tone === 'danger' ? 'var(--vf-danger-border)' : 'var(--mantine-color-default-border)',
        backgroundColor: tone === 'danger' ? 'var(--vf-danger-soft)' : 'var(--vf-surface-2)',
      }}
    >
      <Text size="sm" tone={tone === 'danger' ? 'danger' : 'dimmed'}>{children}</Text>
    </Panel>
  )
}

function bodyLoadFill(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'var(--vf-danger-text)'
  if (tier === 'moderate') return 'var(--vf-warning-text)'
  if (tier === 'low') return 'var(--vf-action-text)'
  return 'var(--mantine-color-dimmed)'
}

function bodyLoadColor(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'var(--vf-danger-text)'
  if (tier === 'moderate') return 'var(--vf-warning-text)'
  if (tier === 'low') return 'var(--vf-action-text)'
  return 'var(--mantine-color-dimmed)'
}

function toneForTier(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'danger'
  if (tier === 'moderate') return 'warning'
  if (tier === 'low') return 'action'
  return 'dimmed'
}

function formatSetLog(set: SetLog, units: Unit | string) {
  const load = set.actualLoad ?? set.targetLoad
  const reps = set.actualReps ?? set.targetReps ?? (set.targetRepMin && set.targetRepMax ? `${set.targetRepMin}-${set.targetRepMax}` : set.targetRepMin)
  const loadText = load == null ? '-' : `${formatNumber(load)} ${units}`
  const repsText = reps == null ? '-' : `${reps}${set.isAmrap ? '+' : ''}`
  const rirText = typeof set.actualRir === 'number' ? ` @ RIR ${set.actualRir}` : ''
  return `${loadText} x ${repsText}${rirText}`
}

function formatBestSet(set: HistoryBestSet) {
  const base = `${set.load == null ? 'bodyweight' : `${formatNumber(set.load)} ${set.units ?? ''}`.trim()} x ${set.reps ?? '-'}${set.type === 'amrap' ? '+' : ''}`
  const rir = typeof set.rir === 'number' ? ` @ RIR ${set.rir}` : ''
  const e1rm = typeof set.e1rm === 'number' ? ` · e1RM ${formatNumber(set.e1rm)} ${set.units ?? ''}` : ''
  return `${base}${rir}${e1rm}`
}

function formatBestSetPrimary(set: HistoryBestSet) {
  const load = set.load == null ? 'Bodyweight' : `${formatNumber(set.load)} ${set.units ?? ''}`.trim()
  const reps = `${set.reps ?? '-'}${set.type === 'amrap' ? '+' : ''}`
  return `${load} × ${reps} reps`
}

function formatLoad(value?: number | null, units?: Unit | null) {
  if (!value) return `0 ${units ?? ''}`.trim()
  return `${formatNumber(value)} ${units ?? ''}`.trim()
}

function formatRecordType(type: HistoryBestSet['type']) {
  return type.replaceAll('_', ' ')
}

function formatReason(reason: HistorySubstitutionSummary['reason']) {
  return reason.replaceAll('_', ' ')
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value)
}
