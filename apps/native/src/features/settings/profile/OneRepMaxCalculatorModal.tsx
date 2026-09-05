import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
import { Button, Caption, Heading, Panel, SectionLabel, Text, TextInput } from '@/components'
import { cardShadow, radii, spacing, useTokens } from '@/lib/tokens'

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
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
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
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessible={false}
        onPress={onClose}
        style={{
          backgroundColor: 'rgba(6, 12, 14, 0.6)',
          flex: 1,
          justifyContent: 'flex-end',
          paddingTop: spacing.xl,
        }}
      >
        <Pressable accessible={false} onPress={() => {}} style={{ cursor: 'auto' }}>
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              borderWidth: 1,
              maxHeight: '92%',
              ...cardShadow(theme),
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                gap: spacing.md,
                padding: spacing.lg,
                paddingBottom: spacing.lg + insets.bottom,
              }}
            >
              <View style={{ gap: 4 }}>
                <Heading order={2}>Calculate estimated 1RM</Heading>
                <Caption>
                  Enter a recent hard set and apply the rounded estimate to a future programme default.
                </Caption>
                <Text size="xs" weight={800} tone="action">
                  {setCount} of {oneRepMaxKeys.length} lifts set
                </Text>
              </View>

              <View style={{ gap: spacing.xs }}>
                <SectionLabel>Lift</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {liftOptions.map((option) => (
                    <Button
                      key={option.value}
                      label={strengthEstimateLabel(option.value)}
                      selected={selectedKey === option.value}
                      variant={selectedKey === option.value ? 'filled' : 'default'}
                      onPress={() => selectLift(option.value)}
                    />
                  ))}
                </View>
              </View>

              <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
                <View style={{ gap: 4 }}>
                  <SectionLabel>Known-set load</SectionLabel>
                  <TextInput
                    value={knownSet.weight}
                    onChangeText={(value) => updateKnownSet('weight', value)}
                    placeholder={`Load (${units})`}
                    keyboardType="decimal-pad"
                    testID="settings-calculator-load"
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <SectionLabel>Reps</SectionLabel>
                    <TextInput
                      value={knownSet.reps}
                      onChangeText={(value) => updateKnownSet('reps', value)}
                      placeholder="Reps"
                      keyboardType="number-pad"
                      testID="settings-calculator-reps"
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <SectionLabel>RIR</SectionLabel>
                    <TextInput
                      value={knownSet.rir}
                      onChangeText={(value) => updateKnownSet('rir', value)}
                      placeholder="0"
                      keyboardType="number-pad"
                      testID="settings-calculator-rir"
                    />
                  </View>
                </View>
                <Panel style={{ gap: 2, padding: spacing.sm }}>
                  <SectionLabel>Estimated 1RM</SectionLabel>
                  <Text weight={900}>{formatWeight(calculated, units) ?? 'Unset'}</Text>
                </Panel>
              </Panel>

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  label="Set & close"
                  variant="default"
                  style={{ flex: 1 }}
                  disabled={!hasLoadDefault(calculated)}
                  onPress={() => apply(false)}
                />
                <Button
                  label={nextUnsetKey(programStateDefaults, selectedKey) ? 'Set & next' : 'Done'}
                  style={{ flex: 1 }}
                  disabled={!hasLoadDefault(calculated)}
                  onPress={() => apply(true)}
                  testID="settings-calculator-apply"
                />
              </View>
              <Button label="Cancel" variant="subtle" fullWidth onPress={onClose} />
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
