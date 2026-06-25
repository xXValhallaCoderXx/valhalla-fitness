import { Badge, Modal } from '@mantine/core'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import {
  weekOptionHeading,
  type WeekPreviewOption,
} from '~/domains/program/lib/template-start-utils'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '~/shared/types'
import { StartInfoMetric } from './TemplateStartMetric'

export function ProgrammeInfoModal({
  opened,
  template,
  setupOptions,
  weekOptions,
  onClose,
}: {
  opened: boolean
  template: ProgramTemplateSummary
  setupOptions: ProgramSetupOptions
  weekOptions: WeekPreviewOption[]
  onClose: () => void
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="How this programme works" size="xl">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <StartInfoMetric label="Cycle" value={`${setupOptions.previewWeeks.length} weeks`} />
          <StartInfoMetric label="Schedule" value={`${template.daysPerWeek} days/wk`} />
          <StartInfoMetric label="Progression" value={template.progressionLabel} />
        </div>

        <div>
          <SectionLabel>Block patterns</SectionLabel>
          <div className="mt-2 grid gap-2">
            {weekOptions.map((option) => (
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

        <Panel surface="panel" p="sm">
          <SectionLabel>Customization rules</SectionLabel>
          <Text mt={4} size="sm" tone="dimmed">
            Main lifts stay locked. Variation and accessory swaps use related movements and apply from week 1. Extra
            accessories copy the selected day&apos;s accessory prescription.
          </Text>
        </Panel>
      </div>
    </Modal>
  )
}
