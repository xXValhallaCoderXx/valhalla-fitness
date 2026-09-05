import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native'
import { Search } from 'lucide-react-native'
import { formatCategoryLabel } from '@sheetless/domain/session/live-session-utils'
import { Button, Panel, SectionLabel, Text, TextInput } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { MovementPickerCategoryChip, MovementPickerOptionRow } from './MovementPickerRows'

export type MovementPickerOption = {
  movementId: string
  movementName: string
  category: string
  equipment: string[]
  defaultUnit?: string
  relationshipLabel?: string
  source?: 'rule' | 'catalog' | 'default'
}

export interface MovementPickerProps<TOption extends MovementPickerOption = MovementPickerOption> {
  options: readonly TOption[]
  selectedMovementId: string | null
  onSelectMovement: (movementId: string | null) => void
  isPending?: boolean
  error?: string | null
  onRetry?: () => void
  disabled?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  maxListHeight?: number
  header?: React.ReactNode
  footer?: React.ReactNode
}

/** Searchable, category-filtered virtualized movement list used by all workout sheets. */
export function MovementPicker<TOption extends MovementPickerOption>({
  options,
  selectedMovementId,
  onSelectMovement,
  isPending = false,
  error,
  onRetry,
  disabled = false,
  searchPlaceholder = 'Search movements',
  emptyMessage = 'No matching movements found.',
  maxListHeight = 340,
  header,
  footer,
}: MovementPickerProps<TOption>) {
  const { theme } = useTokens()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const categories = useMemo(() => buildCategories(options), [options])
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return options.filter((option) => {
      if (category !== 'all' && option.category !== category) return false
      if (!query) return true
      return (
        option.movementName.toLowerCase().includes(query) ||
        option.category.toLowerCase().includes(query) ||
        option.equipment.some((item) => item.toLowerCase().includes(query))
      )
    })
  }, [category, options, search])
  const filtersActive = Boolean(search.trim() || category !== 'all')

  useEffect(() => {
    if (selectedMovementId && !filteredOptions.some((option) => option.movementId === selectedMovementId)) {
      onSelectMovement(null)
    }
  }, [filteredOptions, onSelectMovement, selectedMovementId])

  return (
    <FlatList
      data={isPending || error ? [] : filteredOptions}
      keyExtractor={(item) => item.movementId}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      style={{ flexShrink: 1, maxHeight: maxListHeight }}
      contentContainerStyle={{ gap: spacing.xs }}
      ListHeaderComponent={(
        <View style={{ gap: spacing.sm, marginBottom: spacing.xs }}>
          {header}
          <View style={{ position: 'relative' }}>
            <Search
              color={theme.textMuted}
              pointerEvents="none"
              size={17}
              style={{ left: 12, position: 'absolute', top: 13, zIndex: 1 }}
            />
            <TextInput
              accessibilityLabel={searchPlaceholder}
              value={search}
              onChangeText={setSearch}
              placeholder={searchPlaceholder}
              editable={!disabled}
              inputStyle={{ minHeight: 44, paddingLeft: 37 }}
              testID="movement-picker-search"
            />
          </View>

          {categories.length ? (
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: 1 }}
            >
              <MovementPickerCategoryChip
                label="All"
                count={options.length}
                selected={category === 'all'}
                disabled={disabled}
                onPress={() => setCategory('all')}
              />
              {categories.map((item) => (
                <MovementPickerCategoryChip
                  key={item.value}
                  label={item.label}
                  count={item.count}
                  selected={category === item.value}
                  disabled={disabled}
                  onPress={() => setCategory(item.value)}
                />
              ))}
            </ScrollView>
          ) : null}

          <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
            <SectionLabel>
              {filteredOptions.length} movement{filteredOptions.length === 1 ? '' : 's'}
            </SectionLabel>
            {filtersActive ? (
              <Button
                label="Clear filters"
                variant="subtle"
                disabled={disabled}
                style={{ minHeight: 44, paddingHorizontal: spacing.xs }}
                onPress={() => {
                  setSearch('')
                  setCategory('all')
                }}
              />
            ) : null}
          </View>
        </View>
      )}
      ListEmptyComponent={
        isPending ? (
          <Panel surface="inset" style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}>
            <ActivityIndicator color={theme.primaryFill} />
            <Text size="sm" tone="dimmed">Loading movements…</Text>
          </Panel>
        ) : error ? (
          <Panel
            surface="inset"
            style={{
              backgroundColor: theme.tones.danger.soft,
              borderColor: theme.tones.danger.border,
              gap: spacing.sm,
              padding: spacing.md,
            }}
          >
            <Text size="sm" tone="danger">{error}</Text>
            {onRetry ? <Button label="Retry" variant="default" style={{ minHeight: 44 }} onPress={onRetry} /> : null}
          </Panel>
        ) : (
          <Panel surface="inset" style={{ padding: spacing.lg }}>
            <Text size="sm" tone="dimmed" align="center">{emptyMessage}</Text>
          </Panel>
        )
      }
      ListFooterComponent={footer ? <View style={{ marginTop: spacing.sm }}>{footer}</View> : null}
      renderItem={({ item }) => (
        <MovementPickerOptionRow
          option={item}
          selected={item.movementId === selectedMovementId}
          disabled={disabled}
          onPress={() => onSelectMovement(item.movementId)}
        />
      )}
    />
  )
}

function buildCategories(options: readonly MovementPickerOption[]) {
  const counts = new Map<string, number>()
  for (const option of options) counts.set(option.category, (counts.get(option.category) ?? 0) + 1)
  return Array.from(counts, ([value, count]) => ({ value, count, label: formatCategoryLabel(value) }))
    .sort((left, right) => left.label.localeCompare(right.label))
}
