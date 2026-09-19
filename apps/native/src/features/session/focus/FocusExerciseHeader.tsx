/**
 * Native port of web FocusExerciseHeader: prev/next chevrons around the movement
 * title, role pill, target summary, and the previous-comparable line. Movement
 * actions live in FocusMovementTools directly below this header.
 */
import { Pressable, View } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatPreviousHero } from '@sheetless/domain/session/today-numbers'
import { Badge, Caption, Heading } from '@/components'
import { spacing, useTokens, type Theme } from '@/lib/tokens'
import { useExperienceMode } from '@/lib/experience-mode'

export function FocusExerciseHeader({
  movement,
  units,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  movement: MovementSlot
  units: Unit
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}) {
  const { theme } = useTokens()
  const { mode, isFull } = useExperienceMode()
  const previous = formatPreviousHero(movement.previous, units, mode)
  const swapped = movement.performedMovementId && movement.performedMovementId !== movement.movementId
  return (
    <View>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
        <ChevronButton theme={theme} dir="prev" disabled={!hasPrev} onPress={onPrev} />
        <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Badge tone="neutral">{movement.role === 'main' ? 'Main lift' : movement.role === 'variation' ? 'Variation' : 'Accessory'}</Badge>
          <Heading order={2} style={{ marginTop: 4, textAlign: 'center' }}>
            {movement.performedMovementName ?? movement.movementName}
          </Heading>
          <Caption style={{ textAlign: 'center' }}>{isFull ? movement.targetSummary : `${movement.sets.length} sets`}</Caption>
        </View>
        <ChevronButton theme={theme} dir="next" disabled={!hasNext} onPress={onNext} />
      </View>

      {swapped ? (
        <Caption style={{ color: theme.tones.warning.text, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
          Replaces {movement.movementName}
        </Caption>
      ) : null}

      {previous ? (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
            justifyContent: 'center',
            marginTop: 6,
          }}
        >
          <Caption style={{ textAlign: 'center' }}>{previous}</Caption>
        </View>
      ) : null}
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
      accessibilityLabel={dir === 'prev' ? 'Previous exercise' : 'Next exercise'}
      testID={dir === 'prev' ? 'focus-prev-exercise' : 'focus-next-exercise'}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderRadius: 22,
        borderWidth: 1,
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
