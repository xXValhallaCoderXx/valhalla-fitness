import { Text as RNText, View } from 'react-native'
import { fontFamily, radii, useTokens, type ToneName } from '@/lib/tokens'

export interface BadgeProps {
  children: React.ReactNode
  tone?: ToneName
  /** `light` = soft translucent fill (default); `filled` = solid primary-style fill. */
  variant?: 'light' | 'filled'
  leftSection?: React.ReactNode
}

/** Uppercase pill badge — mirrors web Mantine `Badge` usage. */
export function Badge({ children, tone = 'neutral', variant = 'light', leftSection }: BadgeProps) {
  const { theme } = useTokens()
  const colors = theme.tones[tone]
  const filled = variant === 'filled'
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: filled ? theme.primaryFill : colors.soft,
        borderColor: filled ? 'transparent' : colors.border,
        borderRadius: radii.sm,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      {leftSection}
      <RNText
        style={{
          color: filled ? theme.primaryFillText : colors.text,
          fontFamily,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </RNText>
    </View>
  )
}
