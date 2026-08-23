import { View } from 'react-native'
import {
  complexityRangeLabel,
  lowestComplexity,
  scheduleRangeLabel,
  type CatalogueItem,
} from '@sheetless/domain/program/template-families'
import { Badge, Button, Caption, Heading, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

function complexityTone(complexity: string): 'success' | 'warning' | 'action' {
  if (complexity === 'Beginner') return 'success'
  if (complexity === 'Advanced') return 'warning'
  return 'action'
}

export function TemplateCard({
  item,
  onOpen,
}: {
  item: CatalogueItem
  onOpen: (templateId: string) => void
}) {
  const { theme } = useTokens()
  const isFamily = item.kind === 'family'
  const template = isFamily ? item.members[0] : item.template
  const title = isFamily ? item.family.name : template.name
  const description = isFamily ? item.family.tagline ?? item.family.description : template.description
  const complexity = isFamily ? complexityRangeLabel(item.members) : template.complexity
  const accent = complexityTone(isFamily ? lowestComplexity(item.members) : template.complexity)
  const schedule = isFamily ? scheduleRangeLabel(item.members) : `${template.daysPerWeek} days/wk`

  return (
    <Panel style={{ borderTopColor: theme.tones[accent].text, borderTopWidth: 3, gap: spacing.sm, padding: spacing.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Badge tone={template.origin === 'user_created' ? 'accent' : 'neutral'}>{template.sourceLabel}</Badge>
        <Caption>{schedule}</Caption>
      </View>
      <View style={{ gap: 4 }}>
        <Heading order={3}>{title}</Heading>
        <Text size="sm" tone="dimmed">{description}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Panel surface="inset" style={{ flex: 1, gap: 2, padding: spacing.xs }}>
          <Caption>LEVEL</Caption>
          <Text size="xs" tone={accent} weight={800}>{complexity}</Text>
        </Panel>
        <Panel surface="inset" style={{ flex: 1, gap: 2, padding: spacing.xs }}>
          <Caption>PROGRESSION</Caption>
          <Text size="xs" weight={800} numberOfLines={1}>
            {isFamily ? `${item.members.length} variants` : template.progressionLabel}
          </Text>
        </Panel>
      </View>
      {isFamily ? <Caption tone="action">Choose your schedule · {item.members.length} options</Caption> : null}
      <Button
        label={template.available ? 'View programme' : 'Not yet available'}
        fullWidth
        disabled={!template.available}
        onPress={() => onOpen(template.id)}
      />
    </Panel>
  )
}
