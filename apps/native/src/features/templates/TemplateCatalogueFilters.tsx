import { ScrollView, View } from 'react-native'
import { Search } from 'lucide-react-native'
import {
  CATALOGUE_GOAL_FILTERS,
  CATALOGUE_LEVEL_FILTERS,
  type CatalogueFilterState,
} from '@sheetless/domain/program/catalogue-filters'
import { Button, Panel, SectionLabel, TextInput } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TemplateCatalogueFilters({
  filters,
  onChange,
}: {
  filters: CatalogueFilterState
  onChange: (filters: CatalogueFilterState) => void
}) {
  const { theme } = useTokens()

  return (
    <Panel surface="inset" style={{ gap: spacing.md, padding: spacing.sm }}>
      <View style={{ position: 'relative' }}>
        <View
          pointerEvents="none"
          style={{
            alignItems: 'center',
            bottom: 0,
            justifyContent: 'center',
            left: spacing.sm,
            position: 'absolute',
            top: 0,
            zIndex: 1,
          }}
        >
          <Search color={theme.textMuted} size={18} />
        </View>
        <TextInput
          value={filters.query}
          onChangeText={(query) => onChange({ ...filters, query })}
          placeholder="Search programs"
          accessibilityLabel="Search programs"
          inputStyle={{ minHeight: 44, paddingLeft: 38 }}
          testID="program-catalogue-search"
        />
      </View>
      <FilterRow label="Level">
        {CATALOGUE_LEVEL_FILTERS.map((level) => (
          <Button
            key={level}
            label={level}
            variant={filters.level === level ? 'filled' : 'default'}
            selected={filters.level === level}
            style={{ minHeight: 44, paddingHorizontal: spacing.md }}
            onPress={() => onChange({ ...filters, level })}
            testID={`program-level-${level.toLowerCase()}`}
          />
        ))}
      </FilterRow>
      <FilterRow label="Goal">
        {CATALOGUE_GOAL_FILTERS.map((goal) => (
          <Button
            key={goal.value}
            label={goal.label}
            variant={filters.goal === goal.value ? 'filled' : 'default'}
            selected={filters.goal === goal.value}
            style={{ minHeight: 44, paddingHorizontal: spacing.md }}
            onPress={() => onChange({ ...filters, goal: goal.value })}
            testID={`program-goal-${goal.value}`}
          />
        ))}
      </FilterRow>
    </Panel>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <SectionLabel>{label}</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {children}
      </ScrollView>
    </View>
  )
}
