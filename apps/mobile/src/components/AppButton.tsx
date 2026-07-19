import { useAppTheme } from '@/theme/useAppTheme'
import { radius, spacing, typography } from '@sheetless/tokens'
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native'

type Props = PressableProps & {
  label: string
  loading?: boolean
  tone?: 'primary' | 'secondary' | 'danger'
}

export function AppButton({ label, loading, tone = 'primary', disabled, style, ...props }: Props) {
  const { colors } = useAppTheme()
  const palette =
    tone === 'primary'
      ? { background: colors.actionText, text: colors.surface }
      : tone === 'danger'
        ? { background: colors.dangerSoft, text: colors.dangerText }
        : { background: colors.surface2, text: colors.text }
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: colors.border },
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={palette.text} /> : <Text style={[styles.label, { color: palette.text }]}>{label}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  label: { fontSize: typography.fontSize.lg, fontWeight: typography.weight.heavy },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.5 },
})
