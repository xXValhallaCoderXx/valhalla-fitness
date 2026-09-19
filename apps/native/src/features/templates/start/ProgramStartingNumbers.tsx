import { useState } from 'react'
import { View } from 'react-native'
import { MAX_TRAINING_MAX_PERCENT, MAX_WORKING_LOAD_PERCENT, MIN_TRAINING_MAX_PERCENT, MIN_WORKING_LOAD_PERCENT } from '@sheetless/domain/program/program-loads'
import { setupLabel, setupValueColumnLabel } from '@sheetless/domain/program/setup-labels'
import { Button, Caption, Heading, Panel, SegmentedControl, Text } from '@/components'
import { useExperienceMode } from '@/lib/experience-mode'
import { spacing } from '@/lib/tokens'
import type { ProgramStartController } from './useProgramStart'
import { ProgramStartValues } from './ProgramStartValues'

export function ProgramStartingNumbers({ controller, disabled }: { controller: ProgramStartController; disabled: boolean }) {
  const { mode, isFull } = useExperienceMode()
  const [optionsOpen, setOptionsOpen] = useState(false)
  const roundingOptions = [...new Set([1, controller.units === 'kg' ? 2.5 : 5, controller.units === 'kg' ? 5 : 10, controller.rounding])]
    .sort((left, right) => left - right)
  return (
    <Panel style={{ gap: spacing.md, padding: spacing.md }}>
      <Heading order={2}>{setupValueColumnLabel(controller.stateValues.map((state) => state.type), mode)}</Heading>
      <Caption>{setupLabel('sourceNote', mode)}</Caption>
      {!isFull && controller.stateValues.length ? <Caption>The programme uses these reference weights to calculate each workout’s loads.</Caption> : null}
      <ProgramStartValues rows={controller.liftRows} units={controller.units} rounding={controller.rounding}
        draftValues={controller.draftValues} disabled={disabled}
        onChange={controller.setDraftValue} onReset={controller.resetDraftValue} />
      {!isFull ? <Button label={optionsOpen ? 'Hide programme options' : 'Programme options'} variant="subtle" onPress={() => setOptionsOpen(!optionsOpen)} /> : null}
      {isFull || optionsOpen ? (
        <View style={{ gap: spacing.md }}>
          <SegmentedControl variant="segments" accessibilityRole="radiogroup" accessibilityLabel="Programme units" label="Units"
            options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={controller.units}
            onChange={controller.setUnits} disabled={disabled} />
          <SegmentedControl variant="segments" accessibilityRole="radiogroup" accessibilityLabel="Programme rounding" label="Round to"
            options={roundingOptions.map((value) => ({ value: String(value), label: `${value} ${controller.units}` }))}
            value={String(controller.rounding)} onChange={(value) => controller.setRounding(Number(value))} disabled={disabled} />
          {isFull && controller.stateValues.some((state) => state.type === 'training_max') ? (
            <PercentControl label="Training max percentage" value={controller.trainingMaxPercent}
              min={MIN_TRAINING_MAX_PERCENT} max={MAX_TRAINING_MAX_PERCENT} disabled={disabled} onChange={controller.setTrainingMaxPercent} />
          ) : null}
          {isFull && controller.stateValues.some((state) => state.type === 'working_load') ? (
            <PercentControl label="Working load percentage" value={controller.workingLoadPercent}
              min={MIN_WORKING_LOAD_PERCENT} max={MAX_WORKING_LOAD_PERCENT} disabled={disabled} onChange={controller.setWorkingLoadPercent} />
          ) : null}
          <Caption>These apply to this programme only. Unit changes convert loads; percentage and rounding changes preserve values you edited.</Caption>
        </View>
      ) : null}
    </Panel>
  )
}

function PercentControl({ label, value, min, max, disabled, onChange }: {
  label: string; value: number; min: number; max: number; disabled: boolean; onChange: (value: number) => void
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text size="sm" weight={700}>{label} · {value}%</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="− 5%" accessibilityLabel={`Decrease ${label.toLowerCase()}`} variant="default"
          onPress={() => onChange(Math.max(min, value - 5))} disabled={disabled || value <= min} />
        <Button label="+ 5%" accessibilityLabel={`Increase ${label.toLowerCase()}`} variant="default"
          onPress={() => onChange(Math.min(max, value + 5))} disabled={disabled || value >= max} />
      </View>
    </View>
  )
}
