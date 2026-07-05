import { Badge, Tabs } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Activity, BarChart3, Dumbbell, History, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { activeProgramQueryOptions } from '~/domains/program/queries'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import type { MovementSortKey, SessionFilter, SortDir } from '~/domains/history/lib/insights'
import { sessionQueryOptions } from '~/domains/session/queries'
import { EmptyState, Page, PageHeader, PageLoadError, PageSkeleton } from '~/components'
import { WorkoutSummaryModal } from './WorkoutSummaryModal'
import { type HistoryTab } from './insight-format'
import { BodyLoadTab } from './tabs/BodyLoadTab'
import { MovementsTab } from './tabs/MovementsTab'
import { OverviewTab } from './tabs/OverviewTab'
import { RecordsTab } from './tabs/RecordsTab'
import { SessionsTab } from './tabs/SessionsTab'

export { HISTORY_TAB_VALUES } from './insight-format'
export type { HistoryTab } from './insight-format'

const HISTORY_TABS: Array<{ value: HistoryTab; label: string; icon: ReactNode }> = [
  { value: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
  { value: 'body-load', label: 'Muscle Fatigue', icon: <Activity size={14} /> },
  { value: 'movements', label: 'Movements', icon: <Dumbbell size={14} /> },
  { value: 'records', label: 'Records', icon: <Trophy size={14} /> },
  { value: 'sessions', label: 'Sessions', icon: <History size={14} /> },
]

export function HistoryPage({ user, initialTab }: { user: unknown; initialTab?: HistoryTab }) {
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
  const historyQuery = useQuery(historyDashboardQueryOptions())
  const activeProgramQuery = useQuery(activeProgramQueryOptions())
  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab ?? 'overview')
  const [movementQuery, setMovementQuery] = useState('')
  const [movementCategory, setMovementCategory] = useState<string | null>(null)
  const [movementSort, setMovementSort] = useState<{ key: MovementSortKey; dir: SortDir }>({ key: 'volume', dir: 'desc' })
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all')
  const [sessionSearch, setSessionSearch] = useState('')
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
            filter={sessionFilter}
            onFilterChange={setSessionFilter}
            search={sessionSearch}
            onSearchChange={setSessionSearch}
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

function TabLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="inline-flex shrink-0">{icon}</span>
      <span>{label}</span>
    </span>
  )
}
