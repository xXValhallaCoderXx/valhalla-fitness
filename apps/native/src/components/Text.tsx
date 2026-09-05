import { Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native'
import { fontFamily, fontSizes, toneColor, useTokens, type Tone } from '@/lib/tokens'

export interface TextProps {
  children: RNTextProps['children']
  tone?: Tone
  size?: keyof typeof fontSizes
  weight?: TextStyle['fontWeight']
  align?: TextStyle['textAlign']
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  selectable?: boolean
}

/** Body text with semantic tones — mirrors the web `Text` atom. */
export function Text({ children, tone, size = 'md', weight, align, style, numberOfLines, selectable }: TextProps) {
  const { theme } = useTokens()
  return (
    <RNText
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[
        {
          color: toneColor(theme, tone) ?? theme.text,
          fontFamily,
          fontSize: fontSizes[size],
          fontWeight: weight ?? '400',
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  )
}
