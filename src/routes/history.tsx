import { Badge, Modal, Tabs, TextInput } from '@mantine/core'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, BarChart3, ChevronRight, Dumbbell, History, ListChecks, Search, Trophy } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { cn } from '~/lib/cn'
import { formatCompactDate, formatFullDate, formatRelativeTime } from '~/lib/dates'
import { historyDashboardQueryOptions, sessionQueryOptions } from '~/lib/query-options'
import type {
  BodyLoadRegion,
  BodyRegionId,
  HistoryBestSet,
  HistoryDashboard,
  HistoryMovementSummary,
  HistorySubstitutionSummary,
  RecentHistoryEntry,
  SetLog,
  Unit,
  WorkoutSession,
} from '~/types/training'
import { EmptyState, Page, PageHeader } from '~/components/ui'

type HistoryTab = 'overview' | 'body-load' | 'movements' | 'records' | 'sessions'

export const Route = createFileRoute('/history')({
  loader: async ({ context }) => {
    if ((context as any).user) await context.queryClient.ensureQueryData(historyDashboardQueryOptions())
  },
  component: HistoryRoute,
})

function HistoryRoute() {
  const user = (Route.useRouteContext() as any).user
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to see training history">Completed sessions appear here.</EmptyState>
      </Page>
    )
  }
  return <AuthedHistory />
}

function AuthedHistory() {
  const { data } = useSuspenseQuery(historyDashboardQueryOptions())
  const [activeTab, setActiveTab] = useState<HistoryTab>('overview')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const selectedHistoryEntry = data.recentSessions.find((session) => session.id === selectedSessionId) ?? null
  const selectedSessionQuery = useQuery({
    ...sessionQueryOptions(selectedSessionId ?? ''),
    enabled: Boolean(selectedSessionId),
  })

  return (
    <Page>
      <PageHeader title="Training History" eyebrow="Logged work">
        Training output by week, movement, body region, and completed session.
      </PageHeader>

      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab((value as HistoryTab | null) ?? 'overview')}
        classNames={{
          list: 'mb-4 flex-nowrap overflow-x-auto border-b border-[var(--mantine-color-default-border)]',
          tab: '!px-3 !py-2 !text-xs !font-extrabold data-[active=true]:!text-[var(--vf-action-text)]',
          panel: 'focus-visible:outline-none',
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="overview"><TabLabel icon={<BarChart3 size={14} />} label="Overview" /></Tabs.Tab>
          <Tabs.Tab value="body-load"><TabLabel icon={<Activity size={14} />} label="Body Load" /></Tabs.Tab>
          <Tabs.Tab value="movements"><TabLabel icon={<Dumbbell size={14} />} label="Movements" /></Tabs.Tab>
          <Tabs.Tab value="records"><TabLabel icon={<Trophy size={14} />} label="Records" /></Tabs.Tab>
          <Tabs.Tab value="sessions"><TabLabel icon={<History size={14} />} label="Sessions" /></Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <OverviewTab data={data} onOpenSession={setSelectedSessionId} />
        </Tabs.Panel>
        <Tabs.Panel value="body-load">
          <BodyLoadTab data={data} />
        </Tabs.Panel>
        <Tabs.Panel value="movements">
          <MovementsTab data={data} />
        </Tabs.Panel>
        <Tabs.Panel value="records">
          <RecordsTab data={data} />
        </Tabs.Panel>
        <Tabs.Panel value="sessions">
          <SessionsTab sessions={data.recentSessions} onOpenSession={setSelectedSessionId} />
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

function OverviewTab({ data, onOpenSession }: { data: HistoryDashboard; onOpenSession: (sessionId: string) => void }) {
  const latestSession = data.recentSessions[0]
  return (
    <div className="space-y-4">
      <div className="vf-stat-strip">
        <OverviewMetric label="Sessions" value={data.overview.completedSessions} icon={<History size={15} />} />
        <OverviewMetric label="Logged sets" value={data.overview.loggedSets} icon={<ListChecks size={15} />} tone="success" />
        <OverviewMetric label="Completed load" value={formatLoad(data.overview.completedVolume, data.overview.units)} icon={<BarChart3 size={15} />} />
        <OverviewMetric label="Movements" value={data.overview.uniqueMovements} icon={<Dumbbell size={15} />} />
        <OverviewMetric
          label="Latest"
          value={latestSession ? formatRelativeTime(latestSession.completedAt ?? latestSession.scheduledDate) : '-'}
          icon={<Trophy size={15} />}
        />
      </div>

      {data.overview.completedSessions ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <section className="vf-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="vf-section-label">Weekly volume</h2>
                  <p className="mt-1 text-sm font-extrabold">Last {data.weeklyVolume.length || 0} training weeks</p>
                </div>
                <Badge>{formatLoad(data.weeklyVolume.reduce((total, week) => total + week.volume, 0), data.overview.units)}</Badge>
              </div>
              <WeeklyVolumeStrip weeks={data.weeklyVolume} units={data.overview.units} />
            </section>

            <section className="vf-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="vf-section-label">Recent sessions</h2>
                <Badge>{data.recentSessions.length}</Badge>
              </div>
              <div className="grid gap-3">
                {data.recentSessions.slice(0, 4).map((session) => (
                  <RecentWorkoutCard key={session.id} session={session} onOpen={() => onOpenSession(session.id)} />
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="vf-panel p-4">
              <h2 className="vf-section-label">Top body load</h2>
              <div className="mt-3 space-y-2">
                {data.bodyLoad.topRegions.slice(0, 4).map((region) => (
                  <BodyRegionRow key={region.regionId} region={region} compact />
                ))}
                {!data.bodyLoad.topRegions.length ? (
                  <p className="text-sm text-[var(--mantine-color-dimmed)]">No body-load data yet.</p>
                ) : null}
              </div>
            </section>

            <section className="vf-panel p-4">
              <h2 className="vf-section-label">Records</h2>
              <div className="mt-3 space-y-2">
                {data.bestSets.slice(0, 4).map((set) => (
                  <BestSetCard key={`${set.movementId}-${set.id}`} set={set} compact />
                ))}
                {!data.bestSets.length ? (
                  <p className="text-sm text-[var(--mantine-color-dimmed)]">No completed sets yet.</p>
                ) : null}
              </div>
            </section>

            {data.substitutions.length ? (
              <section className="vf-panel p-4">
                <h2 className="vf-section-label">Substitutions</h2>
                <div className="mt-3 space-y-2">
                  {data.substitutions.slice(0, 3).map((substitution) => (
                    <SubstitutionRow key={substitution.id} substitution={substitution} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : (
        <EmptyState title="No completed sessions yet">
          Finish a workout and your training stats will appear here.
        </EmptyState>
      )}
    </div>
  )
}

function BodyLoadTab({ data }: { data: HistoryDashboard }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="vf-panel p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="vf-section-label">Body load</h2>
            <p className="mt-1 text-sm font-extrabold">Last {data.bodyLoad.windowDays} days</p>
          </div>
          <Badge color="success">{data.bodyLoad.freshRegionCount} fresh</Badge>
        </div>
        <BodyLoadMap regions={data.bodyLoad.regions} />
      </section>

      <section className="vf-panel p-4">
        <h2 className="vf-section-label">Affected regions</h2>
        <div className="mt-3 space-y-2">
          {data.bodyLoad.regions
            .filter((region) => region.impactPercent > 0)
            .sort((left, right) => right.impactPercent - left.impactPercent)
            .map((region) => (
              <BodyRegionRow key={region.regionId} region={region} />
            ))}
          {!data.bodyLoad.topRegions.length ? (
            <p className="text-sm text-[var(--mantine-color-dimmed)]">No completed sets in the recent window.</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function MovementsTab({ data }: { data: HistoryDashboard }) {
  const [query, setQuery] = useState('')
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
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="Search movements"
        leftSection={<Search size={14} />}
        classNames={{ input: '!border-[var(--mantine-color-default-border)] !bg-[var(--vf-surface-2)]' }}
      />
      {filtered.length ? (
        <div className="grid gap-3 md:grid-cols-2">
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
    <div className="grid gap-3 md:grid-cols-2">
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
  onOpenSession,
}: {
  sessions: RecentHistoryEntry[]
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
      Finish a workout and it will be listed here with movement history.
    </EmptyState>
  )
}

function TabLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {label}
    </span>
  )
}

function OverviewMetric({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  tone?: 'neutral' | 'success'
}) {
  return (
    <div className="vf-stat">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="shrink-0 text-[var(--mantine-color-dimmed)]">{icon}</span>
        <span className={cn('min-w-0 flex-1 text-right', tone === 'success' ? 'text-[var(--vf-success-text)]' : 'text-[var(--mantine-color-text)]')}>
          <span className="vf-stat-value block truncate">{value}</span>
        </span>
      </div>
      <p className="vf-stat-label">{label}</p>
    </div>
  )
}

function WeeklyVolumeStrip({ weeks, units }: { weeks: HistoryDashboard['weeklyVolume']; units?: Unit | null }) {
  const maxVolume = Math.max(...weeks.map((week) => week.volume), 1)
  return (
    <div className="mt-4 grid gap-2">
      {weeks.length ? weeks.map((week) => {
        const width = `${Math.max(4, Math.round((week.volume / maxVolume) * 100))}%`
        return (
          <div key={week.weekStart} className="grid grid-cols-[3.5rem_minmax(0,1fr)_5rem] items-center gap-2 text-xs">
            <p className="font-bold text-[var(--mantine-color-dimmed)]">{week.weekLabel}</p>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--vf-surface-inset)]">
              <div className="h-full rounded-full bg-[var(--mantine-primary-color-filled)]" style={{ width }} />
            </div>
            <p className="text-right font-extrabold">{formatLoad(week.volume, units)}</p>
          </div>
        )
      }) : (
        <p className="text-sm text-[var(--mantine-color-dimmed)]">No weekly volume yet.</p>
      )}
    </div>
  )
}

function BodyLoadMap({ regions }: { regions: BodyLoadRegion[] }) {
  const byId = new Map(regions.map((region) => [region.regionId, region]))
  const fill = (regionId: BodyRegionId) => bodyLoadFill(byId.get(regionId)?.tier ?? 'fresh')
  const opacity = (regionId: BodyRegionId) => 0.35 + ((byId.get(regionId)?.impactPercent ?? 0) / 100) * 0.65

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(16rem,1fr)_15rem] md:items-center">
      <svg viewBox="0 0 300 420" role="img" aria-label="Body load map" className="mx-auto h-auto w-full max-w-[26rem]">
        <rect x="0" y="0" width="300" height="420" rx="24" fill="var(--vf-surface-2)" />
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

      <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
        {regions.map((region) => (
          <div key={region.regionId} className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-extrabold">{region.label}</p>
              <span className="text-xs font-black">{region.impactPercent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--vf-surface-inset)]">
              <div className={cn('h-full rounded-full', bodyLoadBarClass(region.tier))} style={{ width: `${region.impactPercent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BodyRegionRow({ region, compact = false }: { region: BodyLoadRegion; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold">{region.label}</p>
          {!compact ? (
            <p className="mt-0.5 truncate text-xs text-[var(--mantine-color-dimmed)]">
              {region.movementNames.length ? region.movementNames.join(', ') : 'No recent work'}
            </p>
          ) : null}
        </div>
        <Badge color={badgeColorForTier(region.tier)}>{region.impactPercent}%</Badge>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--vf-surface-inset)]">
        <div className={cn('h-full rounded-full', bodyLoadBarClass(region.tier))} style={{ width: `${region.impactPercent}%` }} />
      </div>
      {!compact ? (
        <p className="mt-2 text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">
          {region.recentSetCount} recent set{region.recentSetCount === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  )
}

function MovementSummaryCard({ movement, units }: { movement: HistoryMovementSummary; units?: Unit | null }) {
  return (
    <article className="vf-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{movement.movementName}</p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--mantine-color-dimmed)]">{movement.category.replaceAll('_', ' ')}</p>
        </div>
        <Badge>{movement.totalCompletedSets} sets</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniMetric label="Last" value={formatCompactDate(movement.lastPerformedAt)} />
        <MiniMetric label="Volume" value={formatLoad(movement.totalVolume, units)} />
      </div>
      {movement.bestSet ? (
        <p className="mt-3 rounded-lg border border-[var(--vf-accent-border)] bg-[var(--vf-accent-soft)] p-2 text-xs font-bold text-[var(--vf-accent-text)]">
          Best: {formatBestSet(movement.bestSet)}
        </p>
      ) : null}
      {movement.substitutionCount ? (
        <p className="mt-2 text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">{movement.substitutionCount} substitution{movement.substitutionCount === 1 ? '' : 's'}</p>
      ) : null}
    </article>
  )
}

function BestSetCard({ set, compact = false }: { set: HistoryBestSet; compact?: boolean }) {
  return (
    <article className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold">{set.movementName}</p>
          {!compact ? <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">{set.sessionTitle}</p> : null}
        </div>
        <Badge color={set.type === 'accessory' ? 'neutral' : 'action'}>{formatRecordType(set.type)}</Badge>
      </div>
      <p className="mt-3 text-lg font-black">{formatBestSet(set)}</p>
      {!compact ? (
        <p className="mt-1 text-xs font-semibold text-[var(--mantine-color-dimmed)]">{formatCompactDate(set.performedAt)}</p>
      ) : null}
    </article>
  )
}

function SubstitutionRow({ substitution }: { substitution: HistorySubstitutionSummary }) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <p className="text-xs font-extrabold">
        {substitution.plannedMovementName} <span className="text-[var(--mantine-color-dimmed)]">to</span> {substitution.performedMovementName}
      </p>
      <p className="mt-1 text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">
        {formatReason(substitution.reason)} · {formatCompactDate(substitution.performedAt)}
      </p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-2">
      <p className="text-[10px] font-extrabold uppercase text-[var(--mantine-color-dimmed)]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  )
}

function RecentWorkoutCard({ session, onOpen }: { session: RecentHistoryEntry; onOpen: () => void }) {
  const date = session.completedAt ?? session.scheduledDate
  return (
    <button
      type="button"
      className="vf-card-hover rounded-[var(--mantine-radius-lg)] border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-3 text-left text-[var(--mantine-color-text)] shadow-[var(--vf-shadow-card)] transition hover:border-[var(--vf-action-border)] md:p-4"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--vf-action-text)]">
            {session.completedAt ? <Trophy size={16} /> : <Dumbbell size={16} />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-extrabold">{session.title}</p>
            <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">{session.programTitle ?? 'Training session'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {session.weekLabel ? <Badge>{session.weekLabel}</Badge> : null}
              {session.hardness ? <Badge color={session.hardness === 'Hard' ? 'danger' : 'neutral'}>{session.hardness}</Badge> : null}
              <Badge>{session.movementCount} movements</Badge>
              <Badge>{session.completedSetCount}/{session.plannedSetCount} sets</Badge>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-[11px] font-extrabold text-[var(--mantine-color-text)]">{formatCompactDate(date)}</p>
            <p className="text-[10px] font-semibold text-[var(--mantine-color-dimmed)]">{formatRelativeTime(date)}</p>
          </div>
          <ChevronRight size={16} className="text-[var(--mantine-color-dimmed)]" />
        </div>
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
        content: '!mb-0 !flex !max-h-[90dvh] !flex-col !overflow-hidden !rounded-b-none !border !border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)] sm:!mb-auto sm:!rounded-lg',
        header: '!bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        title: 'text-lg font-bold !text-[var(--mantine-color-text)]',
        body: '!min-h-0 !flex-1 !overflow-hidden !text-[var(--mantine-color-text)]',
        close: '!text-[var(--mantine-color-dimmed)] hover:!bg-[var(--vf-surface-2)] hover:!text-[var(--mantine-color-text)]',
      }}
    >
      {isLoading ? (
        <HistoryModalStatus>Loading workout summary...</HistoryModalStatus>
      ) : error ? (
        <HistoryModalStatus tone="danger">{getApiErrorMessage(error, 'Unable to load workout summary')}</HistoryModalStatus>
      ) : session ? (
        <div className="grid max-h-[calc(90dvh-6rem)] min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] gap-4">
          <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="vf-section-label">{session.programTitle}</p>
                <h2 className="mt-1 text-xl font-extrabold">{session.title}</h2>
                <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
                  {session.weekLabel} · {session.hardness} · {session.estimatedMinutes} min
                </p>
              </div>
              <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-3 py-2 text-right">
                <p className="text-sm font-extrabold">{formatFullDate(date)}</p>
                <p className="text-xs text-[var(--mantine-color-dimmed)]">{formatRelativeTime(date)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <SummaryMetric icon={<Dumbbell size={14} />} label="Movements" value={session.movements.length} />
            <SummaryMetric icon={<ListChecks size={14} />} label="Sets" value={`${completedSets.length}/${sets.length}`} />
            <SummaryMetric icon={<Trophy size={14} />} label="Top sets" value={topSets.length} />
          </div>

          {topSets.length ? (
            <div>
              <h3 className="vf-section-label mb-2">Highlights</h3>
              <div className="flex flex-wrap gap-1.5">
                {topSets.slice(0, 4).map((set) => (
                  <span key={set.id} className="rounded-md border border-[var(--vf-accent-border)] bg-[var(--vf-accent-soft)] px-2 py-1 text-xs font-bold text-[var(--vf-accent-text)]">
                    {formatSetLog(set, session.units)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {session.movements.map((movement) => (
              <WorkoutMovementSummary key={movement.id} session={session} movement={movement} />
            ))}

            {session.notes ? (
              <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                <h3 className="vf-section-label mb-1">Notes</h3>
                <p className="text-sm text-[var(--mantine-color-dimmed)]">{session.notes}</p>
              </div>
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
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-extrabold">{movement.movementName}</p>
          <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
        </div>
        <Badge color={movement.role === 'main' ? 'action' : 'neutral'}>{movement.role}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {displaySets.map((set) => (
          <span
            key={set.id}
            className={cn(
              'rounded-lg border px-2 py-1 text-[11px] font-bold',
              set.isTopSet || set.isAmrap
                ? 'border-[var(--vf-accent-border)] bg-[var(--vf-accent-soft)] text-[var(--vf-accent-text)]'
                : set.completed
                  ? 'border-[var(--vf-success-border)] bg-[var(--vf-success-soft)] text-[var(--vf-success-text)]'
                  : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)]',
            )}
          >
            {set.setIndex}: {formatSetLog(set, session.units)}
          </span>
        ))}
      </div>
    </div>
  )
}

function SummaryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 text-center">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--mantine-color-default)] text-[var(--vf-action-text)]">
        {icon}
      </div>
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[10px] text-[var(--mantine-color-dimmed)]">{label}</p>
    </div>
  )
}

function HistoryModalStatus({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <p className={cn('rounded-lg border p-3 text-sm', tone === 'danger' ? 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]' : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]')}>
      {children}
    </p>
  )
}

function bodyLoadFill(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'var(--vf-danger-text)'
  if (tier === 'moderate') return 'var(--vf-warning-text)'
  if (tier === 'low') return 'var(--vf-action-text)'
  return 'var(--mantine-color-dimmed)'
}

function bodyLoadBarClass(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'bg-[var(--vf-danger-text)]'
  if (tier === 'moderate') return 'bg-[var(--vf-warning-text)]'
  if (tier === 'low') return 'bg-[var(--vf-action-text)]'
  return 'bg-[var(--mantine-color-dimmed)]'
}

function badgeColorForTier(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'danger'
  if (tier === 'moderate') return 'warning'
  if (tier === 'low') return 'action'
  return 'neutral'
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
