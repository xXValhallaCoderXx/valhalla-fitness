import { View } from 'react-native'
import { previewEquipment, previewProgressionNotes } from '@sheetless/domain/program/template-preview-presentation'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

function Progression({ template, setup }: { template: ProgramTemplateSummary; setup: ProgramSetupOptions }) {
  const notes = previewProgressionNotes(setup.previewWeeks)
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>How it progresses</SectionLabel>
    <Text size="sm" weight={700}>{template.progressionLabel}</Text>
    {notes.map((note) => <Text key={note} size="sm">{note}</Text>)}
    {!notes.length ? <Caption>Detailed progression guidance is unavailable for this plan.</Caption> : null}
  </Panel>
}

function Schedules({ schedules, currentId }: { schedules: ProgramTemplateSummary[]; currentId: string }) {
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>{schedules.length === 1 ? 'The schedule' : 'The schedules'}</SectionLabel>
    {schedules.map((schedule) => <View key={schedule.id} style={{ gap: 3 }}>
      <Text size="sm" weight={700}>{schedule.variantLabel ?? `${schedule.daysPerWeek} days a week`}
        {schedule.id === currentId ? ' · shown here' : ''}{!schedule.available ? ' · unavailable' : ''}</Text>
      <Caption>{schedule.variantDescription ?? schedule.description}</Caption>
    </View>)}
  </Panel>
}

function Equipment({ setup }: { setup: ProgramSetupOptions }) {
  const equipment = previewEquipment(setup.previewWeeks)
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>What you need</SectionLabel>
    {equipment.labels.length ? <Text size="sm">{equipment.labels.join(' · ')}</Text> : null}
    {equipment.complete && !equipment.labels.length ? <Caption>No equipment is specified by this plan.</Caption> : null}
    {!equipment.complete ? <Caption>Some equipment details are unavailable.</Caption> : null}
    {setup.freeWeightPolicy ? <Caption>You can review free-weight alternatives during setup.</Caption> : null}
  </Panel>
}

export const TemplateDetailFacts = { Progression, Schedules, Equipment }
