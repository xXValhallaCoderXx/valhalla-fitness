import { Badge, Button, Tabs, TextInput } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity, ArrowRight, BarChart3, ChevronDown, ChevronRight, ChevronUp, Dumbbell, History, Search, Trophy } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '~/shared/lib/cn'
import { formatCompactDate, formatRelativeTime } from '~/shared/lib/dates'
import { activeProgramQueryOptions } from '~/domains/program/queries'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { bodyLoadExplanation, bodyLoadTierLabels } from '~/domains/history/lib/body-load'
import {
  availableIntensities,
  bestSetAccent,
  bestSetTagLabel,
  buildVolumeSeries,
  filterMovements,
  filterSessionsByIntensity,
  groupBestSets,
  intensityColor,
  movementCategories,
  sortMovementSummaries,
  type AccentColor,
  type Intensity,
  type MovementSortKey,
  type SortDir,
  type VolumeSeries,
} from '~/domains/history/lib/insights'
import { sessionQueryOptions } from '~/domains/session/queries'
import type {
  BodyLoadRegion,
  BodyRegionId,
  HistoryBestSet,
  HistoryDashboard,
  HistoryMovementSummary,
  HistorySubstitutionSummary,
  RecentHistoryEntry,
  Unit,
} from '~/shared/types'
import { Caption, EmptyState, Page, PageHeader, PageLoadError, PageSkeleton, Panel, SectionLabel, StatValue, Text } from '~/components'
import { WorkoutSummaryModal } from './WorkoutSummaryModal'

type HistoryTab = 'overview' | 'body-load' | 'movements' | 'records' | 'sessions'

const HISTORY_TABS: Array<{ value: HistoryTab; label: string; icon: ReactNode }> = [
  { value: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
  { value: 'body-load', label: 'Muscle Fatigue', icon: <Activity size={14} /> },
  { value: 'movements', label: 'Movements', icon: <Dumbbell size={14} /> },
  { value: 'records', label: 'Records', icon: <Trophy size={14} /> },
  { value: 'sessions', label: 'Sessions', icon: <History size={14} /> },
]

/** Mantine palette names → themed CSS variables for dots, stripes, and rings. */
const ACCENT_TEXT: Record<AccentColor, string> = {
  action: 'var(--vf-action-text)',
  accent: 'var(--vf-accent-text)',
  warning: 'var(--vf-warning-text)',
  success: 'var(--vf-success-text)',
  danger: 'var(--vf-danger-text)',
  neutral: 'var(--mantine-color-dimmed)',
}
const ACCENT_SOFT: Record<AccentColor, string> = {
  action: 'var(--vf-action-soft)',
  accent: 'var(--vf-accent-soft)',
  warning: 'var(--vf-warning-soft)',
  success: 'var(--vf-success-soft)',
  danger: 'var(--vf-danger-soft)',
  neutral: 'var(--vf-surface-2)',
}

const historySearchInputStyles = {
  input: {
    borderColor: 'var(--mantine-color-default-border)',
    backgroundColor: 'var(--vf-surface-2)',
  },
}

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
  const [movementCategory, setMovementCategory] = useState<string | null>(null)
  const [movementSort, setMovementSort] = useState<{ key: MovementSortKey; dir: SortDir }>({ key: 'volume', dir: 'desc' })
  const [sessionIntensity, setSessionIntensity] = useState<Intensity | 'all'>('all')
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
        actions={activeProgramTitle ? <Badge color="action">Active · {activeProgramTitle}</Badge> : null}
      >
        Output by week, movement, body region, records, and session.
      </PageHeader>

      <Tabs
        variant="pills"
        keepMounted={false}
        value={activeTab}
        onChange={(value) => setActiveTab((value as HistoryTab | null) ?? 'overview')}
        classNames={{
          list: 'mb-4 !flex !flex-nowrap gap-1 overflow-x-auto border-b px-0.5 pb-2 pt-1 no-scrollbar',
          tab: '!my-0.5 !min-h-9 !shrink-0 !rounded-md !border-0 !px-2.5 !py-2',
          panel: 'focus-visible:outline-none',
        }}
        styles={{
          list: {
            borderColor: 'var(--mantine-color-default-border)',
          },
          tab: {
            fontSize: 'var(--mantine-font-size-xs)',
            fontWeight: 800,
            lineHeight: 1,
            '&[data-active]': {
              backgroundColor: 'var(--vf-action-soft)',
              color: 'var(--vf-action-text)',
            },
          },
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
          <OverviewTab data={data} activeProgramTitle={activeProgramTitle} onOpenSession={setSelectedSessionId} onNavigate={setActiveTab} />
        </Tabs.Panel>
        <Tabs.Panel value="body-load">
          <BodyLoadTab data={data} />
        </Tabs.Panel>
        <Tabs.Panel value="movements">
          <MovementsTab
            data={data}
            query={movementQuery}
            onQueryChange={setMovementQuery}
            category={movementCategory}
            onCategoryChange={setMovementCategory}
            sort={movementSort}
            onSortChange={setMovementSort}
          />
        </Tabs.Panel>
        <Tabs.Panel value="records">
          <RecordsTab data={data} />
        </Tabs.Panel>
        <Tabs.Panel value="sessions">
          <SessionsTab
            sessions={data.recentSessions}
            activeProgramTitle={activeProgramTitle}
            onOpenSession={setSelectedSessionId}
            intensity={sessionIntensity}
            onIntensityChange={setSessionIntensity}
          />
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

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  data,
  activeProgramTitle,
  onOpenSession,
  onNavigate,
}: {
  data: HistoryDashboard
  activeProgramTitle?: string | null
  onOpenSession: (sessionId: string) => void
  onNavigate: (tab: HistoryTab) => void
}) {
  const latestSession = data.recentSessions[0]
  const volumeWeeks = data.weeklyVolume.slice(-4)
  const volumeSeries = buildVolumeSeries(volumeWeeks, { width: 640, height: 150, paddingX: 24, paddingY: 16 })

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

  return (
    <div className="space-y-4">
      <Panel p={0} className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5" style={{ backgroundColor: 'var(--mantine-color-default-border)' }}>
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className={cn('p-4', kpi.desktopOnly && 'hidden lg:block')}
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

      {data.overview.completedSessions ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Panel p="md">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <SectionLabel>Weekly volume</SectionLabel>
                  <Text mt={4} size="sm" fw={900}>Last {volumeWeeks.length} training weeks</Text>
                </div>
                <div className="text-right">
                  <Text size="sm" fw={900}>{formatLoad(volumeSeries.total, data.overview.units)}</Text>
                  {volumeSeries.trendPercent != null ? (
                    <Caption fw={700} tone={volumeSeries.trendPercent >= 0 ? 'success' : 'danger'}>
                      {volumeSeries.trendPercent >= 0 ? '+' : ''}{Math.round(volumeSeries.trendPercent)}% vs prev
                    </Caption>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <VolumeLineChart series={volumeSeries} />
              </div>
            </Panel>

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
          </div>

          <div className="space-y-4">
            <Panel p="md">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel>Most worked</SectionLabel>
                <NavLink label="Body map" onClick={() => onNavigate('body-load')} />
              </div>
              <div className="mt-3 space-y-3">
                {data.bodyLoad.topRegions.slice(0, 4).map((region) => (
                  <MostWorkedBar key={region.regionId} region={region} />
                ))}
                {!data.bodyLoad.topRegions.length ? (
                  <Text size="sm" tone="dimmed">No muscle fatigue data yet.</Text>
                ) : null}
              </div>
            </Panel>

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
                  <Text size="sm" tone="dimmed" mt="sm">No completed sets yet.</Text>
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

function VolumeLineChart({ series }: { series: VolumeSeries }) {
  if (!series.points.length) {
    return (
      <Panel surface="inset" p="md">
        <Text size="sm" tone="dimmed">No weekly volume yet.</Text>
      </Panel>
    )
  }
  return (
    <svg viewBox="0 0 640 180" role="img" aria-label="Weekly volume chart" className="block w-full" style={{ height: 'auto' }}>
      {[16, 75, 134].map((y) => (
        <line key={y} x1={24} y1={y} x2={616} y2={y} stroke="var(--mantine-color-default-border)" strokeWidth={1} opacity={0.6} />
      ))}
      <path d={series.areaPath} fill="var(--vf-action-soft)" />
      <path d={series.linePath} fill="none" stroke="var(--mantine-primary-color-filled)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {series.points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--mantine-color-text)">
            {formatNumber(point.value)}
          </text>
          <circle cx={point.x} cy={point.y} r={4.5} fill="var(--mantine-color-default)" stroke="var(--mantine-primary-color-filled)" strokeWidth={2.5} />
          <text x={point.x} y={166} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--mantine-color-dimmed)">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1">
      <Text component="span" size="xs" fw={700} c="var(--vf-action-text)">{label}</Text>
      <ArrowRight size={13} color="var(--vf-action-text)" />
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
        <Text size="sm" fw={700} truncate>{session.title}</Text>
        <Caption truncate>{session.weekLabel ?? session.programTitle ?? 'Session'}</Caption>
      </div>
      <Badge color="success" style={{ flexShrink: 0 }}>{session.completedSetCount}/{session.plannedSetCount}</Badge>
      <Caption className="w-14 shrink-0" ta="right">{formatCompactDate(date)}</Caption>
    </button>
  )
}

function MostWorkedBar({ region }: { region: BodyLoadRegion }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Text size="sm" fw={600} truncate>{region.label}</Text>
        <Text size="xs" fw={700} tone={toneForTier(region.tier)}>{region.impactPercent}%</Text>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
        <div className="h-full rounded-full" style={{ width: `${region.impactPercent}%`, backgroundColor: bodyLoadColor(region.tier) }} />
      </div>
    </div>
  )
}

function LatestRecordRow({ set }: { set: HistoryBestSet }) {
  return (
    <div className="flex items-center gap-3 border-t py-2.5 first:border-t-0" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
      <Trophy size={16} color="var(--vf-warning-text)" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <Text size="sm" fw={700} truncate>{set.movementName}</Text>
        <Caption truncate>{formatBestSetPrimary(set)}</Caption>
      </div>
      <div className="shrink-0 text-right">
        <Text size="sm" fw={800} tone="action">{formatE1rm(set)}</Text>
        <SectionLabel>e1RM</SectionLabel>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Muscle Fatigue
// ---------------------------------------------------------------------------

function BodyLoadTab({ data }: { data: HistoryDashboard }) {
  const regions = data.bodyLoad.regions
    .filter((region) => region.impactPercent > 0)
    .sort((left, right) => right.impactPercent - left.impactPercent)

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <Panel p="md">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>Muscle fatigue</SectionLabel>
            <Text mt={4} size="sm" fw={900}>Last {data.bodyLoad.windowDays} days</Text>
          </div>
          <Badge color="success">{data.bodyLoad.freshRegionCount} of {data.bodyLoad.regions.length} fresh</Badge>
        </div>
        <BodyLoadMap regions={data.bodyLoad.regions} />
        <div className="mt-3 flex flex-wrap justify-center gap-4">
          <LegendSwatch color="var(--vf-danger-text)" label="Worked hard" />
          <LegendSwatch color="var(--vf-action-text)" label="Light" />
          <LegendSwatch color="var(--mantine-color-dimmed)" label="Fresh" />
        </div>
      </Panel>

      <Panel p="md">
        <SectionLabel>Affected regions · most to least</SectionLabel>
        <Caption mt={4}>{bodyLoadExplanation}</Caption>
        <div className="mt-2 flex flex-col">
          {regions.length ? (
            regions.map((region) => <FatigueRow key={region.regionId} region={region} />)
          ) : (
            <Text size="sm" tone="dimmed" mt="sm">No completed sets in the recent window.</Text>
          )}
        </div>
      </Panel>
    </div>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <Caption>{label}</Caption>
    </span>
  )
}

function FatigueRow({ region }: { region: BodyLoadRegion }) {
  return (
    <div className="flex items-center gap-4 border-t py-3 first:border-t-0" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
      <div className="w-28 shrink-0 sm:w-40">
        <Text fw={700} truncate>{region.label}</Text>
        <Caption mt={1}>{region.recentSetCount} recent set{region.recentSetCount === 1 ? '' : 's'}</Caption>
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
          <div className="h-full rounded-full" style={{ width: `${region.impactPercent}%`, backgroundColor: bodyLoadColor(region.tier) }} />
        </div>
        <Caption mt={1.5} truncate>{region.movementNames.length ? region.movementNames.join(', ') : 'No recent work'}</Caption>
      </div>
      <div className="w-16 shrink-0 text-right">
        <StatValue size="sm" tone={toneForTier(region.tier)}>{region.impactPercent}%</StatValue>
        <Caption size="0.625rem" fw={800} tone={toneForTier(region.tier)}>{bodyLoadTierLabels[region.tier]}</Caption>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Movements
// ---------------------------------------------------------------------------

const movementGridColumns =
  'grid grid-cols-[minmax(0,1fr)_4.5rem_3rem] items-center gap-3 md:grid-cols-[minmax(0,1.6fr)_5.5rem_6.5rem_minmax(0,1.4fr)_3.5rem]'

function MovementsTab({
  data,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: {
  data: HistoryDashboard
  query: string
  onQueryChange: (query: string) => void
  category: string | null
  onCategoryChange: (category: string | null) => void
  sort: { key: MovementSortKey; dir: SortDir }
  onSortChange: (sort: { key: MovementSortKey; dir: SortDir }) => void
}) {
  const categories = useMemo(() => movementCategories(data.movementSummaries), [data.movementSummaries])
  const rows = useMemo(
    () => sortMovementSummaries(filterMovements(data.movementSummaries, query, category), sort.key, sort.dir),
    [data.movementSummaries, query, category, sort],
  )

  const toggleSort = (key: MovementSortKey) =>
    onSortChange(sort.key === key ? { key, dir: sort.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <TextInput
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Search movements"
          leftSection={<Search size={14} />}
          styles={historySearchInputStyles}
          className="min-w-60 flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All" active={category === null} onClick={() => onCategoryChange(null)} />
          {categories.map((value) => (
            <FilterChip
              key={value}
              label={value.replaceAll('_', ' ')}
              active={category === value}
              onClick={() => onCategoryChange(value)}
            />
          ))}
        </div>
      </div>

      {rows.length ? (
        <Panel p={0} className="overflow-hidden">
          <div className={cn(movementGridColumns, 'px-5 py-3')} style={{ backgroundColor: 'var(--vf-surface-2)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            <SectionLabel>Movement</SectionLabel>
            <SortHeader label="Last" sortKey="last" sort={sort} onToggle={toggleSort} className="hidden md:flex" />
            <SortHeader label="Volume" sortKey="volume" sort={sort} onToggle={toggleSort} align="right" />
            <SortHeader label="Best · e1RM" sortKey="e1rm" sort={sort} onToggle={toggleSort} className="hidden md:flex" />
            <SortHeader label="Sets" sortKey="sets" sort={sort} onToggle={toggleSort} align="right" />
          </div>
          {rows.map((movement) => (
            <MovementRow key={movement.movementId} movement={movement} units={data.overview.units} />
          ))}
        </Panel>
      ) : (
        <EmptyState title="No matching movements">Completed movement summaries will appear here.</EmptyState>
      )}
    </div>
  )
}

function SortHeader({
  label,
  sortKey,
  sort,
  onToggle,
  align,
  className,
}: {
  label: string
  sortKey: MovementSortKey
  sort: { key: MovementSortKey; dir: SortDir }
  onToggle: (key: MovementSortKey) => void
  align?: 'right'
  className?: string
}) {
  const active = sort.key === sortKey
  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn('flex items-center gap-1', align === 'right' && 'justify-end', className)}
    >
      <SectionLabel component="span" tone={active ? 'action' : 'dimmed'}>{label}</SectionLabel>
      {active ? (
        sort.dir === 'asc' ? <ChevronUp size={12} color="var(--vf-action-text)" /> : <ChevronDown size={12} color="var(--vf-action-text)" />
      ) : null}
    </button>
  )
}

function MovementRow({ movement, units }: { movement: HistoryMovementSummary; units?: Unit | null }) {
  return (
    <div className={cn(movementGridColumns, 'border-t px-5 py-3')} style={{ borderColor: 'var(--mantine-color-default-border)' }}>
      <div className="min-w-0">
        <Text size="sm" fw={700} truncate>{movement.movementName}</Text>
        <Caption tt="capitalize" truncate>{movement.category.replaceAll('_', ' ')}</Caption>
      </div>
      <Text size="sm" tone="dimmed" className="hidden md:block">{formatCompactDate(movement.lastPerformedAt)}</Text>
      <Text size="sm" fw={700} ta="right">{formatLoad(movement.totalVolume, units)}</Text>
      <div className="hidden min-w-0 md:block">
        {movement.bestSet ? (
          <Text size="sm" truncate>
            <Text component="span" size="sm" fw={600}>{formatBestSetPrimary(movement.bestSet)}</Text>
            {typeof movement.bestSet.e1rm === 'number' ? (
              <Text component="span" size="xs" fw={700} tone="action"> · e1RM {formatNumber(movement.bestSet.e1rm)}</Text>
            ) : null}
          </Text>
        ) : (
          <Caption>—</Caption>
        )}
      </div>
      <Text size="sm" fw={700} ta="right">{movement.totalCompletedSets}</Text>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

function RecordsTab({ data }: { data: HistoryDashboard }) {
  const groups = groupBestSets(data.bestSets)
  if (!groups.length) {
    return <EmptyState title="No records yet">Complete sets with load and reps to build records.</EmptyState>
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-3 flex items-center gap-3">
            <SectionLabel>{group.title}</SectionLabel>
            <span className="h-px flex-1" style={{ backgroundColor: 'var(--mantine-color-default-border)' }} />
            <Caption>{group.items.length}</Caption>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((set) => (
              <RecordCard key={`${set.movementId}-${set.id}`} set={set} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function RecordCard({ set }: { set: HistoryBestSet }) {
  const accent = bestSetAccent(set.type)
  return (
    <Panel p="sm" className="relative overflow-hidden">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: ACCENT_TEXT[accent] }} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <Text fw={800} truncate>{set.movementName}</Text>
          <Caption mt={1} truncate>{set.sessionTitle} · {formatCompactDate(set.performedAt)}</Caption>
        </div>
        <Badge color={accent} variant="light" style={{ flexShrink: 0 }}>{bestSetTagLabel(set.type)}</Badge>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2 pl-2">
        <div className="min-w-0">
          <Text component="span" size="lg" fw={800}>{formatBestSetPrimary(set)}</Text>
          {typeof set.rir === 'number' ? <Caption component="span" ml={6}>RIR {set.rir}</Caption> : null}
        </div>
        <div className="shrink-0 text-right">
          <Text size="sm" fw={800} tone="action">{formatE1rm(set)}</Text>
          <SectionLabel>e1RM</SectionLabel>
        </div>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function SessionsTab({
  sessions,
  activeProgramTitle,
  onOpenSession,
  intensity,
  onIntensityChange,
}: {
  sessions: RecentHistoryEntry[]
  activeProgramTitle?: string | null
  onOpenSession: (sessionId: string) => void
  intensity: Intensity | 'all'
  onIntensityChange: (intensity: Intensity | 'all') => void
}) {
  const intensities = availableIntensities(sessions)
  const filtered = filterSessionsByIntensity(sessions, intensity)

  if (!sessions.length) {
    return (
      <EmptyState title="No completed sessions yet">
        {activeProgramTitle
          ? `${activeProgramTitle} is active. Finished workouts will be listed here with movement history.`
          : 'Finish a workout and it will be listed here with movement history.'}
      </EmptyState>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={intensity === 'all'} onClick={() => onIntensityChange('all')} />
        {intensities.map((level) => (
          <FilterChip key={level} label={level} active={intensity === level} onClick={() => onIntensityChange(level)} />
        ))}
      </div>
      <Panel px="md" py="xs">
        {filtered.length ? (
          filtered.map((session, index) => (
            <SessionRow
              key={session.id}
              session={session}
              last={index === filtered.length - 1}
              onOpen={() => onOpenSession(session.id)}
            />
          ))
        ) : (
          <Text size="sm" tone="dimmed" className="py-3">No {intensity.toString().toLowerCase()} sessions.</Text>
        )}
      </Panel>
    </div>
  )
}

function SessionRow({ session, last, onOpen }: { session: RecentHistoryEntry; last: boolean; onOpen: () => void }) {
  const color = intensityColor(session.hardness)
  const date = session.completedAt ?? session.scheduledDate
  return (
    <div className="flex gap-4">
      <div className="flex w-3.5 shrink-0 flex-col items-center">
        <span
          className="mt-5 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: ACCENT_TEXT[color], boxShadow: `0 0 0 3px ${ACCENT_SOFT[color]}` }}
        />
        {!last ? <span className="w-px flex-1" style={{ backgroundColor: 'var(--mantine-color-default-border)' }} /> : null}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center justify-between gap-4 border-t py-3.5 text-left first:border-t-0"
        style={{ borderColor: 'var(--mantine-color-default-border)' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Text fw={800} truncate>{session.title}</Text>
            {session.hardness ? <Badge color={color} variant="light" style={{ flexShrink: 0 }}>{session.hardness}</Badge> : null}
          </div>
          <Caption mt={2} truncate>
            {[session.weekLabel, `${session.movementCount} movements`, `${session.completedSetCount}/${session.plannedSetCount} sets`]
              .filter(Boolean)
              .join(' · ')}
          </Caption>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <Text size="xs" fw={700}>{formatCompactDate(date)}</Text>
            <Caption size="0.625rem">{formatRelativeTime(date)}</Caption>
          </div>
          <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
        </div>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5"
      style={{
        whiteSpace: 'nowrap',
        backgroundColor: active ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)',
        border: `1px solid ${active ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
      }}
    >
      <Text component="span" size="xs" fw={700} tt="capitalize" c={active ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)'}>
        {label}
      </Text>
    </button>
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

function formatBestSetPrimary(set: HistoryBestSet) {
  const load = set.load == null ? 'Bodyweight' : `${formatNumber(set.load)} ${set.units ?? ''}`.trim()
  const reps = `${set.reps ?? '-'}${set.type === 'amrap' ? '+' : ''}`
  return `${load} × ${reps} reps`
}

function formatE1rm(set: HistoryBestSet) {
  return typeof set.e1rm === 'number' ? `${formatNumber(set.e1rm)} ${set.units ?? ''}`.trim() : '—'
}

function formatLoad(value?: number | null, units?: Unit | null) {
  if (!value) return `0 ${units ?? ''}`.trim()
  return `${formatNumber(value)} ${units ?? ''}`.trim()
}

function formatReason(reason: HistorySubstitutionSummary['reason']) {
  return reason.replaceAll('_', ' ')
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value)
}
