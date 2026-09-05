import { Text as RNText, View } from 'react-native'
import { fontFamily, fontSizes, toneColor, useTokens, type Tone } from '@/lib/tokens'
import { Panel } from './Panel'
import { SectionLabel } from './SectionLabel'

export interface StatCardProps {
  label: string
  value: string
  tone?: Tone
  /** Optional small leading icon rendered beside the label. */
  icon?: React.ReactNode
}

/** Compact metric tile — mirrors the web `StatCard` molecule. */
export function StatCard({ label, value, tone, icon }: StatCardProps) {
  const { theme } = useTokens()
  return (
    <Panel surface="inset" style={{ flex: 1, minWidth: 0, padding: 12 }}>
      <RNText
        numberOfLines={1}
        style={{
          color: toneColor(theme, tone) ?? theme.text,
          fontFamily,
          fontSize: fontSizes.stat,
          fontVariant: ['tabular-nums'],
          fontWeight: '900',
          textAlign: 'right',
        }}
      >
        {value}
      </RNText>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {icon}
        <SectionLabel>{label}</SectionLabel>
      </View>
    </Panel>
  )
}
