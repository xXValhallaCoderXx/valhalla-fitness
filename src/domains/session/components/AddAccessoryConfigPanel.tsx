import { ActionIcon, Button, Checkbox, Select, TextInput } from '@mantine/core'
import { Info } from 'lucide-react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { accessoryProgressionOptions } from '~/domains/session/lib/accessories'
import type { AccessoryProgressionMethod, SwapScope } from '~/shared/types'
import { defaultFieldStyles, defaultSelectStyles } from './form-styles'

type AddAccessoryConfigPanelProps = {
  progressionMethod: AccessoryProgressionMethod
  methodHelpOpen: boolean
  repMin: string
  repMax: string
  repTargetError?: string
  parsedRepLabel: string | null
  note: string
  scope: SwapScope
  phaseLabel: string
  selectedMovementName: string | null
  isPending: boolean
  canSubmit: boolean
  onProgressionMethodChange: (value: AccessoryProgressionMethod) => void
  onMethodHelpOpenChange: (value: boolean) => void
  onRepMinChange: (value: string) => void
  onRepMaxChange: (value: string) => void
  onNoteChange: (value: string) => void
  onScopeChange: (value: SwapScope) => void
  onClose: () => void
  onSubmit: () => void
}

export function AddAccessoryConfigPanel({
  progressionMethod,
  methodHelpOpen,
  repMin,
  repMax,
  repTargetError,
  parsedRepLabel,
  note,
  scope,
  phaseLabel,
  selectedMovementName,
  isPending,
  canSubmit,
  onProgressionMethodChange,
  onMethodHelpOpenChange,
  onRepMinChange,
  onRepMaxChange,
  onNoteChange,
  onScopeChange,
  onClose,
  onSubmit,
}: AddAccessoryConfigPanelProps) {
  return (
    <Panel surface="inset" className="space-y-2.5" p="sm">
      <div>
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Progression</SectionLabel>
          <ActionIcon
            variant="default"
            size="sm"
            aria-label="Explain progression methods"
            aria-pressed={methodHelpOpen}
            title="Explain progression methods"
            onClick={() => onMethodHelpOpenChange(!methodHelpOpen)}
          >
            <Info size={13} />
          </ActionIcon>
        </div>
      </div>
      <Select
        label="Method"
        data={accessoryProgressionOptions}
        value={progressionMethod}
        onChange={(value) => onProgressionMethodChange((value ?? 'history_only') as AccessoryProgressionMethod)}
        allowDeselect={false}
        disabled={isPending}
        styles={defaultSelectStyles}
      />
      {methodHelpOpen || progressionMethod === 'double_progression' ? <ProgressionMethodInfo /> : null}
      <div>
        <SectionLabel className="mb-1">Reps</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            aria-label="Minimum reps"
            value={repMin}
            onChange={(event) => onRepMinChange(sanitizeRepInput(event.target.value))}
            placeholder="8"
            inputMode="numeric"
            maxLength={3}
            disabled={isPending}
            styles={{
              input: {
                ...defaultFieldStyles.input,
                borderColor: repTargetError ? 'var(--vf-danger-border)' : defaultFieldStyles.input.borderColor,
              },
            }}
          />
          <TextInput
            aria-label="Maximum reps"
            value={repMax}
            onChange={(event) => onRepMaxChange(sanitizeRepInput(event.target.value))}
            placeholder="12"
            inputMode="numeric"
            maxLength={3}
            disabled={isPending}
            styles={{
              input: {
                ...defaultFieldStyles.input,
                borderColor: repTargetError ? 'var(--vf-danger-border)' : defaultFieldStyles.input.borderColor,
              },
            }}
          />
        </div>
        {repTargetError ? (
          <Caption component="p" mt={4} fw={700} c="var(--vf-danger-text)">
            {repTargetError}
          </Caption>
        ) : null}
      </div>
      <AccessoryGuidance />
      <TextInput
        label="Note"
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Optional"
        disabled={isPending}
        styles={defaultFieldStyles}
      />
      <Checkbox
        checked={scope === 'phase_slot'}
        disabled={isPending}
        onChange={(event) => onScopeChange(event.currentTarget.checked ? 'phase_slot' : 'session')}
        label={phaseLabel}
        styles={{
          label: {
            color: 'var(--mantine-color-text)',
            fontSize: 'var(--mantine-font-size-sm)',
            fontWeight: 600,
          },
          input: {
            borderColor: 'var(--mantine-color-default-border)',
          },
        }}
      />
      <Panel p="sm">
        <SectionLabel>Selected</SectionLabel>
        <Text component="p" mt={4} size="sm" fw={900}>
          {selectedMovementName ?? 'No movement selected'}
        </Text>
        <Caption component="p" mt={2}>
          {parsedRepLabel ?? 'No reps'} reps · {progressionMethod === 'double_progression' ? 'Double progression' : 'History only'} · {scope === 'phase_slot' ? phaseLabel : 'This session only'}
        </Caption>
      </Panel>
      <div
        className="sticky bottom-0 -mx-2.5 -mb-2.5 grid grid-cols-2 gap-2 border-t p-2.5 pt-2 sm:-mx-3 sm:-mb-3 sm:p-3 lg:static lg:mx-0 lg:mb-0 lg:border-t-0 lg:p-0 lg:pt-1"
        style={{
          borderColor: 'var(--mantine-color-default-border)',
          backgroundColor: 'var(--vf-surface-2)',
        }}
      >
        <Button
          type="button"
          variant="default"
          disabled={isPending}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!canSubmit || isPending}
          onClick={onSubmit}
        >
          {isPending ? 'Adding...' : 'Add'}
        </Button>
      </div>
    </Panel>
  )
}

function ProgressionMethodInfo() {
  return (
    <Panel px="sm" py="xs">
      <Caption component="p" lh={1.3}>
        <Text component="span" fw={700}>Double progression</Text> keeps the load the same until all sets reach the max reps at the target RIR, then suggests adding load next time. None only records history.
      </Caption>
    </Panel>
  )
}

function AccessoryGuidance() {
  return (
    <Panel px="sm" py="xs">
      <Text component="div" className="flex items-center gap-1.5" fw={700}>
        <Info size={13} />
        Accessory rep targets
      </Text>
      <Caption component="p" mt={4} lh={1.3}>
        Most accessories sit around 8-20 reps. Use 6-10 for heavier close variations, and 12-30 for isolation or pump work.
      </Caption>
    </Panel>
  )
}

function sanitizeRepInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 3)
}
