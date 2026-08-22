import { Text as RNText } from 'react-native'
import { fontFamily, fontSizes, toneColor, useTokens, type Tone } from '@/lib/tokens'

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
        fontFamily,
        fontSize: fontSizes.caption,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </RNText>
  )
}
