import { Badge, Button, Modal, Slider, TextInput } from '@mantine/core'
import { Settings } from 'lucide-react'
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
} from '~/domains/program/lib/template-start-utils'
import type { ProgramStateInput } from '~/domains/program'
import type { ProgramStateDefaults, Unit } from '~/shared/types'
import { StartInfoMetric } from './TemplateStartMetric'
import { MissingStrengthEstimatesNotice } from './TemplateStartStrengthEstimates'

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
                If the programme feels too hard or too easy later, adjust the programme training max rather than
                changing every planned load.
              </Caption>
            ) : null}
          </div>
        ) : null}

        {hasTrainingMaxState ? (
          <PercentagePanel
            label="Programme training max"
            value={trainingMaxPercent}
            min={MIN_TRAINING_MAX_PERCENT}
            max={MAX_TRAINING_MAX_PERCENT}
            marks={[80, 90, 95]}
            onChange={onTrainingMaxPercentChange}
          />
        ) : null}

        {hasWorkingLoadState ? (
          <PercentagePanel
            label="Starting working load"
            value={workingLoadPercent}
            min={MIN_WORKING_LOAD_PERCENT}
            max={MAX_WORKING_LOAD_PERCENT}
            marks={[60, 75, 90]}
            onChange={onWorkingLoadPercentChange}
          />
        ) : null}

        {visibleState.length ? (
          <div>
            <SectionLabel>Programme-scoped values</SectionLabel>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {visibleState.map((state) => (
                <ProgrammeStateField
                  key={state.key}
                  state={state}
                  units={units}
                  profileDefaults={profileDefaults}
                  onChange={onStateValueChange}
                />
              ))}
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
          <MissingStrengthEstimatesNotice size="sm" stateValues={missingRequiredState} />
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

function PercentagePanel({
  label,
  value,
  min,
  max,
  marks,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  marks: number[]
  onChange: (value: number) => void
}) {
  return (
    <Panel surface="inset" p="sm">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{label}</SectionLabel>
        <Text size="sm" fw={800}>{value}% of estimated 1RM</Text>
      </div>
      <Slider
        className="mt-3"
        min={min}
        max={max}
        step={1}
        value={value}
        label={(nextValue) => `${nextValue}%`}
        marks={marks.map((mark) => ({ value: mark, label: `${mark}%` }))}
        onChange={onChange}
      />
    </Panel>
  )
}

function ProgrammeStateField({
  state,
  units,
  profileDefaults,
  onChange,
}: {
  state: ProgramStateInput
  units: Unit
  profileDefaults: ProgramStateDefaults
  onChange: (key: string, value: number | null) => void
}) {
  const oneRepMax = profileLoadDefault(profileDefaults[oneRepMaxKeyForMovement(state.movementId)])
  const hasValue = hasUsableStateValue(state.value)

  return (
    <Panel
      surface="inset"
      p="sm"
      style={{
        borderColor: hasValue ? 'var(--mantine-color-default-border)' : 'var(--vf-warning-border)',
        backgroundColor: hasValue ? 'var(--vf-surface-2)' : 'var(--vf-warning-soft)',
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Text size="sm" fw={800} truncate>{getMovementName(state.movementId)}</Text>
          <SectionLabel mt={2}>{formatStateType(state.type)}</SectionLabel>
        </div>
        <Badge color={hasValue ? 'success' : 'warning'} size="xs">
          {hasValue ? 'Set' : 'Unset'}
        </Badge>
      </div>
      <TextInput
        classNames={{ input: 'text-right' }}
        type="number"
        placeholder="Unset"
        value={state.value ?? ''}
        rightSection={<Caption fw={700}>{units}</Caption>}
        onChange={(event) => onChange(state.key, loadValueFromInput(event.target.value))}
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
}
