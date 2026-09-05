import { useState } from 'react'
import { View } from 'react-native'
import { Caption, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export type ReturnReductionSliderProps = {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

/** Core-native slider: no new native module or development-client rebuild. */
export function ReturnReductionSlider({ value, onChange, disabled }: ReturnReductionSliderProps) {
  const { theme } = useTokens()
  const [width, setWidth] = useState(0)
  const update = (next: number) => {
    if (!disabled) onChange(Math.max(50, Math.min(100, Math.round(next))))
  }
  const fromTouch = (x: number) => {
    if (width) update(50 + (x / width) * 50)
  }
  return (
    <View style={{ gap: spacing.xs }}>
      <Text weight={700}>Starting weight · {value}%</Text>
      <Caption>{100 - value}% lighter. Your workout weights update together.</Caption>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Starting weight"
        accessibilityValue={{
          min: 50,
          max: 100,
          now: value,
          text: `${value}% of current references`,
        }}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          update(value + (event.nativeEvent.actionName === 'increment' ? 1 : -1))
        }
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => !disabled}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => fromTouch(event.nativeEvent.locationX)}
        onResponderMove={(event) => fromTouch(event.nativeEvent.locationX)}
        style={{ height: 48, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
      >
        <View
          pointerEvents="none"
          style={{ height: 6, backgroundColor: theme.border, borderRadius: 3 }}
        >
          <View
            style={{
              height: 6,
              width: `${(value - 50) * 2}%`,
              borderRadius: 3,
              backgroundColor: theme.primaryFill,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${(value - 50) * 2}%`,
            marginLeft: -12,
            height: 24,
            width: 24,
            borderRadius: 12,
            backgroundColor: theme.primaryFill,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Caption>50% · lighter</Caption>
        <Caption>100% · current</Caption>
      </View>
    </View>
  )
}
