import { fontStyle } from '@/lib/fonts'
import { Text as RNText } from 'react-native'
import { fontSizes, toneColor, useTokens, type Tone } from '@/lib/tokens'

export interface SectionLabelProps {
  children: React.ReactNode
  tone?: Tone
}

/** Uppercase section label — mirrors web `.vf-section-label` (10px / 800 / 0.08em). */
export function SectionLabel({ children, tone }: SectionLabelProps) {
  const { theme } = useTokens()
  return (
    <RNText
      style={{
        color: toneColor(theme, tone) ?? theme.textMuted,
        ...fontStyle('800'),
          fontSize: fontSizes.caption,
          flexShrink: 1,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </RNText>
  )
}
