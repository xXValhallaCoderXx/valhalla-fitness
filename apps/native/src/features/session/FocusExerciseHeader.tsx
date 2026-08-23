/**
 * Native port of web FocusExerciseHeader: prev/next chevrons around the movement
 * title, role pill, target summary, and the previous-comparable line. The web's
 * plate-calculator/history tool buttons are deferred to a later increment.
 */
import { Pressable, View } from 'react-native'
import { ChevronLeft, ChevronRight, History } from 'lucide-react-native'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatPreviousShort } from '@sheetless/domain/session/live-session-utils'
import { Badge, Caption, Heading, Text } from '@/components'
import { spacing, useTokens, type Theme } from '@/lib/tokens'

export function FocusExerciseHeader({
  movement,
  units,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onHistory,
}: {
  movement: MovementSlot
  units: Unit
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onHistory: () => void
}) {
  const { theme } = useTokens()
  const swapped = movement.performedMovementId && movement.performedMovementId !== movement.movementId
  return (
    <View>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
        <ChevronButton theme={theme} dir="prev" disabled={!hasPrev} onPress={onPrev} />
        <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
            <Badge tone={movement.role === 'main' ? 'accent' : 'neutral'}>{movement.role}</Badge>
            <Caption numberOfLines={1} style={{ flexShrink: 1 }}>
              {movement.targetSummary}
            </Caption>
          </View>
          <Heading order={2} style={{ marginTop: 4, textAlign: 'center' }} numberOfLines={2}>
            {movement.movementName}
          </Heading>
        </View>
        <ChevronButton theme={theme} dir="next" disabled={!hasNext} onPress={onNext} />
      </View>

      {swapped ? (
        <Caption style={{ color: theme.tones.warning.text, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
          Performed as {movement.performedMovementName}
        </Caption>
      ) : null}

      {movement.previous ? (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: 4,
            justifyContent: 'center',
            marginTop: 6,
          }}
        >
          <Caption>Previous comparable</Caption>
          <Text size="xs" weight={700}>
            {formatPreviousShort(movement.previous, units)}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel={`Open ${movement.performedMovementName ?? movement.movementName} history`}
        onPress={onHistory}
        style={({ pressed }) => ({
          alignItems: 'center',
          alignSelf: 'center',
          flexDirection: 'row',
          gap: 5,
          marginTop: spacing.xs,
          opacity: pressed ? 0.6 : 1,
          padding: 5,
        })}
        testID="focus-history"
      >
        <History color={theme.tones.action.text} size={15} />
        <Text size="sm" tone="action" weight={700}>History</Text>
      </Pressable>
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
        borderRadius: 18,
        borderWidth: 1,
        height: 36,
        justifyContent: 'center',
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
        width: 36,
      })}
    >
      <Icon size={18} color={theme.textMuted} />
    </Pressable>
  )
}
