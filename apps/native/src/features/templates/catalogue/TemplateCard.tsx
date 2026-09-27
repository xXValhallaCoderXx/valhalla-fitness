import { Pressable, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { complexityRangeLabel, scheduleRangeLabel, type CatalogueItem } from '@sheetless/domain/program/template-families'
import { catalogueDurationLabel, catalogueEntryTemplate, type CatalogueBrowseFilters } from '@sheetless/domain/program/catalogue-browsing'
import { Caption, Heading, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function TemplateCard({ item, filters, onOpen }: {
  item: CatalogueItem
  filters: CatalogueBrowseFilters
  onOpen: (templateId: string) => void
}) {
  const { theme } = useTokens()
  const family = item.kind === 'family'
  const template = catalogueEntryTemplate(item, filters)
  const title = family ? item.family.name : item.template.name
  const description = family ? item.family.tagline ?? item.family.description : item.template.description
  const level = family ? complexityRangeLabel(item.members) : item.template.complexity
  const schedule = family ? scheduleRangeLabel(item.members) : `${item.template.daysPerWeek} days a week`
  const duration = catalogueDurationLabel(item)
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${title}`}
    accessibilityState={{ disabled: !template }} disabled={!template} onPress={() => template && onOpen(template.id)}
    style={({ pressed }) => ({ backgroundColor: theme.surface, borderRadius: radii.lg,
      padding: spacing.md, gap: spacing.sm, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
      <Text size="xs" weight={800} tone="action">{level}</Text>
      <Heading order={3}>{title}</Heading>
      <Text size="sm" tone="dimmed">{description}</Text>
      <Caption>{[duration ? `${duration} per cycle` : null, schedule].filter(Boolean).join(' · ')}</Caption>
      {!template ? <Caption>Currently unavailable</Caption> : null}
    </View>
    <ChevronRight size={18} color={theme.textMuted} />
  </Pressable>
}
