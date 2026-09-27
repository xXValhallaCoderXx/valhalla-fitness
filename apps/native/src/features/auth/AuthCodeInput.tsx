import { useState } from 'react'
import { Platform, TextInput, View } from 'react-native'
import { Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

/** One accessible paste/autofill target; the six visual slots are decorative. */
export function AuthCodeInput({ value, disabled, onChange, onSubmit }: {
  value: string; disabled: boolean; onChange: (value: string) => void; onSubmit: () => void
}) {
  const { theme } = useTokens()
  const [focused, setFocused] = useState(false)
  return <View style={{ position: 'relative' }}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', gap: spacing.xs, pointerEvents: 'none' }}>
      {Array.from({ length: 6 }, (_, index) => <View key={index} style={{
        flex: 1, minHeight: 58, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.inputBackground, borderRadius: radii.sm, borderWidth: 1,
        borderColor: focused && !disabled && index === Math.min(value.length, 5) ? theme.focusOutline : theme.border,
      }}><Text weight={800} style={{ fontSize: 26 }}>{value[index] ?? ' '}</Text></View>)}
    </View>
    <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" autoFocus
      textContentType="oneTimeCode" autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
      importantForAutofill="yes" autoCorrect={false} caretHidden editable={!disabled}
      accessibilityLabel="6-digit sign-in code" onSubmitEditing={onSubmit}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} testID="auth-code"
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, color: 'transparent', fontSize: 26, padding: 0 }} />
  </View>
}
