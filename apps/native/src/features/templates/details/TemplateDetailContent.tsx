import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { catalogueDurationLabel } from '@sheetless/domain/program/catalogue-browsing'
import { complexityRangeLabel, scheduleRangeLabel, type ProgramTemplateFamily } from '@sheetless/domain/program/template-families'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { TemplateDetailFacts } from './TemplateDetailFacts'
import { TemplatePrescriptionTable } from './TemplatePrescriptionTable'
import { TemplateWeekStructure } from './TemplateWeekStructure'

export function TemplateDetailContent({ template, family, members, setup, advanced, previewLoading,
  previewError, retrying, onRetry, onPreview }: {
  template: ProgramTemplateSummary; family?: ProgramTemplateFamily; members: ProgramTemplateSummary[]
  setup?: ProgramSetupOptions; advanced: boolean; previewLoading: boolean; previewError: string | null
  retrying: boolean; onRetry: () => void; onPreview: () => void
}) {
  const { theme } = useTokens()
  const [showPrescription, setShowPrescription] = useState(false)
  const schedules = members.length ? members : [template]
  const duration = catalogueDurationLabel(family && members.length ? { kind: 'family', family, members }
    : { kind: 'single', template: { ...template, durationWeeks: template.durationWeeks ?? setup?.previewWeeks.length } })
  const firstSession = setup?.previewWeeks[0]?.sessions[0]

  return <>
    <View style={{ gap: 3 }}>
      <SectionLabel tone="action">{template.sourceLabel}</SectionLabel>
      <Heading>{family?.name ?? template.name}</Heading>
      <Text size="sm" tone="dimmed" weight={700}>
        {[duration ? `Cycle: ${duration}` : 'Cycle length unavailable', scheduleRangeLabel(schedules), complexityRangeLabel(schedules)].join(' · ')}
      </Text>
    </View>

    {!advanced ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>Who it suits</SectionLabel>
      <Text size="sm">{family?.description ?? template.description}</Text>
      <Caption>{family?.tagline ?? template.variantDescription ?? `${template.complexity} training`}</Caption>
    </Panel> : null}

    {!template.available ? <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
      <Text weight={700}>This plan is unavailable</Text>
      <Caption>Choose another plan from the library.</Caption>
    </Panel> : previewError ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text weight={700}>Preview could not load</Text>
      <Caption>{previewError}</Caption>
      <Button label="Retry preview" loading={retrying} variant="default" fullWidth onPress={onRetry} />
    </Panel> : previewLoading ? <Panel style={{ padding: spacing.md }}>
      <Caption>Loading the programme structure…</Caption>
    </Panel> : setup ? <>
      <Caption>Example schedule: {template.variantLabel ?? template.name}. Choose your schedule during setup.</Caption>
      {advanced || showPrescription ? <TemplatePrescriptionTable weeks={setup.previewWeeks} /> : <TemplateWeekStructure weeks={setup.previewWeeks} />}
      {!advanced ? <Button label={showPrescription ? 'Show week overview' : 'Show prescriptions and progression'}
        variant="subtle" fullWidth onPress={() => setShowPrescription((value) => !value)} /> : null}
      {advanced || showPrescription ? <TemplateDetailFacts.Progression template={template} setup={setup} /> : null}
      {advanced ? <TemplateDetailFacts.Schedules schedules={schedules} currentId={template.id} /> : null}

      {firstSession ? <Pressable accessibilityRole="button" accessibilityLabel="Look at a session before you decide"
        onPress={onPreview} style={({ pressed }) => ({ borderColor: theme.border, borderWidth: 1, borderRadius: radii.md,
          backgroundColor: theme.surface2, padding: spacing.md, flexDirection: 'row', alignItems: 'center',
          gap: spacing.sm, minHeight: 58, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text size="sm" weight={800}>Look at a session before you decide</Text>
          <Caption>Week 1, day 1 · with your suggested starting weights</Caption>
        </View>
        <ChevronRight size={18} color={theme.tones.action.text} />
      </Pressable> : <Caption>No session preview is available for this plan.</Caption>}
      {!advanced ? <TemplateDetailFacts.Schedules schedules={schedules} currentId={template.id} /> : null}
      <TemplateDetailFacts.Equipment setup={setup} />
    </> : null}
    {template.available ? <Caption>Setting this up does not start it. You will choose your schedule and starting weights first.</Caption> : null}
  </>
}
