import { View } from 'react-native'
import { Caption, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { ReturnReductionSliderProps } from './ReturnReductionSlider'

export function ReturnReductionSlider({ value, onChange, disabled }: ReturnReductionSliderProps) {
  const { theme } = useTokens()
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs }}>
        <Text weight={700}>Start at {value}% of your weights</Text>
        <Caption>{100 - value}% lighter</Caption>
      </View>
      <input
        type="range"
        aria-label="Starting weight"
        min={50}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%', minHeight: 44, accentColor: theme.primaryFill }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Caption>50% · much lighter</Caption>
        <Caption>100% · where you left off</Caption>
      </View>
    </View>
  )
}
