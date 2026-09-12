import { Button, TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  buildSessionLedgerRows,
  filterLedgerRows,
  type LedgerFilter,
} from '~/domains/history/lib/session-ledger'
import { availableIntensities, hasAdHocSessions } from '~/domains/history/lib/insights'

/** Rows rendered before "Show older"; the design shows a paged ledger, not the whole history. */
const SESSION_PAGE_SIZE = 20
import { AD_HOC_BADGE_LABEL } from '~/domains/session/lib/ad-hoc'
import type { HistoryDashboardWithInsights } from '~/domains/history'
import type { ProgressionDecision } from '~/domains/program'
import { Caption, EmptyState, Panel } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { FilterChip, historySearchInputStyles } from '../insight-format'
import { SessionLedgerRail } from '../sessions/SessionLedgerRail'
import { SessionLedgerTable } from '../sessions/SessionLedgerTable'

/**
 * The ledger: every session, what it did, and what is waiting on a decision because of it.
 *
 * Rows are built for the whole history and filtered afterwards, so the totals in the rail keep
 * describing everything in range rather than the current filter.
 */
export function SessionsTab({
  data,
  activeProgramTitle,
  pendingDecisions,
  onOpenSession,
  onReviewDecisions,
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: {
  data: HistoryDashboardWithInsights
  activeProgramTitle?: string | null
  pendingDecisions: ProgressionDecision[]
  onOpenSession: (sessionId: string) => void
  onReviewDecisions: () => void
  filter: LedgerFilter
  onFilterChange: (filter: LedgerFilter) => void
  search: string
  onSearchChange: (value: string) => void
}) {
  const sessions = data.recentSessions
  const rows = useMemo(
    () => buildSessionLedgerRows({ sessions, liftSeries: data.insights.liftSeries }),
    [sessions, data.insights.liftSeries],
  )
  const { isFull } = useExperienceMode()
  // The dashboard ships up to RECENT_HISTORY_LIMIT rows; rendering all of them at once puts three
  // times the DOM on a phone for a ledger nobody scrolls to the bottom of. The design pages it.
  const [shown, setShown] = useState(SESSION_PAGE_SIZE)
  const matching = filterLedgerRows(rows, filter, search, activeProgramTitle)
  const visible = matching.slice(0, shown)
  const intensities = availableIntensities(sessions)
  const total = data.overview.completedSessions

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
      <TextInput
        leftSection={<Search size={16} />}
        placeholder="Search sessions"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        styles={historySearchInputStyles}
      />
      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={filter === 'all'} onClick={() => onFilterChange('all')} />
        {activeProgramTitle ? (
          <FilterChip
            label="This programme"
            active={filter === 'programme'}
            onClick={() => onFilterChange('programme')}
          />
        ) : null}
        <FilterChip label="PRs only" active={filter === 'pr'} onClick={() => onFilterChange('pr')} />
        {intensities.map((level) => (
          <FilterChip key={level} label={level} active={filter === level} onClick={() => onFilterChange(level)} />
        ))}
        {hasAdHocSessions(sessions) ? (
          <FilterChip label={AD_HOC_BADGE_LABEL} active={filter === 'adhoc'} onClick={() => onFilterChange('adhoc')} />
        ) : null}
      </div>

      {/* The totals rail is Full-only, and it splits at `xl` rather than `lg`: eight columns beside
          a 20rem rail clip the table at 1280, and a ledger you cannot read is worse than one whose
          totals sit underneath it. */}
      <div className={isFull ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start' : ''}>
        <Panel px="md" py="sm" className="min-w-0">
          <SessionLedgerTable rows={visible} units={data.overview.units ?? null} onOpen={onOpenSession} />
        </Panel>
        <SessionLedgerRail
          rows={rows}
          visibleRows={visible}
          now={data.insights.today}
          units={data.overview.units ?? null}
          pendingDecisions={pendingDecisions}
          onReviewDecisions={onReviewDecisions}
        />
      </div>

      {/* Say what is not on screen rather than implying this is everything. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Caption component="p">
          {`${visible.length} of ${matching.length} shown`}
          {matching.length === total ? '' : ` · ${total} completed in total`}
        </Caption>
        {visible.length < matching.length ? (
          <Button size="xs" variant="default" onClick={() => setShown((count) => count + SESSION_PAGE_SIZE)}>
            Show older
          </Button>
        ) : null}
      </div>
    </div>
  )
}
