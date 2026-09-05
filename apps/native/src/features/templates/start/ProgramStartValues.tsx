import { View } from 'react-native'
import type { UserProfile } from '@sheetless/domain/account/types'
import { getMovementName } from '@sheetless/domain/movement/movements'
import type { ProgramStateInput } from '@sheetless/domain/program/types'
import { formatStateType, loadValueFromInput } from '@sheetless/domain/program/template-start-utils'
import { Caption, Panel, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'

function inputError(rawValue: string) {
  if (!rawValue.trim()) return 'Required to start this programme.'
  return loadValueFromInput(rawValue) === null ? 'Enter a number greater than zero.' : null
}

export function ProgramStartValues({
  profile,
  stateValues,
  draftValues,
  disabled,
  onChange,
}: {
  profile: UserProfile
  stateValues: ProgramStateInput[]
  draftValues: Record<string, string>
  disabled: boolean
  onChange: (key: string, value: string) => void
}) {
  if (!stateValues.length) {
    return (
      <Panel surface="inset" style={{ padding: spacing.sm }}>
        <Text size="sm" tone="dimmed">
          This programme has no required starting loads. Choose weights while you train.
        </Text>
      </Panel>
    )
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {stateValues.map((state) => {
        const rawValue = draftValues[state.key] ?? ''
        return (
          <Panel key={state.key} surface="inset" style={{ gap: 5, padding: spacing.sm }}>
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
                  {getMovementName(state.movementId)}
                </Text>
                <Caption>{formatStateType(state.type)}</Caption>
              </View>
              <Caption style={{ fontWeight: '700' }}>{profile.units}</Caption>
            </View>
            <TextInput
              value={rawValue}
              keyboardType="decimal-pad"
              placeholder={`Enter ${profile.units}`}
              textAlign="right"
              error={inputError(rawValue)}
              editable={!disabled}
              onChangeText={(value) => onChange(state.key, value)}
              testID={`program-state-${state.key}`}
            />
          </Panel>
        )
      })}
    </View>
  )
}
