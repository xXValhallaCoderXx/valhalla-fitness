import { Button } from '@mantine/core'
import { useMemo, useState } from 'react'
import {
  buildSessionLedgerRows,
  filterLedgerRows,
  sessionLedgerTotals,
  sessionsSubtitle,
  type LedgerFilter,
} from '~/domains/history/lib/session-ledger'
import { availableIntensities, hasAdHocSessions } from '~/domains/history/lib/insights'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import type { HistoryDashboardWithInsights } from '~/domains/history'
import type { ProgressionDecision } from '~/domains/program'
import { Caption, EmptyState, InspectorLayout, Panel } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { InsightTabHeader } from '../insights/InsightTabHeader'
import { PendingDecisionsPanel } from '../sessions/PendingDecisionsPanel'
import { SessionLedgerTable } from '../sessions/SessionLedgerTable'
import { SessionTotalsPanel } from '../sessions/SessionTotalsPanel'
import { SessionsToolbar } from '../sessions/SessionsToolbar'

/** Rows rendered before "Show older"; the design shows a paged ledger, not the whole history. */
const SESSION_PAGE_SIZE = 20

/**
 * The ledger: every session, what it did, and what is waiting on a decision because of it.
 *
 * Rows are built for everything in range and filtered afterwards, so the totals keep describing the
 * range rather than the current filter.
 */
export function SessionsTab({
  data,
  range,
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
  range: InsightRange
  activeProgramTitle?: string | null
  pendingDecisions: ProgressionDecision[]
  onOpenSession: (sessionId: string) => void
  onReviewDecisions: () => void
  filter: LedgerFilter
  onFilterChange: (filter: LedgerFilter) => void
  search: string
  onSearchChange: (search: string) => void
}) {
  const { mode, isFull } = useExperienceMode()
  const { insights } = data

  const sessions = useMemo(
    () =>
      filterToRange(data.recentSessions, range, {
        firstDataDate: insights.firstSessionDate,
        now: insights.today,
        getDate: (session) => session.scheduledDate,
      }),
    [data.recentSessions, insights.firstSessionDate, insights.today, range],
  )
  const rows = useMemo(
    () => buildSessionLedgerRows({ sessions, liftSeries: insights.liftSeries }),
    [sessions, insights.liftSeries],
  )

  // The dashboard ships up to RECENT_HISTORY_LIMIT rows; rendering all of them at once puts three
  // times the DOM on a phone for a ledger nobody scrolls to the bottom of. The design pages it.
  const [shown, setShown] = useState(SESSION_PAGE_SIZE)
  const matching = filterLedgerRows(rows, filter, search, activeProgramTitle)
  const visible = matching.slice(0, shown)
  const total = data.overview.completedSessions

  if (!data.recentSessions.length) {
    return (
      <EmptyState title="No completed sessions yet">
        {activeProgramTitle
          ? `${activeProgramTitle} is active. Finished workouts will be listed here with movement history.`
          : 'Finish a workout and it will be listed here with movement history.'}
      </EmptyState>
    )
  }

  const decisions = (
    <PendingDecisionsPanel
      pendingDecisions={pendingDecisions}
      units={data.overview.units ?? null}
      onReviewDecisions={onReviewDecisions}
    />
  )

  return (
    <div>
      <InsightTabHeader
        title="Sessions"
        subtitle={sessionsSubtitle(sessionLedgerTotals(rows), mode, data.overview.units ?? null)}
        actions={
          <SessionsToolbar
            search={search}
            onSearchChange={onSearchChange}
            filter={filter}
            onFilterChange={onFilterChange}
            activeProgramTitle={activeProgramTitle}
            intensities={availableIntensities(sessions)}
            hasAdHoc={hasAdHocSessions(sessions)}
          />
        }
      />

      <InspectorLayout
        label="Totals"
        inspector={
          <div className="flex flex-col gap-4">
            <SessionTotalsPanel
              rows={rows}
              visibleRows={visible}
              now={insights.today}
              calibration={insights.calibration}
              units={data.overview.units ?? null}
            />
            {decisions}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Panel px="md" py="sm" className="min-w-0">
            <SessionLedgerTable rows={visible} units={data.overview.units ?? null} onOpen={onOpenSession} />

            {/* Say what is not on screen rather than implying this is everything. */}
            <div
              className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
              style={{ borderColor: 'var(--mantine-color-default-border)' }}
            >
              <Caption component="p">
                {`${visible.length} of ${matching.length} in range`}
                {matching.length === total ? '' : ` · ${total} completed in total`}
              </Caption>
              {visible.length < matching.length ? (
                <Button size="xs" variant="default" onClick={() => setShown((count) => count + SESSION_PAGE_SIZE)}>
                  Show older
                </Button>
              ) : null}
            </div>
          </Panel>

          {/* The receipt rides in Full's rail beside the totals, per the design. Guided has no
              rail, and "no silent changes" is not a Full feature — so it falls back to the column. */}
          {isFull ? null : decisions}
        </div>
      </InspectorLayout>
    </div>
  )
}
