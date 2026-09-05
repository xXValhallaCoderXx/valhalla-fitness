import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import type { Unit } from '@sheetless/domain/shared/types'
import { computePlateStack, DEFAULT_BAR_WEIGHT } from '@sheetless/domain/session/plate-math'
import { Button, Caption, Panel, SectionLabel, SheetModal, Text, TextInput } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { BarbellPlates } from './BarbellPlates'

const BAR_OPTIONS: Record<Unit, number[]> = {
  kg: [20, 15, 10],
  lb: [45, 35, 25],
}

export interface PlateCalculatorSheetProps {
  open: boolean
  units: Unit
  movementName: string
  initialTarget: number
  onClose: () => void
}

/** Per-side standard-plate calculator seeded from the active workout set. */
export function PlateCalculatorSheet({
  open,
  units,
  movementName,
  initialTarget,
  onClose,
}: PlateCalculatorSheetProps) {
  const { theme } = useTokens()
  const defaultBar = DEFAULT_BAR_WEIGHT[units]
  const [targetInput, setTargetInput] = useState(() => formatWeight(initialTarget > 0 ? initialTarget : defaultBar))
  const [barWeight, setBarWeight] = useState(defaultBar)

  useEffect(() => {
    if (!open) return
    setTargetInput(formatWeight(initialTarget > 0 ? initialTarget : defaultBar))
    setBarWeight(defaultBar)
  }, [defaultBar, initialTarget, movementName, open])

  const target = useMemo(() => {
    const parsed = Number(targetInput)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }, [targetInput])
  const stack = computePlateStack({ target, barWeight, units })
  const step = units === 'kg' ? 2.5 : 5
  const status = plateStatus(target, barWeight, stack.nearestLoadable, stack.leftoverPerSide, units)

  const changeTarget = (amount: number) => {
    setTargetInput(formatWeight(Math.max(0, target + amount)))
  }

  return (
    <SheetModal
      open={open}
      title="Plate calculator"
      subtitle={movementName}
      onClose={onClose}
      testID="plate-calculator-sheet"
      footer={<Button label="Done" variant="default" fullWidth style={{ minHeight: 44 }} onPress={onClose} />}
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text size="sm" weight={700}>Target ({units})</Text>
            <TextInput
              accessibilityLabel={`Target weight in ${units}`}
              value={targetInput}
              onChangeText={(value) => setTargetInput(sanitizeWeight(value))}
              placeholder={String(defaultBar)}
              keyboardType="decimal-pad"
              maxLength={7}
              inputStyle={{ minHeight: 44 }}
              testID="plate-target-input"
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text size="sm" weight={700}>Bar ({units})</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {BAR_OPTIONS[units].map((weight) => (
                <Button
                  key={weight}
                  label={String(weight)}
                  variant={barWeight === weight ? 'filled' : 'default'}
                  selected={barWeight === weight}
                  style={{ flex: 1, minHeight: 44, paddingHorizontal: 3 }}
                  onPress={() => setBarWeight(weight)}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label={`− ${step}`}
            variant="default"
            style={{ flex: 1, minHeight: 44 }}
            disabled={target <= 0}
            onPress={() => changeTarget(-step)}
          />
          <Button
            label={`+ ${step}`}
            variant="default"
            style={{ flex: 1, minHeight: 44 }}
            onPress={() => changeTarget(step)}
          />
        </View>

        <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
          <SectionLabel>Per side ({units})</SectionLabel>
          <BarbellPlates perSide={stack.perSide} units={units} />
          <Text size="sm" weight={700} align="center">
            {stack.perSide.length ? stack.perSide.join(' · ') : 'No plates'}
          </Text>
        </Panel>

        <Panel
          style={{
            backgroundColor: theme.tones[status.tone].soft,
            borderColor: theme.tones[status.tone].border,
            gap: 3,
            padding: spacing.sm,
          }}
        >
          <Text size="sm" weight={800} style={{ color: theme.tones[status.tone].text }}>
            {status.title}
          </Text>
          <Caption style={{ color: theme.tones[status.tone].text }}>{status.detail}</Caption>
        </Panel>
      </View>
    </SheetModal>
  )
}

function sanitizeWeight(value: string) {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const [whole = '', ...decimals] = normalized.split('.')
  return decimals.length ? `${whole}.${decimals.join('').slice(0, 2)}` : whole
}

function formatWeight(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function plateStatus(
  target: number,
  barWeight: number,
  nearestLoadable: number,
  leftoverPerSide: number,
  units: Unit,
): { tone: 'success' | 'warning'; title: string; detail: string } {
  if (target <= barWeight) {
    return {
      tone: target === barWeight ? 'success' : 'warning',
      title: 'Just the bar',
      detail: target === barWeight
        ? `The selected bar weighs exactly ${barWeight} ${units}.`
        : `The selected bar weighs ${barWeight} ${units}, above the ${target} ${units} target.`,
    }
  }
  if (leftoverPerSide > 0) {
    return {
      tone: 'warning',
      title: `Nearest loadable: ${nearestLoadable} ${units}`,
      detail: `${leftoverPerSide} ${units} per side short of the target with standard plates.`,
    }
  }
  return {
    tone: 'success',
    title: `Exact: ${nearestLoadable} ${units}`,
    detail: 'The standard plate stack matches the target exactly.',
  }
}
