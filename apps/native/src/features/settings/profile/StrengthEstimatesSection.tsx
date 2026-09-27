import { useState } from 'react'
import { View } from 'react-native'
import {
  hasLoadDefault,
  oneRepMaxKeys,
  strengthEstimateLabel,
} from '@sheetless/domain/account/settings-form'
import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, Panel, SectionLabel, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'
import { OneRepMaxCalculatorModal } from './OneRepMaxCalculatorModal'

export function StrengthEstimatesSection({
  programStateDefaults,
  estimateInputs,
  estimateErrors,
  units,
  rounding,
  disabled,
  onInputChange,
  onValueChange,
}: {
  programStateDefaults: ProgramStateDefaults
  estimateInputs: Record<string, string>
  estimateErrors: Record<string, string | null>
  units: Unit
  rounding: number
  disabled: boolean
  onInputChange: (key: string, value: string) => void
  onValueChange: (key: string, value: number | null) => void
}) {
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const hasAnyInput = oneRepMaxKeys.some(key => Boolean(estimateInputs[key]))
  return (
    <View style={{ gap: spacing.md }}>
      <Caption>Roughly the most you could lift once. These estimates suggest starting values for a new plan.</Caption>
      <Panel style={{ gap: spacing.md, padding: spacing.md }}>
          {oneRepMaxKeys.map((key) => {
            const isSet = hasLoadDefault(programStateDefaults[key])
            return (
              <View key={key} style={{ gap: spacing.xs }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text size="sm" weight={700}>{strengthEstimateLabel(key)}</Text>
                  </View>
                  <Caption>{isSet ? units : 'Not set'}</Caption>
                </View>
                <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    value={estimateInputs[key] ?? ''}
                    onChangeText={(value) => onInputChange(key, value)}
                    placeholder={`Estimate (${units})`}
                    keyboardType="decimal-pad"
                    accessibilityLabel={`${strengthEstimateLabel(key)} estimate in ${units}`}
                    editable={!disabled}
                    error={estimateErrors[key]}
                    containerStyle={{ flex: 1 }}
                    textAlign="right"
                    testID={`settings-estimate-${key}`}
                  />
                  <Button
                    label="Clear"
                    variant="subtle"
                    disabled={disabled || !estimateInputs[key]}
                    onPress={() => onValueChange(key, null)}
                  />
                </View>
              </View>
            )
          })}
        <Button label="Clear all" variant="subtle" disabled={disabled || !hasAnyInput}
          onPress={() => oneRepMaxKeys.forEach(key => onValueChange(key, null))}
          testID="settings-estimates-clear-all" />
      </Panel>
      <Panel style={{ gap: spacing.xs, padding: spacing.md }}>
        <Text weight={700}>Not sure? Work one out</Text>
        <Caption>Enter a set you have done and calculate a starting estimate.</Caption>
        <Button label="Calculate from a known set" variant="subtle" disabled={disabled}
          onPress={() => setCalculatorOpen(true)} testID="settings-open-calculator" />
      </Panel>
      <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Three different numbers</SectionLabel>
        <Caption>Starting numbers are the estimates you provide before beginning a plan.</Caption>
        <Caption>Your active plan keeps its own working values and changes them according to its progression rules.</Caption>
        <Caption>Estimated maxes in Insights come from the sets you have logged.</Caption>
        <Text size="sm" weight={700}>Changing these estimates does not change your active plan.</Text>
      </Panel>

      {calculatorOpen ? (
        <OneRepMaxCalculatorModal
          programStateDefaults={programStateDefaults}
          units={units}
          rounding={rounding}
          onApply={(key, value) => onValueChange(key, value)}
          onClose={() => setCalculatorOpen(false)}
        />
      ) : null}
    </View>
  )
}
