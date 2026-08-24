import { View } from 'react-native'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { Caption, Panel, SectionLabel, SegmentedControl } from '@/components'
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
      <SegmentedControl
        options={members.map((member) => ({
          value: member.id,
          label: member.variantShortLabel ?? `${member.daysPerWeek} days`,
          disabled: !member.available,
          testID: `program-variant-${member.id}`,
        }))}
        value={selectedTemplateId}
        onChange={onSelect}
        disabled={disabled}
        accessibilityLabel="Programme schedule"
      />
      {selected?.variantDescription ? <Caption tone="action">{selected.variantDescription}</Caption> : null}
    </Panel>
  )
}
