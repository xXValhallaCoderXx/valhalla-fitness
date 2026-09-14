import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { MovementSortKey, SortDir } from '~/domains/history/lib/insights'
import type { RangedMovementTotals } from '~/domains/history/lib/movement-weeks'
import type { HistoryMovementSummary } from '~/domains/history'
import type { Unit } from '~/shared/types'
import { formatDayMonth } from '~/shared/lib/dates'
import { Caption, Text } from '~/components'
import { InsightTable, Td, Th } from '../insights/InsightTable'
import { formatBestSetPrimary, formatLoad, formatNumber, hasDisplayE1rm } from '../insight-format'

/**
 * Every movement, sorted by whatever column you asked for.
 *
 * A real table, not the CSS grid this used to be: the columns are comparable figures, and sortable
 * `<th>`s can carry `aria-sort` where a styled div cannot. Only lifts with a per-session series get
 * an `Open` link — the rest have no page to land on, and the old version styled them identically.
 */
export function MovementsTable({
  rows,
  totals,
  units,
  sort,
  onSortChange,
  trackedMovementIds,
}: {
  rows: HistoryMovementSummary[]
  /** Range-scoped figures per movement; absent means the movement had no work in range. */
  totals: Map<string, RangedMovementTotals>
  units?: Unit | null
  sort: { key: MovementSortKey; dir: SortDir }
  onSortChange: (sort: { key: MovementSortKey; dir: SortDir }) => void
  trackedMovementIds: Set<string>
}) {
  const toggle = (key: MovementSortKey) =>
    onSortChange(sort.key === key ? { key, dir: sort.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  const sortFor = (key: MovementSortKey) =>
    sort.key === key ? (sort.dir === 'asc' ? ('ascending' as const) : ('descending' as const)) : ('none' as const)

  return (
    <InsightTable minWidth="42rem">
      <thead>
        <tr>
          <Th>Movement</Th>
          <Th align="right" sort={sortFor('last')} onSort={() => toggle('last')}>Last</Th>
          <Th align="right" sort={sortFor('sets')} onSort={() => toggle('sets')}>Sets</Th>
          <Th align="right" sort={sortFor('volume')} onSort={() => toggle('volume')}>Volume</Th>
          <Th align="right" sort={sortFor('e1rm')} onSort={() => toggle('e1rm')}>Best set</Th>
          <Th align="right"><span className="sr-only">Open</span></Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((movement) => {
          const inRange = totals.get(movement.movementId)
          return (
            <tr key={movement.movementId} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
              <Td>
                <Text size="sm" fw={700} truncate>{movement.movementName}</Text>
                <Caption tt="capitalize" truncate>{movement.category.replaceAll('_', ' ')}</Caption>
              </Td>
              <Td align="right">
                {/* The real date, not the bucket's Monday — but only once the range contains work,
                    so the column never reports a session the rest of the row excludes. */}
                <Caption style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {inRange ? formatDayMonth(movement.lastPerformedAt) : '—'}
                </Caption>
              </Td>
              <Td align="right">
                <Text size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {inRange ? formatNumber(inRange.completedSets) : '—'}
                </Text>
              </Td>
              <Td align="right">
                <Text size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {inRange ? formatLoad(inRange.volume, units) : '—'}
                </Text>
              </Td>
              <Td align="right">
                {movement.bestSet ? (
                  <Text size="sm" truncate>
                    <Text component="span" size="sm" fw={600}>{formatBestSetPrimary(movement.bestSet)}</Text>
                    {hasDisplayE1rm(movement.bestSet) ? (
                      <Caption component="span" fw={700} tone="action"> · e1RM {formatNumber(movement.bestSet.e1rm)}</Caption>
                    ) : null}
                  </Text>
                ) : (
                  <Caption>—</Caption>
                )}
              </Td>
              <Td align="right">
                {trackedMovementIds.has(movement.movementId) ? (
                  <Link
                    to="/history/$movementId"
                    params={{ movementId: movement.movementId }}
                    aria-label={`Open ${movement.movementName}`}
                    className="inline-flex items-center gap-1"
                  >
                    <Caption fw={700} tone="action">Open</Caption>
                    <ArrowRight size={12} color="var(--vf-action-text)" />
                  </Link>
                ) : null}
              </Td>
            </tr>
          )
        })}
      </tbody>
    </InsightTable>
  )
}
