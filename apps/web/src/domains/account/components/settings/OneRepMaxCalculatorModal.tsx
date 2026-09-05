import { Button, Modal, NativeSelect, TextInput } from '@mantine/core'
import { ArrowRight, Check } from 'lucide-react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { hasLoadDefault, type KnownSetInput } from '~/domains/account/lib/settings-form'
import { formatWeight } from '~/shared/lib/set-notation'
import type { Unit } from '~/shared/types'

export function OneRepMaxCalculatorModal({
  opened,
  selectedKey,
  liftOptions,
  units,
  knownSetInput,
  calculatedValue,
  canApply,
  isLastUnset,
  setCount,
  totalCount,
  onSelectedKeyChange,
  onKnownSetChange,
  onApplyAndClose,
  onApplyAndNext,
  onClose,
}: {
  opened: boolean
  selectedKey: string
  liftOptions: Array<{ group: string; items: Array<{ value: string; label: string }> }>
  units: Unit
  knownSetInput: KnownSetInput
  calculatedValue: number | null
  canApply: boolean
  isLastUnset: boolean
  setCount: number
  totalCount: number
  onSelectedKeyChange: (key: string) => void
  onKnownSetChange: (field: keyof KnownSetInput, value: string) => void
  onApplyAndClose: () => void
  onApplyAndNext: () => void
  onClose: () => void
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Calculate estimated 1RM"
      size="md"
      classNames={{
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
        content: '!mb-0 !rounded-b-none sm:!rounded-lg',
        body: '!max-h-[calc(92dvh-3.25rem)] !overflow-y-auto',
      }}
    >
      <div className="space-y-4">
        <div>
          <Text size="sm" fw={900}>Calculate from a known set</Text>
          <Caption mt={4} lh={1.45}>
            Choose the lift, enter a recent hard set, then apply the estimated one-rep max to that lift. These estimates
            suggest future programme starting values, not live values for active programmes.
          </Caption>
          <Text mt="xs" size="xs" fw={800} tone="action">
            {setCount} of {totalCount} lifts set
          </Text>
        </div>

        <Panel surface="inset" className="grid gap-3" p="sm">
          <NativeSelect
            label="Lift"
            value={selectedKey}
            data={liftOptions}
            onChange={(event) => onSelectedKeyChange(event.target.value)}
          />

          <TextInput
            type="number"
            label="Load"
            value={knownSetInput.weight}
            rightSection={<Caption fw={800}>{units}</Caption>}
            onChange={(event) => onKnownSetChange('weight', event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              type="number"
              label="Reps"
              value={knownSetInput.reps}
              onChange={(event) => onKnownSetChange('reps', event.target.value)}
            />
            <TextInput
              type="number"
              label="RIR"
              value={knownSetInput.rir}
              onChange={(event) => onKnownSetChange('rir', event.target.value)}
            />
          </div>

          <Panel p="sm" mt="sm">
            <SectionLabel>Estimated 1RM</SectionLabel>
            <Text mt={2} size="lg" fw={900}>
              {hasLoadDefault(calculatedValue) ? formatWeight(calculatedValue, units) : 'Unset'}
            </Text>
          </Panel>
        </Panel>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" disabled={!canApply} onClick={onApplyAndClose}>
            Set &amp; close
          </Button>
          <Button disabled={!canApply} onClick={onApplyAndNext}>
            {isLastUnset ? (
              <>
                <Check size={14} />
                Done
              </>
            ) : (
              <>
                Set &amp; next
                <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
