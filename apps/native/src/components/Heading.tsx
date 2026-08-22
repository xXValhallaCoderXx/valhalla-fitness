import { Text as RNText, type StyleProp, type TextStyle } from 'react-native'
import { fontFamily, toneColor, useTokens, type Tone } from '@/lib/tokens'

const ORDER_SIZES: Record<1 | 2 | 3, number> = { 1: 24, 2: 20, 3: 17 }

export interface HeadingProps {
  children: React.ReactNode
  /** 1 = page title, 2 = card title, 3 = sub-block title (mirrors web usage). */
  order?: 1 | 2 | 3
  tone?: Tone
  style?: StyleProp<TextStyle>
  numberOfLines?: number
}

/** Bold heading — mirrors the web `Heading` atom (fw 800 default). */
export function Heading({ children, order = 2, tone, style, numberOfLines }: HeadingProps) {
  const { theme } = useTokens()
  return (
    <RNText
      numberOfLines={numberOfLines}
      accessibilityRole="header"
      style={[
        {
          color: toneColor(theme, tone) ?? theme.text,
          fontFamily,
          fontSize: ORDER_SIZES[order],
          fontWeight: '800',
          letterSpacing: -0.2,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  )
}
