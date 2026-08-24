import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { HistoryMovementSummary } from '@sheetless/domain/history/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatNumber, formatWeight } from '@sheetless/domain/shared/set-notation'
import { Caption, EmptyState, Panel, SectionLabel, SegmentedControl, Text, TextInput } from '@/components'
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
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<HistoryMovementSummary | null>(null)
  const categories = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.category))).sort(),
    [movements],
  )
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase()
    return movements.filter((movement) =>
      (!category || movement.category === category) &&
      (!search || movement.movementName.toLowerCase().includes(search)),
    )
  }, [movements, query, category])

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Movements · recent training</SectionLabel>
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
      {visible.length === 0 ? (
        <EmptyState title="No matching movements">Try another search or category.</EmptyState>
      ) : visible.map((movement) => (
        <Pressable key={movement.movementId} onPress={() => setSelected(movement)}>
          {({ pressed }) => (
            <Panel style={{ opacity: pressed ? 0.7 : 1, padding: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" weight={800} numberOfLines={1}>{movement.movementName}</Text>
                  <Caption>{movement.category.replaceAll('_', ' ')} · {formatCompactDate(movement.lastPerformedAt)}</Caption>
                  {movement.bestSet ? (
                    <Caption>
                      Best {movement.bestSet.load == null ? 'bodyweight' : formatWeight(movement.bestSet.load, units)} × {movement.bestSet.reps ?? '—'}
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
