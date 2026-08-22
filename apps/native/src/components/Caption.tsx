import type { StyleProp, TextStyle } from 'react-native'
import { Text } from './Text'
import type { Tone } from '@/lib/tokens'

export interface CaptionProps {
  children: React.ReactNode
  tone?: Tone
  style?: StyleProp<TextStyle>
  numberOfLines?: number
}

/** Small dimmed helper text — mirrors the web `Caption` atom (xs, dimmed). */
export function Caption({ children, tone = 'dimmed', style, numberOfLines }: CaptionProps) {
  return (
    <Text size="xs" tone={tone} style={style} numberOfLines={numberOfLines}>
      {children}
    </Text>
  )
}
