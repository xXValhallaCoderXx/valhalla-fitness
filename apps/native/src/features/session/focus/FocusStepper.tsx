/** Native port of web FocusStepper: big −/＋ around a tap-to-type centre value. */
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Minus, Plus } from 'lucide-react-native'
import { Caption } from '@/components'
import { fontFamily, radii, spacing, useTokens, type Theme } from '@/lib/tokens'

export function FocusStepper({
  label,
  unitSuffix,
  value,
  step,
  onAdjust,
  onType,
  onClear,
  disabled = false,
}: {
  label: string
  unitSuffix?: string
  value: number | null
  step: number
  onAdjust: (delta: number) => void
  onClear?: () => void
  onType: (value: number) => void
  disabled?: boolean
}) {
  const { theme } = useTokens()
  const [draft, setDraft] = useState({ value, text: value === null ? '' : String(value) })
  const text = draft.value === value ? draft.text : value === null ? '' : String(value)

  const handleType = (raw: string) => {
    if (!raw.trim() && onClear) {
      setDraft({ value: null, text: raw })
      onClear()
      return
    }
    const parsed = Number(raw.replace(',', '.'))
    setDraft({ value: Number.isFinite(parsed) ? parsed : value, text: raw })
    if (Number.isFinite(parsed)) onType(parsed)
  }

  return (
    <View
      style={{
        backgroundColor: theme.surface2,
        borderColor: theme.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        padding: spacing.sm,
      }}
    >
      <Caption style={{ fontWeight: '800', letterSpacing: 0.8, textAlign: 'center', textTransform: 'uppercase' }}>
        {label}
        {unitSuffix ? ` (${unitSuffix})` : ''}
      </Caption>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: 4 }}>
        <StepButton theme={theme} disabled={disabled} onPress={() => onAdjust(-step)}>
          <Minus size={20} color={theme.text} />
        </StepButton>
        <TextInput
          accessibilityLabel={label}
          value={text}
          onChangeText={handleType}
          editable={!disabled}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{
            color: theme.text,
            flex: 1,
            fontFamily,
            fontSize: 32,
            fontWeight: '900',
            // RN-web TextInput has an intrinsic min-width that shoves the + button off-screen.
            minWidth: 0,
            paddingVertical: 0,
            textAlign: 'center',
            width: 0,
          }}
        />
        <StepButton theme={theme} disabled={disabled} onPress={() => onAdjust(step)}>
          <Plus size={20} color={theme.text} />
        </StepButton>
      </View>
    </View>
  )
}

function StepButton({
  theme,
  disabled,
  onPress,
  children,
}: {
  theme: Theme
  disabled: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderRadius: 28,
        borderWidth: 1,
        height: 56,
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        width: 56,
      })}
    >
      {children}
    </Pressable>
  )
}
