/** Native port of web FocusComingUp: peek at the next 1–2 exercises, tap to jump. */
import { Pressable, View } from 'react-native'
import { Check, ChevronRight } from 'lucide-react-native'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { movementCompletedSets } from '@sheetless/domain/session/live-focus-utils'
import { isMovementComplete } from '@sheetless/domain/session/live-session-utils'
import { Caption, SectionLabel, Text } from '@/components'
import { cardShadow, radii, spacing, useTokens, type Theme } from '@/lib/tokens'

export function FocusComingUp({
  movements,
  onJumpTo,
}: {
  movements: MovementSlot[]
  onJumpTo: (movementId: string) => void
}) {
  const { theme } = useTokens()
  if (!movements.length) return null
  return (
    <View style={{ gap: spacing.xs }}>
      <SectionLabel>Coming up</SectionLabel>
      {movements.map((movement) => (
        <Pressable
          key={movement.id}
          onPress={() => onJumpTo(movement.id)}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderColor: theme.cardBorder,
            borderRadius: radii.lg,
            borderWidth: 1,
            flexDirection: 'row',
            gap: spacing.sm,
            opacity: pressed ? 0.8 : 1,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
            ...cardShadow(theme),
          })}
        >
          <NumberBadge theme={theme} number={movement.orderIndex + 1} complete={isMovementComplete(movement)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" weight={700} numberOfLines={1}>
              {movement.movementName}
            </Text>
            <Caption numberOfLines={1}>{movement.targetSummary}</Caption>
          </View>
          <Text size="xs" style={{ color: theme.textMuted, fontWeight: '700' }}>
            {movementCompletedSets(movement)}/{movement.sets.length}
          </Text>
          <ChevronRight size={16} color={theme.textMuted} />
        </Pressable>
      ))}
    </View>
  )
}

function NumberBadge({ theme, number, complete }: { theme: Theme; number: number; complete: boolean }) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: complete ? theme.tones.success.text : theme.surface2,
        borderRadius: 10,
        height: 20,
        justifyContent: 'center',
        width: 20,
      }}
    >
      {complete ? (
        <Check size={10} color="#ffffff" />
      ) : (
        <Text size="xs" style={{ color: theme.textMuted, fontWeight: '700' }}>
          {number}
        </Text>
      )}
    </View>
  )
}
