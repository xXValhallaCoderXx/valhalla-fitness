import { useMemo, useState } from 'react'
import { View } from 'react-native'
import {
  buildLiftOptions,
  calculateOneRepMaxFromKnownSet,
  firstUnsetKey,
  hasLoadDefault,
  nextUnsetKey,
  oneRepMaxKeys,
  strengthEstimateLabel,
  type KnownSetInput,
} from '@sheetless/domain/account/settings-form'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, Panel, SectionLabel, SegmentedControl, SheetModal, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'

const emptyKnownSet: KnownSetInput = { weight: '', reps: '', rir: '0' }

export function OneRepMaxCalculatorModal({
  programStateDefaults,
  units,
  rounding,
  onApply,
  onClose,
}: {
  programStateDefaults: ProgramStateDefaults
  units: Unit
  rounding: number
  onApply: (key: string, value: number) => void
  onClose: () => void
}) {
  const [selectedKey, setSelectedKey] = useState(
    () => firstUnsetKey(programStateDefaults) ?? oneRepMaxKeys[0]!,
  )
  const [knownSet, setKnownSet] = useState<KnownSetInput>(emptyKnownSet)
  const calculated = useMemo(
    () => calculateOneRepMaxFromKnownSet(knownSet, rounding),
    [knownSet, rounding],
  )
  const liftOptions = useMemo(
    () => buildLiftOptions(programStateDefaults, units).flatMap((group) => group.items),
    [programStateDefaults, units],
  )
  const setCount = oneRepMaxKeys.filter((key) => hasLoadDefault(programStateDefaults[key])).length

  const selectLift = (key: string) => {
    setSelectedKey(key)
    setKnownSet(emptyKnownSet)
  }
  const updateKnownSet = (key: keyof KnownSetInput, value: string) =>
    setKnownSet((current) => ({ ...current, [key]: value }))
  const apply = (continueToNext: boolean) => {
    if (!hasLoadDefault(calculated)) return
    onApply(selectedKey, calculated)
    if (!continueToNext) {
      onClose()
      return
    }
    const updated = { ...programStateDefaults, [selectedKey]: calculated }
    const next = nextUnsetKey(updated, selectedKey)
    if (!next) {
      onClose()
      return
    }
    setSelectedKey(next)
    setKnownSet(emptyKnownSet)
  }

  return (
    <SheetModal open title="Calculate a starting number" onClose={onClose}
      subtitle="Enter a recent hard set. Apply the estimate, then save your starting numbers."
      footer={<View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Apply & close" variant="default" style={{ flex: 1 }}
            disabled={!hasLoadDefault(calculated)} onPress={() => apply(false)} />
          <Button label={nextUnsetKey(programStateDefaults, selectedKey) ? 'Apply & next' : 'Apply'}
            style={{ flex: 1 }} disabled={!hasLoadDefault(calculated)} onPress={() => apply(true)}
            testID="settings-calculator-apply" />
        </View>
        <Button label="Cancel" variant="subtle" fullWidth onPress={onClose} />
      </View>}>
      <Text size="xs" weight={800} tone="action">{setCount} of {oneRepMaxKeys.length} lifts set</Text>
      <SegmentedControl label="Lift" options={liftOptions.map(option => ({ value: option.value,
        label: strengthEstimateLabel(option.value) }))} value={selectedKey} onChange={selectLift}
        variant="pills" accessibilityRole="radiogroup" accessibilityLabel="Lift for starting estimate" />
      <Panel surface="inset" style={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <SectionLabel>Known-set load</SectionLabel>
          <TextInput value={knownSet.weight} onChangeText={value => updateKnownSet('weight', value)}
            placeholder={`Load (${units})`} keyboardType="decimal-pad"
            accessibilityLabel={`Known-set load in ${units}`} testID="settings-calculator-load" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <SectionLabel>Reps</SectionLabel>
            <TextInput value={knownSet.reps} onChangeText={value => updateKnownSet('reps', value)}
              placeholder="Reps" keyboardType="number-pad" accessibilityLabel="Reps completed"
              testID="settings-calculator-reps" />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <SectionLabel>Reps left</SectionLabel>
            <TextInput value={knownSet.rir} onChangeText={value => updateKnownSet('rir', value)}
              placeholder="0" keyboardType="number-pad" accessibilityLabel="Reps left in reserve"
              testID="settings-calculator-rir" />
          </View>
        </View>
        <Caption>Reps left means how many more you could have done. Use 0 if the set was your limit.</Caption>
        <Panel style={{ gap: spacing.xs, padding: spacing.sm }}>
          <SectionLabel>Estimated one-rep max</SectionLabel>
          <Text weight={900}>{formatWeight(calculated, units) ?? 'Enter your set'}</Text>
        </Panel>
      </Panel>
    </SheetModal>
  )
}
