import { View } from 'react-native'
import { Caption, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { ReturnReductionSliderProps } from './ReturnReductionSlider'

export function ReturnReductionSlider({ value, onChange, disabled }: ReturnReductionSliderProps) {
  const { theme } = useTokens()
  return (
    <View style={{ gap: spacing.xs }}>
      <Text weight={700}>Starting weight · {value}%</Text>
      <Caption>{100 - value}% lighter. Your workout weights update together.</Caption>
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
        <Caption>50% · lighter</Caption>
        <Caption>100% · current</Caption>
      </View>
    </View>
  )
}
