/** Native port of web FocusRirRow: large 0/1/2/3+ reps-in-reserve picker. */
import { Pressable, View } from 'react-native'
import { RIR_OPTIONS } from '@sheetless/domain/session/live-session-utils'
import { Caption, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { FocusStepper } from './FocusStepper'

export function FocusRirRow({
  value,
  onChange,
  disabled = false,
  targetRir,
}: {
  value?: number
  onChange: (value: number) => void
  disabled?: boolean
  targetRir?: number | null
}) {
  const { theme } = useTokens()
  if ((targetRir ?? 0) > 3) {
    return (
      <FocusStepper
        label="Actual reps in reserve"
        value={value ?? null}
        step={1}
        disabled={disabled}
        onAdjust={(delta) => onChange(Math.max(0, Math.min(10, (value ?? 0) + delta)))}
        onType={(next) => onChange(Math.max(0, Math.min(10, next)))}
      />
    )
  }
  return (
    <View>
      <Caption>Reps in reserve · could you do more?</Caption>
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
        {RIR_OPTIONS.map((option) => {
          // The 3+ bucket also reflects any legacy values logged above 3.
          const selected = option.value === 3 ? (value ?? -1) >= 3 : value === option.value
          return (
            <Pressable
              key={option.value}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? theme.primaryFill : theme.surface,
                borderColor: selected ? theme.primaryFill : theme.border,
                borderRadius: radii.lg,
                borderWidth: 1,
                flex: 1,
                opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
                paddingVertical: spacing.sm,
              })}
            >
              <Text
                size="sm"
                style={{ color: selected ? theme.primaryFillText : theme.text, fontWeight: '800' }}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
