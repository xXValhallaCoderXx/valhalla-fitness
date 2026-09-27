import type { ReactNode } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { useTokens } from '@/lib/tokens'
import { confirmed, setRingArcs } from './workout-display'

/** Decorative ring; the adjacent labelled controls provide the accessible set selection. */
export function FocusRing({ movement, selectedSetIndex, fraction, children }: {
  movement: MovementSlot; selectedSetIndex: number; fraction?: number; children: ReactNode
}) {
  const { theme } = useTokens()
  const circumference = 2 * Math.PI * 110
  return <View style={{ width: '100%', maxWidth: 308, aspectRatio: 1, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
    <Svg width="100%" height="100%" viewBox="0 0 240 240" accessible={false}
      style={{ position: 'absolute', top: 0, left: 0 }}>
      {fraction !== undefined ? <>
        <Circle cx={120} cy={120} r={110} fill="none" stroke={theme.border} strokeWidth={7} />
        <Circle cx={120} cy={120} r={110} fill="none" stroke={theme.primaryFill} strokeWidth={7}
          strokeLinecap="round" strokeDasharray={`${circumference * Math.max(0, Math.min(1, fraction))} ${circumference}`}
          transform="rotate(-90 120 120)" />
      </> : setRingArcs(movement.sets.length).map((d, index) => {
        const set = movement.sets[index]
        const color = set.syncState === 'syncFailed' ? theme.tones.danger.text : set.syncState === 'saving' ? theme.tones.warning.text
          : set.setIndex === selectedSetIndex ? theme.text : confirmed(set) ? theme.primaryFill : theme.border
        return <Path key={set.id} d={d} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
      })}
    </Svg>
    <View style={{ width: '76%', alignItems: 'center', gap: 4 }}>{children}</View>
  </View>
}
