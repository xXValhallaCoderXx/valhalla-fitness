import { Badge, NumberInput, TextInput, Tooltip } from '@mantine/core'
import { Check, Gauge, Info } from 'lucide-react'
import { Caption, SectionLabel, Text } from '~/components'
import { ProgramInfoHint } from '~/domains/program/components/ProgramInfoHint'
import type { GuidanceIssue } from '~/domains/program/lib/custom-builder-guidance'
import { recommendedDaysFor } from '~/domains/program/lib/custom-builder-guidance'
import { clampBuilderDayCount } from '~/domains/program/lib/custom-builder-ui'
import {
  customProgramMethodologies,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '~/domains/program/lib/custom-program-meta'
import { GuidanceList } from './CustomBuilderGuidance'

export function CustomMethodologyStep({
  draft,
  issues,
  onDraftChange,
  onMethodologyChange,
  onDaysChange,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onDraftChange: (patch: Partial<CustomProgramBuilderInput>) => void
  onMethodologyChange: (methodology: CustomProgramMethodology) => void
  onDaysChange: (daysPerWeek: number) => void
}) {
  const recommendedDays = recommendedDaysFor(draft.methodology)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem]">
        <TextInput
          label="Programme name"
          value={draft.name}
          onChange={(event) => onDraftChange({ name: event.target.value })}
        />
        <TextInput
          label="Goal"
          placeholder="e.g. Add 10kg to squat"
          value={draft.goal ?? ''}
          onChange={(event) => onDraftChange({ goal: event.target.value })}
        />
        <NumberInput
          label={
            <span className="inline-flex items-center gap-1">
              Days per week
              <ProgramInfoHint label="Day count guidance">{recommendedDays.rationale}</ProgramInfoHint>
            </span>
          }
          min={1}
          max={7}
          allowDecimal={false}
          clampBehavior="strict"
          value={draft.daysPerWeek}
          onChange={(value) => onDaysChange(clampBuilderDayCount(value, draft.daysPerWeek))}
        />
      </div>

      <GuidanceList issues={issues} />

      <div>
        <SectionLabel className="mb-4">How should Sheetless regulate you?</SectionLabel>
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(customProgramMethodologies) as CustomProgramMethodology[]).map((methodology) => {
            const option = customProgramMethodologies[methodology]
            const selected = draft.methodology === methodology
            return (
              <button
                key={methodology}
                type="button"
                className="rounded-xl border p-4 text-left transition"
                style={{
                  borderColor: selected ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)',
                  backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
                  boxShadow: selected ? '0 0 0 1px var(--vf-action-border)' : undefined,
                }}
                onClick={() => onMethodologyChange(methodology)}
              >
                <span className="flex items-start justify-between gap-2">
                  <Text component="span" display="block" size="md" fw={800}>
                    {option.label}
                  </Text>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Tooltip label={option.tooltip} multiline w={260}>
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Info size={15} color="var(--mantine-color-dimmed)" />
                      </span>
                    </Tooltip>
                    {selected ? (
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'var(--vf-action-text)', color: 'var(--mantine-color-white)' }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                    ) : (
                      <Badge color={methodology === 'none' ? 'neutral' : 'action'} variant="light">
                        {option.complexity}
                      </Badge>
                    )}
                  </span>
                </span>
                <Text component="span" display="block" mt={6} size="xs" tone="dimmed">
                  {option.description}
                </Text>
                <span
                  className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5"
                  style={{
                    backgroundColor: selected ? 'var(--mantine-color-default)' : 'var(--vf-surface-2)',
                    border: '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  <Gauge size={14} color="var(--vf-action-text)" className="mt-0.5 shrink-0" />
                  <Caption component="span" fw={600}>
                    {option.regulationSummary}
                  </Caption>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
