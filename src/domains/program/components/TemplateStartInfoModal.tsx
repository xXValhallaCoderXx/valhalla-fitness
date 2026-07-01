import { Badge, Modal } from '@mantine/core'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { weekOptionHeading, type WeekPreviewOption } from '~/domains/program/lib/template-start-utils'
import type { TemplatePhase } from '~/domains/program/lib/template-start-phases'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '~/shared/types'
import { StartInfoMetric } from './TemplateStartMetric'

const REGULATES = [
  { title: 'Main lifts auto-progress', body: 'Sheetless adjusts your main-lift loads from your logged sets and effort.' },
  {
    title: 'Variations & accessories are planned',
    body: 'These follow the programme’s prescriptions — swap them for related movements any time.',
  },
  { title: 'Swaps apply from week 1', body: 'A variation or accessory swap you choose is used throughout the programme.' },
]

export function ProgrammeInfoModal({
  opened,
  template,
  setupOptions,
  phases,
  weekOptions,
  onClose,
}: {
  opened: boolean
  template: ProgramTemplateSummary
  setupOptions: ProgramSetupOptions
  phases: TemplatePhase[]
  weekOptions: WeekPreviewOption[]
  onClose: () => void
}) {
  const phased = phases.length > 1

  return (
    <Modal opened={opened} onClose={onClose} title={`How ${template.name} works`} size="xl">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <StartInfoMetric label="Cycle" value={`${setupOptions.previewWeeks.length} weeks`} />
          <StartInfoMetric label="Schedule" value={`${template.daysPerWeek} days/wk`} />
          <StartInfoMetric label="Progression" value={template.progressionLabel} />
        </div>

        <div>
          <SectionLabel>{phased ? 'Block patterns' : 'Programme structure'}</SectionLabel>
          <div className="mt-2 grid gap-2">
            {phased
              ? phases.map((phase, index) => (
                  <div
                    key={phase.phaseKey}
                    className="relative overflow-hidden rounded-xl border p-3.5 pl-4"
                    style={{ borderColor: 'var(--mantine-color-default-border)' }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: index === 0 ? 'var(--vf-action-text)' : 'var(--vf-accent-text)' }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Text size="sm" fw={800}>{phase.phaseLabel}</Text>
                      <Badge color="neutral">{phase.weekRange}</Badge>
                    </div>
                    <Caption mt={4}>{phase.representativeWeek.summary}</Caption>
                  </div>
                ))
              : weekOptions.map((option) => (
                  <Panel key={option.key} surface="inset" p="sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text size="sm" fw={800}>{weekOptionHeading(option)}</Text>
                      {option.weeks.length > 1 ? <Badge color="neutral">{option.weeks.length} weeks</Badge> : null}
                    </div>
                    <Caption mt={4}>{option.week.summary}</Caption>
                    {option.detail ? (
                      <Caption mt={4} size="0.625rem" fw={600}>{option.detail}</Caption>
                    ) : null}
                  </Panel>
                ))}
          </div>
        </div>

        <div>
          <SectionLabel>What Sheetless regulates</SectionLabel>
          <div className="mt-2 grid gap-2">
            {REGULATES.map((item) => (
              <Panel key={item.title} surface="inset" p="sm">
                <Text size="sm" fw={700}>{item.title}</Text>
                <Caption mt={2}>{item.body}</Caption>
              </Panel>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl border p-3.5"
          style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}
        >
          <SectionLabel tone="action">Customization rules</SectionLabel>
          <Text mt={4} size="sm" style={{ color: 'var(--vf-action-text)' }}>
            Main lifts stay locked. Variation and accessory swaps use related movements and apply from week 1. Extra
            accessories copy the selected day&apos;s accessory prescription.
          </Text>
        </div>
      </div>
    </Modal>
  )
}
