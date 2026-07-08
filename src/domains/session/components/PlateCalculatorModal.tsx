import { Modal, NumberInput, SegmentedControl } from '@mantine/core'
import { useState } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { Unit } from '~/shared/types'
import { computePlateStack, DEFAULT_BAR_WEIGHT } from '~/domains/session/lib/plate-math'
import { BarbellPlates } from '~/domains/session/components/BarbellPlates'

const BAR_OPTIONS: Record<Unit, number[]> = {
  kg: [20, 15, 10],
  lb: [45, 35, 25],
}

/** Per-side plate breakdown for the current target weight. Seeded from the selected set, editable. */
export function PlateCalculatorModal({
  open,
  onClose,
  units,
  movementName,
  initialTarget,
}: {
  open: boolean
  onClose: () => void
  units: Unit
  movementName: string
  initialTarget: number
}) {
  const [target, setTarget] = useState<number>(() => (initialTarget > 0 ? initialTarget : DEFAULT_BAR_WEIGHT[units]))
  const [barWeight, setBarWeight] = useState<number>(() => DEFAULT_BAR_WEIGHT[units])

  const stack = computePlateStack({ target, barWeight, units })

  return (
    <Modal opened={open} onClose={onClose} title="Plate calculator" centered radius="lg" size="sm">
      <div className="space-y-4" data-testid="plate-calculator">
        <Caption>{movementName}</Caption>

        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Target"
            value={target}
            onChange={(value) => setTarget(typeof value === 'number' ? value : 0)}
            min={0}
            step={units === 'kg' ? 2.5 : 5}
            suffix={` ${units}`}
            data-testid="plate-target-input"
          />
          <div>
            <Text component="span" size="sm" fw={600}>
              Bar
            </Text>
            <SegmentedControl
              fullWidth
              mt={4}
              value={String(barWeight)}
              onChange={(value) => setBarWeight(Number(value))}
              data={BAR_OPTIONS[units].map((weight) => ({ value: String(weight), label: String(weight) }))}
            />
          </div>
        </div>

        <Panel surface="inset" p="sm">
          <SectionLabel>Per side ({units})</SectionLabel>
          <div className="mt-2">
            <BarbellPlates perSide={stack.perSide} units={units} />
          </div>
          {stack.perSide.length ? (
            <Text size="sm" fw={600} ta="center" mt={6}>
              {stack.perSide.join(' · ')}
            </Text>
          ) : (
            <Text size="sm" tone="dimmed" ta="center" mt={6}>
              Just the bar — no plates needed.
            </Text>
          )}
        </Panel>

        <Caption>
          {stack.leftoverPerSide > 0
            ? `Loads to ${stack.nearestLoadable} ${units} — ${stack.leftoverPerSide} ${units}/side short of target with standard plates.`
            : `Loads to exactly ${stack.nearestLoadable} ${units}.`}
        </Caption>
      </div>
    </Modal>
  )
}
