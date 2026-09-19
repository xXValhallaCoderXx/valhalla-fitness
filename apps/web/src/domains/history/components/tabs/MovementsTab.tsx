import { useMemo } from 'react'
import {
  filterMovements,
  movementCategories,
  sortMovementSummaries,
  type MovementSortKey,
  type SortDir,
} from '~/domains/history/lib/insights'
import { totalsByMovement } from '~/domains/history/lib/movement-weeks'
import { selectInsightWeeks } from '~/domains/history/lib/insight-selectors'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import { insightTabLabel } from '~/domains/history/lib/insight-labels'
import type { HistoryDashboardWithInsights } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { EmptyState, Panel } from '~/components'
import { formatDayMonth } from '~/shared/lib/dates'
import { InsightTabHeader } from '../insights/InsightTabHeader'
import { MovementSubstitutions } from '../movement/MovementSubstitutions'
import { MovementsToolbar } from '../movements/MovementsToolbar'
import { MovementsTable } from '../movements/MovementsTable'

/**
 * Every movement, with what it did inside the selected range.
 *
 * Sets and volume are range-scoped from the weekly buckets; the best set is all-time, because a
 * "best" that vanishes when you narrow the window is not a best.
 */
export function MovementsTab({
  data,
  range,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: {
  data: HistoryDashboardWithInsights
  range: InsightRange
  query: string
  onQueryChange: (query: string) => void
  category: string | null
  onCategoryChange: (category: string | null) => void
  sort: { key: MovementSortKey; dir: SortDir }
  onSortChange: (sort: { key: MovementSortKey; dir: SortDir }) => void
}) {
  const { mode } = useExperienceMode()
  const categories = useMemo(() => movementCategories(data.movementSummaries), [data.movementSummaries])
  const rows = useMemo(
    () => sortMovementSummaries(filterMovements(data.movementSummaries, query, category), sort.key, sort.dir),
    [data.movementSummaries, query, category, sort],
  )

  const totals = useMemo(
    () => totalsByMovement(selectInsightWeeks(data.insights.weeklyMovements, data.insights, range)),
    [data.insights, range],
  )

  // A row is navigable only when the lift actually has a per-session series behind it.
  const trackedMovementIds = useMemo(
    () => new Set(data.insights.liftSeries.map((series) => series.movementId)),
    [data.insights.liftSeries],
  )

  const lastLogged = data.movementSummaries
    .map((movement) => movement.lastPerformedAt)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1)

  return (
    <div>
      <InsightTabHeader
        title={insightTabLabel('movements', mode)}
        subtitle={[
          `${rows.length} of ${data.movementSummaries.length} movements`,
          lastLogged ? `last logged ${formatDayMonth(lastLogged)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        note="Sets and volume follow the range; the best set is all-time."
        actions={
          <MovementsToolbar
            query={query}
            onQueryChange={onQueryChange}
            category={category}
            onCategoryChange={onCategoryChange}
            categories={categories}
          />
        }
      />

      {rows.length ? (
        <Panel px="md" py="sm">
          <MovementsTable
            rows={rows}
            totals={totals}
            units={data.overview.units}
            sort={sort}
            onSortChange={onSortChange}
            trackedMovementIds={trackedMovementIds}
          />
        </Panel>
      ) : (
        <EmptyState title="No matching movements">Completed movement summaries will appear here.</EmptyState>
      )}

      <div className="mt-4">
        <MovementSubstitutions substitutions={data.substitutions} />
      </div>
    </div>
  )
}
