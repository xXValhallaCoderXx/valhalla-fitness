import { Badge, Button, Card } from '@mantine/core'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { ProgramStateInput } from '~/domains/program'
import type { Unit } from '~/shared/types'
import {
  MissingEstimatesPopover,
  MissingStrengthEstimatesNotice,
  SetupValuesButton,
} from './TemplateStartStrengthEstimates'

export { DefaultsModal } from './TemplateStartDefaultsModal'
export {
  MissingEstimatesPopover,
  MissingStrengthEstimatesNotice,
  SetupValuesButton,
} from './TemplateStartStrengthEstimates'

export function QuickFactsCard({
  className,
  facts,
}: {
  className?: string
  facts: { label: string; value: ReactNode }[]
}) {
  return (
    <Card className={className} p="md">
      <SectionLabel>Quick facts</SectionLabel>
      <div className="mt-2">
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className="flex items-center justify-between gap-3 py-2.5"
            style={index > 0 ? { borderTop: '1px solid var(--mantine-color-default-border)' } : undefined}
          >
            <Caption>{fact.label}</Caption>
            <Text size="sm" fw={800} ta="right">{fact.value}</Text>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function StartSummaryPanel({
  className,
  units,
  rounding,
  visibleState,
  missingRequiredState,
  hasTrainingMaxState,
  hasWorkingLoadState,
  customizationCount,
  startError,
  isPending,
  onStart,
  onViewDefaults,
}: {
  className?: string
  units: Unit
  rounding: number
  visibleState: ProgramStateInput[]
  missingRequiredState: ProgramStateInput[]
  hasTrainingMaxState: boolean
  hasWorkingLoadState: boolean
  customizationCount: number
  startError: string | null
  isPending: boolean
  onStart: () => void
  onViewDefaults: () => void
}) {
  const valuesLabel =
    visibleState.length > 0 && missingRequiredState.length === 0 ? 'Modify starting values' : 'Set up values'
  return (
    <Card className={`space-y-4 ${className ?? ''}`} p="md">
      <div>
        <SectionLabel>Starting values</SectionLabel>
        <Text mt={4} size="sm" fw={800}>{units} · round {rounding}</Text>
        {visibleState.length ? (
          <Badge
            mt={8}
            variant="light"
            color={missingRequiredState.length ? 'warning' : 'success'}
            leftSection={<Check size={12} />}
          >
            {missingRequiredState.length
              ? `${missingRequiredState.length} value${missingRequiredState.length === 1 ? '' : 's'} to set`
              : `${visibleState.length} value${visibleState.length === 1 ? '' : 's'} ready`}
          </Badge>
        ) : null}
        <Caption mt={4}>
          {hasWorkingLoadState
            ? 'Working loads are suggested from your saved e1RMs for this programme.'
            : hasTrainingMaxState
              ? 'Training maxes are suggested from your saved e1RMs for this programme.'
              : 'New programmes keep programme-scoped values.'}
        </Caption>
        <SetupValuesButton
          className="mt-3"
          disabled={missingRequiredState.length > 0}
          fullWidth
          label={valuesLabel}
          onClick={onViewDefaults}
        />
      </div>

      <Panel surface="inset" p="sm">
        <SectionLabel>Customizations</SectionLabel>
        <Text mt={4} size="sm" fw={800}>
          {customizationCount ? `${customizationCount} selected` : 'Using defaults'}
        </Text>
      </Panel>

      {missingRequiredState.length ? (
        <MissingStrengthEstimatesNotice
          stateValues={missingRequiredState}
        />
      ) : null}

      {startError ? (
        <Text
          size="xs"
          style={{
            border: '1px solid var(--vf-danger-border)',
            backgroundColor: 'var(--vf-danger-soft)',
            color: 'var(--vf-danger-text)',
            borderRadius: 'var(--mantine-radius-md)',
            padding: 'var(--mantine-spacing-sm)',
          }}
        >
          {startError}
        </Text>
      ) : null}

      <MissingEstimatesPopover active={missingRequiredState.length > 0} fullWidth>
        <Button
          className="w-full"
          disabled={isPending || missingRequiredState.length > 0}
          style={missingRequiredState.length > 0 ? { pointerEvents: 'none' } : undefined}
          onClick={missingRequiredState.length > 0 ? undefined : onStart}
        >
          <Check size={16} />
          Start programme
        </Button>
      </MissingEstimatesPopover>
    </Card>
  )
}
