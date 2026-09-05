import { View } from 'react-native'
import { Search } from 'lucide-react-native'
import {
  CATALOGUE_GOAL_FILTERS,
  CATALOGUE_LEVEL_FILTERS,
  type CatalogueFilterState,
} from '@sheetless/domain/program/catalogue-filters'
import { Panel, SegmentedControl, TextInput } from '@/components'
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
      <SegmentedControl
        label="Level"
        options={CATALOGUE_LEVEL_FILTERS.map((level) => ({
          value: level,
          label: level,
          testID: `program-level-${level.toLowerCase()}`,
        }))}
        value={filters.level}
        onChange={(level) => onChange({ ...filters, level })}
        accessibilityLabel="Programme level filter"
      />
      <SegmentedControl
        label="Goal"
        options={CATALOGUE_GOAL_FILTERS.map((goal) => ({
          value: goal.value,
          label: goal.label,
          testID: `program-goal-${goal.value}`,
        }))}
        value={filters.goal}
        onChange={(goal) => onChange({ ...filters, goal })}
        accessibilityLabel="Programme goal filter"
      />
    </Panel>
  )
}
