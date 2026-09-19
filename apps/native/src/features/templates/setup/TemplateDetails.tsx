import { View } from 'react-native'
import { useState } from 'react'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import type { TemplatePhase } from '@sheetless/domain/program/template-start-phases'
import { Badge, Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { useExperienceMode } from '@/lib/experience-mode'

export function TemplateFacts({
  template,
  setup,
  phases,
}: {
  template: ProgramTemplateSummary
  setup: ProgramSetupOptions
  phases: TemplatePhase[]
}) {
  const [expanded, setExpanded] = useState(false)
  const { isFull } = useExperienceMode()
  return (
    <>
      <Caption>{setup.previewWeeks.length} weeks · {template.daysPerWeek} days/week · {template.complexity}</Caption>
      {isFull ? <Caption>{template.progressionLabel}</Caption> : null}
      <Button label={expanded ? 'Hide programme details' : 'About this programme'} variant="subtle" onPress={() => setExpanded(!expanded)} />
      {expanded ? <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>{phases.length > 1 ? 'Training phases' : 'Programme structure'}</SectionLabel>
        {phases.map((phase) => (
          <View key={phase.phaseKey} style={{ gap: 4, paddingVertical: spacing.sm }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <Text size="sm" weight={800}>{phase.phaseLabel}</Text>
              <Badge>{phase.weekRange}</Badge>
            </View>
            <Caption>{phase.representativeWeek.summary}</Caption>
          </View>
        ))}
      </Panel> : null}
    </>
  )
}

export function PreviewWeek({ week }: { week: ProgramSetupOptions['previewWeeks'][number] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ gap: 3 }}>
        <Heading order={2}>{week.label} · {week.phaseLabel}</Heading>
        <Caption>{week.subtitle}</Caption>
        <Text size="sm" tone="dimmed">{week.summary}</Text>
      </View>
      {week.sessions.map((session) => (
        <Panel key={session.id} style={{ gap: spacing.sm, padding: spacing.md }}>
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Badge>{session.label}</Badge>
                <Text size="sm" weight={800}>{session.title}</Text>
              </View>
              <Caption>{session.movementSummary}</Caption>
            </View>
            <Caption>{session.estimatedMinutes} min</Caption>
          </View>
          <Panel surface="inset" style={{ gap: 2, padding: spacing.xs }}>
            <Caption>KEY WORK</Caption>
            <Text size="sm" weight={700}>{session.keyPrescription}</Text>
          </Panel>
          {session.movements.map((movement) => (
            <View key={`${movement.slotId}-${movement.phaseKey}`} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" weight={700} numberOfLines={1}>{movement.defaultMovementName}</Text>
                <Caption>{movement.roleLabel}</Caption>
              </View>
              <Text size="xs" tone="dimmed" align="right" style={{ maxWidth: '48%' }}>
                {movement.targetSummary}
              </Text>
            </View>
          ))}
        </Panel>
      ))}
    </View>
  )
}
