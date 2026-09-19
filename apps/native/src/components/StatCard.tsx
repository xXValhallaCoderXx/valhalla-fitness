import { fontStyle } from '@/lib/fonts'
import { Text as RNText, View } from 'react-native'
import { fontSizes, toneColor, useTokens, type Tone } from '@/lib/tokens'
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
    <Panel surface="inset" style={{ flexGrow: 1, flexBasis: 120, minWidth: 120, padding: 12 }}>
      <RNText
        style={{
          color: toneColor(theme, tone) ?? theme.text,
          ...fontStyle('800'),
          fontSize: fontSizes.stat,
          fontVariant: ['tabular-nums'],
          textAlign: 'left',
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
