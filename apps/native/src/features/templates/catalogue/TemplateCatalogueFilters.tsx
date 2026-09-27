import { View } from 'react-native'
import { Search, SlidersHorizontal } from 'lucide-react-native'
import type { CatalogueBrowseFilters } from '@sheetless/domain/program/catalogue-browsing'
import { Button, TextInput } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TemplateCatalogueFilters({ filters, onChange, onOpen }: {
  filters: CatalogueBrowseFilters
  onChange: (filters: CatalogueBrowseFilters) => void
  onOpen: () => void
}) {
  const { theme } = useTokens()
  const count = Number(filters.days !== 'all') + Number(filters.level !== 'All') + Number(filters.goal !== 'all')
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
    <View style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: spacing.sm, top: 0, bottom: 0,
        justifyContent: 'center', zIndex: 1 }}><Search color={theme.textMuted} size={18} /></View>
      <TextInput value={filters.query} onChangeText={query => onChange({ ...filters, query })}
        placeholder="Search plans" accessibilityLabel="Search plans"
        inputStyle={{ minHeight: 48, paddingLeft: 38 }} testID="program-catalogue-search" />
    </View>
    <Button label={`Filter${count ? ` · ${count}` : ''}`} variant="default" onPress={onOpen}
      accessibilityLabel={`Filter plans${count ? `, ${count} active ${count === 1 ? 'filter' : 'filters'}` : ''}`}
      leftSection={<SlidersHorizontal size={17} color={theme.tones.action.text} />} />
  </View>
}
