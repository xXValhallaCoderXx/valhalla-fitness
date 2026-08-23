import { View } from 'react-native'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import type { TemplatePhase } from '@sheetless/domain/program/template-start-phases'
import { Badge, Caption, Heading, Panel, SectionLabel, StatCard, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function TemplateFacts({
  template,
  setup,
  phases,
}: {
  template: ProgramTemplateSummary
  setup: ProgramSetupOptions
  phases: TemplatePhase[]
}) {
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <StatCard label="Cycle" value={`${setup.previewWeeks.length} weeks`} />
        <StatCard label="Schedule" value={`${template.daysPerWeek} days/wk`} />
        <StatCard label="Level" value={template.complexity} />
        <StatCard label="Progression" value={template.progressionLabel} />
      </View>
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>{phases.length > 1 ? 'Training phases' : 'Programme structure'}</SectionLabel>
        {phases.map((phase) => (
          <Panel key={phase.phaseKey} surface="inset" style={{ gap: 4, padding: spacing.sm }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <Text size="sm" weight={800}>{phase.phaseLabel}</Text>
              <Badge>{phase.weekRange}</Badge>
            </View>
            <Caption>{phase.representativeWeek.summary}</Caption>
          </Panel>
        ))}
      </Panel>
      <Panel surface="inset" style={{ gap: spacing.xs, padding: spacing.sm }}>
        <SectionLabel>Setup</SectionLabel>
        <Caption>
          {template.requiredState.length
            ? `${template.requiredState.length} starting strength ${template.requiredState.length === 1 ? 'value' : 'values'} required.`
            : 'No starting strength values required.'}
        </Caption>
        <Caption>Enter the required values below to start with the programme defaults.</Caption>
      </Panel>
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
