import { NumberInput, SegmentedControl } from '@mantine/core'
import {
  MAX_TRAINING_MAX_PERCENT,
  MIN_TRAINING_MAX_PERCENT,
} from '~/domains/program/lib/program-loads'
import { setupLabel } from '~/domains/program/lib/setup-labels'
import { ROUNDING_BY_UNIT, type SetupLiftRow } from '~/domains/program/lib/setup-lift-rows'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, Panel, SectionLabel } from '~/components'
import type { Unit } from '~/shared/types'
import { SetupLiftTable } from './SetupLiftTable'

/**
 * Step 1 — the numbers every load this cycle is derived from.
 *
 * Full exposes the two constants in the derivation (the percentage and the rounding) plus units.
 * Guided leaves them at their defaults and shows only what they produced: the design's whole point
 * is that Guided hides the working, not the result.
 */
export function StartingNumbersStep({
  rows,
  units,
  rounding,
  trainingMaxPercent,
  hasTrainingMaxState,
  onValueChange,
  onTrainingMaxPercentChange,
  onRoundingChange,
  onUnitsChange,
}: {
  rows: SetupLiftRow[]
  units: Unit
  rounding: number
  trainingMaxPercent: number
  hasTrainingMaxState: boolean
  onValueChange: (key: string, value: number | null) => void
  onTrainingMaxPercentChange: (percent: number) => void
  onRoundingChange: (rounding: number) => void
  onUnitsChange: (units: Unit) => void
}) {
  const { mode, isFull } = useExperienceMode()
  const roundingOptions = Array.from(new Set([ROUNDING_BY_UNIT[units], ROUNDING_BY_UNIT[units] * 2, 1]))
    .sort((left, right) => left - right)
    .map((value) => ({ value: String(value), label: `${value} ${units}` }))

  return (
    <div className="space-y-4">
      <SetupLiftTable
        rows={rows}
        units={units}
        rounding={rounding}
        trainingMaxPercent={trainingMaxPercent}
        onValueChange={onValueChange}
      />

      {isFull ? (
        <>
          {/* The comp gives each constant its own card rather than a labelled panel — they are
              inputs to the number above, not a footnote about it. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hasTrainingMaxState ? (
              <Panel p="sm">
                <SectionLabel>{setupLabel('percentControl', mode)}</SectionLabel>
                <NumberInput
                  mt={4}
                  size="xs"
                  suffix=" %"
                  min={MIN_TRAINING_MAX_PERCENT}
                  max={MAX_TRAINING_MAX_PERCENT}
                  value={trainingMaxPercent}
                  aria-label="Training max percentage"
                  onChange={(next) => {
                    const percent = typeof next === 'number' ? next : Number(next)
                    if (Number.isFinite(percent)) onTrainingMaxPercentChange(percent)
                  }}
                />
              </Panel>
            ) : null}
            <Panel p="sm">
              <SectionLabel>{setupLabel('roundingControl', mode)}</SectionLabel>
              <SegmentedControl
                mt={4}
                size="xs"
                fullWidth
                value={String(rounding)}
                data={roundingOptions}
                onChange={(next) => onRoundingChange(Number(next))}
              />
            </Panel>
            <Panel p="sm">
              <SectionLabel>{setupLabel('unitsControl', mode)}</SectionLabel>
              <SegmentedControl
                mt={4}
                size="xs"
                fullWidth
                value={units}
                data={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
                onChange={(next) => onUnitsChange(next as Unit)}
              />
            </Panel>
          </div>
          <Caption component="p" lh={1.5}>
            These apply to this programme only — your profile defaults are untouched. Changing units
            converts the numbers above.
          </Caption>
        </>
      ) : null}
    </div>
  )
}
