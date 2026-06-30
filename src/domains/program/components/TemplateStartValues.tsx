import { Badge, Button, Card, Modal, Popover, Slider, TextInput } from '@mantine/core'
import { Settings, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { getMovementName } from '~/domains/movement/lib/movements'
import {
  MAX_TRAINING_MAX_PERCENT,
  MAX_WORKING_LOAD_PERCENT,
  MIN_TRAINING_MAX_PERCENT,
  MIN_WORKING_LOAD_PERCENT,
  oneRepMaxKeyForMovement,
  profileLoadDefault,
} from '~/domains/program/lib/program-loads'
import {
  formatNumber,
  formatStateType,
  hasUsableStateValue,
  loadValueFromInput,
  programmeValueLabel,
} from '~/domains/program/lib/template-start-utils'
import type { ProgramStateDefaults, ProgramStateInput, Unit } from '~/shared/types'
import { StartInfoMetric } from './TemplateStartMetric'

export function SetupValuesButton({
  className,
  disabled,
  fullWidth = false,
  label,
  onClick,
}: {
  className?: string
  disabled: boolean
  fullWidth?: boolean
  label: string
  onClick: () => void
}) {
  const buttonClassName = `${fullWidth ? 'w-full' : ''} ${disabled ? '' : className ?? ''}`.trim() || undefined
  const button = (
    <Button
      variant="default"
      className={buttonClassName}
      disabled={disabled}
      style={disabled ? { pointerEvents: 'none' } : undefined}
      onClick={disabled ? undefined : onClick}
    >
      <Settings size={14} />
      {label}
    </Button>
  )

  if (!disabled) return button

  return (
    <Popover withArrow withinPortal position="top" width={280} shadow="md">
      <Popover.Target>
        <span className={`${fullWidth ? 'block w-full' : 'inline-flex'} ${className ?? ''}`.trim()}>
          {button}
        </span>
      </Popover.Target>
      <Popover.Dropdown>
        <div className="space-y-3">
          <Caption>
            Set your estimated 1RMs in <StrengthEstimatesLink /> first. Sheetless uses them to suggest this
            programme&apos;s starting values.
          </Caption>
          <Button component="a" href="/settings#programme-loads" size="xs" className="w-full">
            <Settings size={14} />
            Open Strength Estimates
          </Button>
        </div>
      </Popover.Dropdown>
    </Popover>
  )
}

export function MissingStrengthEstimatesNotice({
  stateValues,
  size = 'xs',
}: {
  stateValues: ProgramStateInput[]
  size?: string
}) {
  const labels = stateValues.map((state) => getMovementName(state.movementId))
  const programmeValue = programmeValueLabel(stateValues)

  return (
    <Text
      size={size}
      style={{
        border: '1px solid var(--vf-warning-border)',
        backgroundColor: 'var(--vf-warning-soft)',
        color: 'var(--vf-warning-text)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-sm)',
      }}
    >
      Add {stateValues.length} strength estimate{stateValues.length === 1 ? '' : 's'}
      {labels.length ? <> for {labels.join(', ')}</> : null} in <StrengthEstimatesLink /> before starting.
      Sheetless uses them to suggest this programme&apos;s {programmeValue}.
    </Text>
  )
}

function StrengthEstimatesLink({ children = 'Settings > Strength Estimates' }: { children?: ReactNode }) {
  return (
    <a
      href="/settings#programme-loads"
      style={{
        color: 'var(--vf-action-text)',
        fontWeight: 800,
        textDecoration: 'underline',
        textUnderlineOffset: 2,
      }}
    >
      {children}
    </a>
  )
}

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

      <Button className="w-full" disabled={isPending || missingRequiredState.length > 0} onClick={onStart}>
        <Check size={16} />
        Start programme
      </Button>
    </Card>
  )
}

export function DefaultsModal({
  opened,
  units,
  rounding,
  profileDefaults,
  visibleState,
  missingRequiredState,
  trainingMaxPercent,
  workingLoadPercent,
  hasTrainingMaxState,
  hasWorkingLoadState,
  onTrainingMaxPercentChange,
  onWorkingLoadPercentChange,
  onStateValueChange,
  onClose,
}: {
  opened: boolean
  units: Unit
  rounding: number
  profileDefaults: ProgramStateDefaults
  visibleState: ProgramStateInput[]
  missingRequiredState: ProgramStateInput[]
  trainingMaxPercent: number
  workingLoadPercent: number
  hasTrainingMaxState: boolean
  hasWorkingLoadState: boolean
  onTrainingMaxPercentChange: (value: number) => void
  onWorkingLoadPercentChange: (value: number) => void
  onStateValueChange: (key: string, value: number | null) => void
  onClose: () => void
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="Programme start values" size="xl">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <StartInfoMetric label="Units" value={units} />
          <StartInfoMetric label="Rounding" value={rounding} />
          <StartInfoMetric label="Programme values" value={visibleState.length || 'None'} />
        </div>

        {visibleState.length ? (
          <div>
            <Text size="sm" fw={800}>
              {hasWorkingLoadState ? 'Set suggested working loads' : 'Use or adjust training maxes'}
            </Text>
            <Caption mt={4}>
              {hasWorkingLoadState
                ? 'Current-load programmes start from working loads. Sheetless suggests them from your saved estimated 1RMs, then saves the chosen values only to this programme.'
                : 'Training maxes start as conservative percentages of your saved estimated 1RMs. Any edits here are copied only into this programme.'}
            </Caption>
            {hasTrainingMaxState ? (
              <Caption mt={4} size="0.6875rem" fw={600}>
                If the programme feels too hard or too easy later, adjust the programme training max rather than changing every planned load.
              </Caption>
            ) : null}
          </div>
        ) : null}

        {hasTrainingMaxState ? (
          <Panel surface="inset" p="sm">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Programme training max</SectionLabel>
              <Text size="sm" fw={800}>{trainingMaxPercent}% of estimated 1RM</Text>
            </div>
            <Slider
              className="mt-3"
              min={MIN_TRAINING_MAX_PERCENT}
              max={MAX_TRAINING_MAX_PERCENT}
              step={1}
              value={trainingMaxPercent}
              label={(value) => `${value}%`}
              marks={[
                { value: 80, label: '80%' },
                { value: 90, label: '90%' },
                { value: 95, label: '95%' },
              ]}
              onChange={onTrainingMaxPercentChange}
            />
          </Panel>
        ) : null}

        {hasWorkingLoadState ? (
          <Panel surface="inset" p="sm">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Starting working load</SectionLabel>
              <Text size="sm" fw={800}>{workingLoadPercent}% of estimated 1RM</Text>
            </div>
            <Slider
              className="mt-3"
              min={MIN_WORKING_LOAD_PERCENT}
              max={MAX_WORKING_LOAD_PERCENT}
              step={1}
              value={workingLoadPercent}
              label={(value) => `${value}%`}
              marks={[
                { value: 60, label: '60%' },
                { value: 75, label: '75%' },
                { value: 90, label: '90%' },
              ]}
              onChange={onWorkingLoadPercentChange}
            />
          </Panel>
        ) : null}

        {visibleState.length ? (
          <div>
            <SectionLabel>Programme-scoped values</SectionLabel>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {visibleState.map((state) => {
                const oneRepMax = profileLoadDefault(profileDefaults[oneRepMaxKeyForMovement(state.movementId)])
                return (
                  <Panel
                    key={state.key}
                    surface="inset"
                    p="sm"
                    style={{
                      borderColor: hasUsableStateValue(state.value)
                        ? 'var(--mantine-color-default-border)'
                        : 'var(--vf-warning-border)',
                      backgroundColor: hasUsableStateValue(state.value)
                        ? 'var(--vf-surface-2)'
                        : 'var(--vf-warning-soft)',
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Text size="sm" fw={800} truncate>{getMovementName(state.movementId)}</Text>
                        <SectionLabel mt={2}>{formatStateType(state.type)}</SectionLabel>
                      </div>
                      <Badge color={hasUsableStateValue(state.value) ? 'success' : 'warning'} size="xs">
                        {hasUsableStateValue(state.value) ? 'Set' : 'Unset'}
                      </Badge>
                    </div>
                    <TextInput
                      classNames={{ input: 'text-right' }}
                      type="number"
                      placeholder="Unset"
                      value={state.value ?? ''}
                      rightSection={<Caption fw={700}>{units}</Caption>}
                      onChange={(event) => onStateValueChange(state.key, loadValueFromInput(event.target.value))}
                    />
                    <Caption mt="sm" size="0.6875rem">
                      {state.type === 'working_load'
                        ? oneRepMax
                          ? `Suggested from ${formatNumber(oneRepMax)} ${units} estimated 1RM. You can override it for this programme.`
                          : 'No saved estimated 1RM was found for this movement. Set it in Strength Estimates before choosing working loads.'
                        : oneRepMax
                          ? `Suggested from ${formatNumber(oneRepMax)} ${units} estimated 1RM. Editing it here will not change Settings.`
                          : 'No saved estimated 1RM was found for this movement. Set it in Strength Estimates before choosing training maxes.'}
                    </Caption>
                  </Panel>
                )
              })}
            </div>
          </div>
        ) : (
          <Panel surface="inset" p="sm">
            <Text size="sm" tone="dimmed">
              This programme does not need saved strength estimates. Loads can be selected while logging.
            </Text>
          </Panel>
        )}

        {missingRequiredState.length ? (
          <MissingStrengthEstimatesNotice
            size="sm"
            stateValues={missingRequiredState}
          />
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="default" onClick={onClose}>Close</Button>
          <Button component="a" href="/settings#programme-loads" onClick={onClose}>
            <Settings size={14} />
            Open Strength Estimates
          </Button>
        </div>
      </div>
    </Modal>
  )
}
