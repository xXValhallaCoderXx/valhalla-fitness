import { Link } from '@tanstack/react-router'
import { TextInput } from '@mantine/core'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '~/shared/lib/cn'
import { formatCompactDate } from '~/shared/lib/dates'
import {
  filterMovements,
  movementCategories,
  sortMovementSummaries,
  type MovementSortKey,
  type SortDir,
} from '~/domains/history/lib/insights'
import type { HistoryDashboardWithInsights, HistoryMovementSummary } from '~/domains/history'
import type { Unit } from '~/shared/types'
import { Caption, EmptyState, Panel, SectionLabel, Text } from '~/components'
import {
  FilterChip,
  formatBestSetPrimary,
  formatLoad,
  formatNumber,
  hasDisplayE1rm,
  historySearchInputStyles,
} from '../insight-format'

const movementGridColumns =
  'grid grid-cols-[minmax(0,1fr)_4.5rem_3rem] items-center gap-3 md:grid-cols-[minmax(0,1.6fr)_5.5rem_6.5rem_minmax(0,1.4fr)_3.5rem]'

export function MovementsTab({
  data,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: {
  data: HistoryDashboardWithInsights
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

  // A row is navigable only when the lift actually has a per-session series behind it.
  const trackedMovementIds = useMemo(
    () => new Set(data.insights.liftSeries.map((series) => series.movementId)),
    [data.insights.liftSeries],
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
            <MovementRow
              key={movement.movementId}
              movement={movement}
              units={data.overview.units}
              // Only the lifts with a per-session series have a page to open; the rest would land
              // on an empty one.
              hasDetail={trackedMovementIds.has(movement.movementId)}
            />
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

function MovementRow({
  movement,
  units,
  hasDetail,
}: {
  movement: HistoryMovementSummary
  units?: Unit | null
  hasDetail: boolean
}) {
  const className = cn(movementGridColumns, 'border-t px-5 py-3')
  const style = { borderColor: 'var(--mantine-color-default-border)' }
  const content = <MovementRowCells movement={movement} units={units} />

  if (!hasDetail) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    )
  }

  return (
    <Link
      to="/history/$movementId"
      params={{ movementId: movement.movementId }}
      className={cn(className, 'vf-card-hover')}
      style={style}
    >
      {content}
    </Link>
  )
}

function MovementRowCells({ movement, units }: { movement: HistoryMovementSummary; units?: Unit | null }) {
  return (
    <>
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
            {hasDisplayE1rm(movement.bestSet) ? (
              <Text component="span" size="xs" fw={700} tone="action"> · e1RM {formatNumber(movement.bestSet.e1rm)}</Text>
            ) : null}
          </Text>
        ) : (
          <Caption>—</Caption>
        )}
      </div>
      <Text size="sm" fw={700} ta="right">{movement.totalCompletedSets}</Text>
    </>
  )
}

