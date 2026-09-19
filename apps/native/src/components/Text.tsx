import { fontStyle } from '@/lib/fonts'
import { Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native'
import { fontSizes, toneColor, useTokens, type Tone } from '@/lib/tokens'

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
  const custom = flattenTextStyle(style)
  return (
    <RNText
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[
        {
          color: toneColor(theme, tone) ?? theme.text,
          fontSize: fontSizes[size],
          ...fontStyle(custom?.fontWeight ?? weight),
          lineHeight: Math.round(fontSizes[size] * 1.45),
          textAlign: align,
        },
        style,
        !custom?.fontFamily ? fontStyle(custom?.fontWeight ?? weight) : null,
      ]}
    >
      {children}
    </RNText>
  )
}

function flattenTextStyle(style: unknown): TextStyle {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenTextStyle))
  return style && typeof style === 'object' ? style as TextStyle : {}
}
