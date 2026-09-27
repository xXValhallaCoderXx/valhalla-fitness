import { filterMovements, sortMovementSummaries, type MovementSortKey, type SortDir } from '@sheetless/domain/history/insights'
import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { HistoryMovementSummary } from '@sheetless/domain/history/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatNumber, formatWeight } from '@sheetless/domain/shared/set-notation'
import { Caption, EmptyState, Panel, SectionLabel, SegmentedControl, Text, TextInput } from '@/components'
import { useInsightsState } from '../navigation/InsightsState'
import { MovementHistorySheet } from './MovementHistorySheet'
import { spacing } from '@/lib/tokens'

/** Sentinel for the unfiltered option; category state itself stays nullable. */
const ALL_CATEGORIES = '__all'

export function InsightsMovements({
  movements,
  units,
  user,
}: {
  movements: HistoryMovementSummary[]
  units?: Unit | null
  user: User
}) {
  const { state, update } = useInsightsState()
  const { query, sort, direction, category } = state.movements
  const setQuery = (query: string) => update({ movements: { ...state.movements, query } })
  const setSort = (sort: MovementSortKey) => update({ movements: { ...state.movements, sort } })
  const setDirection = (direction: SortDir) => update({ movements: { ...state.movements, direction } })
  const setCategory = (category: string | null) => update({ movements: { ...state.movements, category } })
  const [selected, setSelected] = useState<HistoryMovementSummary | null>(null)
  const categories = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.category))).sort(),
    [movements],
  )
  const visible = sortMovementSummaries(filterMovements(movements, query, category), sort, direction)

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Every movement · loaded history</SectionLabel>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search movements" />
      <SegmentedControl
        options={[
          { value: ALL_CATEGORIES, label: 'All' },
          ...categories.map((value) => ({ value, label: value.replaceAll('_', ' ') })),
        ]}
        value={category ?? ALL_CATEGORIES}
        onChange={(next) => setCategory(next === ALL_CATEGORIES ? null : next)}
        accessibilityLabel="Movement category filter"
      />
      <SegmentedControl options={[{ value: 'last', label: 'Last performed' }, { value: 'volume', label: 'Volume' },
        { value: 'e1rm', label: 'Estimated max (loaded)' }, { value: 'sets', label: 'Sets' }]} value={sort} onChange={setSort} accessibilityLabel="Sort movements" />
      <SegmentedControl options={[{ value: 'desc', label: sort === 'last' ? 'Newest first' : 'Highest first' }, { value: 'asc', label: sort === 'last' ? 'Oldest first' : 'Lowest first' }]}
        value={direction} onChange={setDirection} variant="segments" accessibilityLabel="Sort direction" />
      <Caption>{visible.length} of {movements.length} movements. Best sets rank by estimated strength for loaded sets and reps for bodyweight. Unusual estimates are excluded.</Caption>
      {visible.length === 0 ? (
        <EmptyState title="No matching movements">Try another search or category.</EmptyState>
      ) : visible.map((movement) => (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${movement.movementName}`} key={movement.movementId} onPress={() => setSelected(movement)}>
          {({ pressed }) => (
            <Panel style={{ opacity: pressed ? 0.7 : 1, padding: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" weight={800} numberOfLines={1}>{movement.movementName}</Text>
                  <Caption>{movement.category.replaceAll('_', ' ')} · {formatCompactDate(movement.lastPerformedAt)}</Caption>
                  {movement.bestSet ? (
                    <Caption>
                      Best {movement.bestSet.load == null ? 'bodyweight' : formatWeight(movement.bestSet.load, movement.bestSet.units)} × {movement.bestSet.reps ?? '—'} · {movement.bestSet.performedAt}{movement.bestSet.isBaseline ? ' · Baseline' : ''}
                    </Caption>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text size="sm" weight={800}>{formatNumber(movement.totalVolume)} {units}</Text>
                  <Caption>{movement.totalCompletedSets} sets</Caption>
                </View>
              </View>
            </Panel>
          )}
        </Pressable>
      ))}
      {selected ? (
        <MovementHistorySheet
          open
          movementId={selected.movementId}
          movementName={selected.movementName}
          user={user}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </View>
  )
}
