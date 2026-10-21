import { useState } from 'react'
import { View } from 'react-native'
import { catalogueFacetCounts, browseCatalogueItems, type CatalogueBrowseFilters } from '@sheetless/domain/program/catalogue-browsing'
import { CATALOGUE_GOAL_FILTERS } from '@sheetless/domain/program/catalogue-filters'
import type { CatalogueItem } from '@sheetless/domain/program/template-families'
import { Button, Caption, SegmentedControl, SheetModal } from '@/components'
import { spacing } from '@/lib/tokens'

const levels = { All: 'Any', Beginner: 'New to lifting', Intermediate: 'Some experience', Advanced: 'Years in' }
const goals = { all: 'Any', simple: 'Keep it simple', strength: 'Get stronger', muscle: 'Build size' }

/** Mount on opening: closing cancels the draft; Apply commits it once. */
export function TemplateFilterSheet({ items, filters, onApply, onClose }: {
  items: CatalogueItem[]
  filters: CatalogueBrowseFilters
  onApply: (filters: CatalogueBrowseFilters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(filters)
  const counts = catalogueFacetCounts(items, draft)
  const matches = browseCatalogueItems(items, draft).length
  return <SheetModal open title="Narrow it down" onClose={onClose} footer={
    <Button fullWidth label={`Show ${matches} ${matches === 1 ? 'plan' : 'plans'}`} onPress={() => onApply(draft)} />
  }>
    <View style={{ alignItems: 'flex-end' }}><Button label="Clear" variant="subtle"
      onPress={() => setDraft({ ...draft, days: 'all', level: 'All', goal: 'all' })} /></View>
    <SegmentedControl label="How many days a week" accessibilityLabel="Days per week" accessibilityRole="radiogroup"
      options={counts.days.map(({ value, count }) => ({ value: String(value), label: `${value === 'all' ? 'Any' : value} · ${count}` }))}
      value={String(draft.days)} onChange={value => setDraft({ ...draft, days: value === 'all' ? 'all' : Number(value) })} />
    <SegmentedControl label="Where you are" accessibilityLabel="Programme level" accessibilityRole="radiogroup"
      options={counts.level.map(({ value, count }) => ({ value, label: `${levels[value]} · ${count}` }))}
      value={draft.level} onChange={level => setDraft({ ...draft, level })} />
    <SegmentedControl label="What you want" accessibilityLabel="Training goal" accessibilityRole="radiogroup"
      options={CATALOGUE_GOAL_FILTERS.map(({ value }) => ({ value, label: `${goals[value]} · ${counts.goal.find(option => option.value === value)?.count ?? 0}` }))}
      value={draft.goal} onChange={goal => setDraft({ ...draft, goal })} />
    <Caption style={{ marginTop: spacing.xs }}>Counts show matching plan families and custom plans.</Caption>
  </SheetModal>
}
