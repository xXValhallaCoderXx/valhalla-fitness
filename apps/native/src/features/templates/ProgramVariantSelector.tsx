import { ScrollView, View } from 'react-native'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { Button, Caption, Panel, SectionLabel } from '@/components'
import { spacing } from '@/lib/tokens'

export function ProgramVariantSelector({
  members,
  selectedTemplateId,
  disabled = false,
  onSelect,
}: {
  members: ProgramTemplateSummary[]
  selectedTemplateId: string
  disabled?: boolean
  onSelect: (templateId: string) => void
}) {
  if (members.length <= 1) return null

  const selected = members.find((member) => member.id === selectedTemplateId) ?? members[0]

  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ gap: 3 }}>
        <SectionLabel>Choose your schedule</SectionLabel>
        <Caption>Every schedule is a complete programme with its own sessions and progression.</Caption>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {members.map((member) => (
          <Button
            key={member.id}
            label={member.variantShortLabel ?? `${member.daysPerWeek} days`}
            variant={member.id === selectedTemplateId ? 'filled' : 'default'}
            disabled={disabled || !member.available}
            onPress={() => onSelect(member.id)}
            testID={`program-variant-${member.id}`}
          />
        ))}
      </ScrollView>
      {selected?.variantDescription ? <Caption tone="action">{selected.variantDescription}</Caption> : null}
    </Panel>
  )
}
