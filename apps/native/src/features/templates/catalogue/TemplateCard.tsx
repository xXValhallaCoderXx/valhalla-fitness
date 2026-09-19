import { View } from 'react-native'
import {
  complexityRangeLabel,
  lowestComplexity,
  scheduleRangeLabel,
  type CatalogueItem,
} from '@sheetless/domain/program/template-families'
import { Badge, Button, Caption, Heading, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { useExperienceMode } from '@/lib/experience-mode'

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
  const { isFull } = useExperienceMode()
  const isFamily = item.kind === 'family'
  const template = isFamily
    ? item.members.find((member) => member.available) ?? item.members[0]
    : item.template
  const title = isFamily ? item.family.name : template.name
  const description = isFamily ? item.family.tagline ?? item.family.description : template.description
  const complexity = isFamily ? complexityRangeLabel(item.members) : template.complexity
  const accent = complexityTone(isFamily ? lowestComplexity(item.members) : template.complexity)
  const schedule = isFamily ? scheduleRangeLabel(item.members) : `${template.daysPerWeek} days/wk`

  return (
    <Panel style={{ gap: spacing.md, padding: spacing.lg }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {template.origin === 'user_created' ? <Badge tone="accent">Your programme</Badge> : null}
        <Caption>{schedule}</Caption>
        <Text size="sm" tone={accent}>{complexity}</Text>
      </View>
      <View style={{ gap: 4 }}>
        <Heading order={3}>{title}</Heading>
        <Text size="sm" tone="dimmed">{description}</Text>
      </View>
      {isFull ? <Caption>{template.progressionLabel}</Caption> : null}
      {isFamily ? <Caption tone="action">Choose your schedule · {item.members.length} options</Caption> : null}
      <Button
        label={template.available ? 'View programme' : 'Not yet available'}
        fullWidth
        variant="default"
        disabled={!template.available}
        onPress={() => onOpen(template.id)}
      />
    </Panel>
  )
}
