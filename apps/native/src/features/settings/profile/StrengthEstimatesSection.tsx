import { useState } from 'react'
import { View } from 'react-native'
import {
  hasLoadDefault,
  oneRepMaxKeys,
  strengthEstimateLabel,
} from '@sheetless/domain/account/settings-form'
import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'
import { Badge, Button, Caption, Panel, SectionLabel, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'
import { OneRepMaxCalculatorModal } from './OneRepMaxCalculatorModal'
import { SettingsSection } from '../SettingsSection'

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
  return (
    <SettingsSection
      title="Strength Estimates"
      description="Estimated 1RMs suggest starting values when you begin a programme."
    >
      <Panel style={{ gap: spacing.md, padding: spacing.md }}>
        <Button
          label="Calculate from a known set"
          disabled={disabled}
          onPress={() => setCalculatorOpen(true)}
          testID="settings-open-calculator"
        />
        <View style={{ gap: spacing.sm }}>
          {oneRepMaxKeys.map((key) => {
            const isSet = hasLoadDefault(programStateDefaults[key])
            return (
              <Panel key={key} surface="inset" style={{ gap: spacing.xs, padding: spacing.sm }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <SectionLabel>{strengthEstimateLabel(key)}</SectionLabel>
                  </View>
                  <Badge tone={isSet ? 'success' : 'warning'}>{isSet ? 'Set' : 'Unset'}</Badge>
                </View>
                <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    value={estimateInputs[key] ?? ''}
                    onChangeText={(value) => onInputChange(key, value)}
                    placeholder={`Estimate (${units})`}
                    keyboardType="decimal-pad"
                    editable={!disabled}
                    error={estimateErrors[key]}
                    containerStyle={{ flex: 1 }}
                    textAlign="right"
                    testID={`settings-estimate-${key}`}
                  />
                  <Button
                    label="Clear"
                    variant="subtle"
                    disabled={disabled || !isSet}
                    onPress={() => onValueChange(key, null)}
                  />
                </View>
              </Panel>
            )
          })}
        </View>
        <Caption>
          Active programmes keep their own load values after start. Logged sets still drive e1RM history.
        </Caption>
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
    </SettingsSection>
  )
}
