import { ActivityIndicator, Pressable, Text as RNText, type StyleProp, type ViewStyle } from 'react-native'
import { fontFamily, fontSizes, radii, spacing, useTokens, type ToneName } from '@/lib/tokens'

export interface ButtonProps {
  label: string
  onPress?: () => void
  /**
   * filled = solid primary fill · light = soft tone fill (web danger-light etc.)
   * default = bordered surface · subtle = borderless tone text
   */
  variant?: 'filled' | 'light' | 'default' | 'subtle'
  tone?: ToneName
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  leftSection?: React.ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Pressable button — mirrors web Mantine `Button` variants used in the app. */
export function Button({
  label,
  onPress,
  variant = 'filled',
  tone = 'action',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftSection,
  style,
  testID,
}: ButtonProps) {
  const { theme } = useTokens()
  const colors = theme.tones[tone]
  const inactive = disabled || loading

  const background =
    variant === 'filled'
      ? tone === 'action'
        ? theme.primaryFill
        : colors.text
      : variant === 'light'
        ? colors.soft
        : variant === 'default'
          ? theme.surface
          : 'transparent'
  const borderColor =
    variant === 'light' ? colors.border : variant === 'default' ? theme.border : 'transparent'
  const textColor =
    variant === 'filled' ? theme.primaryFillText : variant === 'default' ? theme.text : colors.text

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          backgroundColor: background,
          borderColor,
          borderRadius: radii.md,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 6,
          justifyContent: 'center',
          minHeight: 40,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: 8,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={textColor} /> : leftSection}
      <RNText
        style={{
          color: textColor,
          fontFamily,
          fontSize: fontSizes.md,
          fontWeight: '800',
        }}
      >
        {label}
      </RNText>
    </Pressable>
  )
}
