/** Exercise navigation stays separate from set editing and tools. */
import { Pressable, View } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { Heading, SectionLabel } from '@/components'
import { spacing, useTokens, type Theme } from '@/lib/tokens'

export function FocusExerciseHeader({
  movement,
  ordinal,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  movement: MovementSlot
  ordinal: number
  total: number
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}) {
  const { theme } = useTokens()
  return (
    <View>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
        <ChevronButton theme={theme} dir="prev" disabled={!hasPrev} onPress={onPrev} />
        <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
          <SectionLabel tone="accent">{movement.role === 'main' ? 'Main lift' : movement.role} · {ordinal} of {total}</SectionLabel>
          <Heading order={2} style={{ marginTop: 4, textAlign: 'center' }} numberOfLines={2}>
            {movement.performedMovementName ?? movement.movementName}
          </Heading>
        </View>
        <ChevronButton theme={theme} dir="next" disabled={!hasNext} onPress={onNext} />
      </View>
    </View>
  )
}

function ChevronButton({
  theme,
  dir,
  disabled,
  onPress,
}: {
  theme: Theme
  dir: 'prev' | 'next'
  disabled: boolean
  onPress: () => void
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={dir === 'prev' ? 'Previous exercise' : 'Next exercise'}
      testID={dir === 'prev' ? 'focus-prev-exercise' : 'focus-next-exercise'}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 22,
        height: 44,
        justifyContent: 'center',
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
        width: 44,
      })}
    >
      <Icon size={18} color={theme.textMuted} />
    </Pressable>
  )
}
