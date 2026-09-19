import { View } from 'react-native'
import type { SetupLiftRow } from '@sheetless/domain/program/setup-lift-rows'
import { setupValueColumnLabel, trainingMaxFormula } from '@sheetless/domain/program/setup-labels'
import { loadValueFromInput } from '@sheetless/domain/program/template-start-utils'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import type { Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, Text, TextInput } from '@/components'
import { useExperienceMode } from '@/lib/experience-mode'
import { spacing, useTokens } from '@/lib/tokens'

function inputError(rawValue: string) {
  if (!rawValue.trim()) return 'Required to start this programme.'
  return loadValueFromInput(rawValue) === null ? 'Enter a number greater than zero.' : null
}

export function ProgramStartValues({
  units,
  rounding,
  rows,
  draftValues,
  disabled,
  onChange,
  onReset,
}: {
  units: Unit
  rounding: number
  rows: SetupLiftRow[]
  draftValues: Record<string, string>
  disabled: boolean
  onChange: (key: string, value: string) => void
  onReset: (key: string) => void
}) {
  const { mode, isFull, showFormulas } = useExperienceMode()
  const { theme } = useTokens()
  if (!rows.length) {
    return (
        <Text size="sm" tone="dimmed">
          This programme has no required starting loads. Choose weights while you train.
        </Text>
    )
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {rows.map((row) => {
        const rawValue = draftValues[row.key] ?? ''
        return (
          <View key={row.key} style={{ borderTopWidth: 1, borderTopColor: theme.border, gap: spacing.sm, paddingTop: spacing.md }}>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: spacing.sm,
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" weight={800} numberOfLines={1}>
                  {row.label}
                </Text>
                <Caption>{setupValueColumnLabel([row.type], mode)}</Caption>
              </View>
              <Caption>{units}</Caption>
            </View>
            {row.bestSet ? (
              <View style={{ gap: 3 }}>
                <Text size="sm">{formatWeight(row.bestSet.load, units)} × {row.bestSet.reps} reps</Text>
                <Caption>Recorded {formatCompactDate(row.bestSet.date)}</Caption>
              </View>
            ) : <Caption>{row.source === 'estimate' ? 'From your saved estimate' : 'No estimate yet · enter a starting weight'}</Caption>}
            {isFull && row.e1rm !== null ? <Caption>e1RM {formatWeight(row.e1rm, units)}</Caption> : null}
            <TextInput
              value={rawValue}
              keyboardType="decimal-pad"
              accessibilityLabel={`${row.label} ${setupValueColumnLabel([row.type], mode).toLowerCase()} (${units})`}
              placeholder={`Enter ${units}`}
              textAlign="right"
              error={inputError(rawValue)}
              editable={!disabled}
              onChangeText={(value) => onChange(row.key, value)}
              testID={`program-state-${row.key}`}
            />
            {showFormulas && row.e1rm !== null && (row.type === 'training_max' || row.type === 'working_load') ? (
              <Caption tone="action">{trainingMaxFormula(row.percent, rounding)} → {row.suggested}</Caption>
            ) : null}
            {row.suggested !== null && (row.edited || row.value === null) ? (
              <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Caption>{row.value === null ? 'A suggestion is available' : 'Edited for this programme'}</Caption>
                <Button label="Use suggestion" variant="subtle" disabled={disabled} onPress={() => onReset(row.key)} />
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
