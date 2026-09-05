import { Pressable, View } from 'react-native'
import { ArrowDown, ArrowUp, Check, ChevronRight, Trash2 } from 'lucide-react-native'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { movementCompletedSets } from '@sheetless/domain/session/live-focus-utils'
import { isMovementComplete } from '@sheetless/domain/session/live-session-utils'
import { Badge, Caption, Panel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function WorkoutOverviewRow({
  movement,
  ordinal,
  disabled,
  canMoveUp,
  canMoveDown,
  canRemove,
  onOpen,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  movement: MovementSlot
  ordinal: number
  disabled: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  canRemove: boolean
  onOpen: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const { theme } = useTokens()
  const complete = isMovementComplete(movement)
  const completedSets = movementCompletedSets(movement)
  const movementName = movement.performedMovementName ?? movement.movementName

  return (
    <Panel style={{ flexDirection: 'row', overflow: 'hidden' }}>
      <Pressable
        accessibilityLabel={`${movementName}, ${completedSets} of ${movement.sets.length} sets logged. Open in Focus.`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onOpen}
        testID={`overview-movement-${movement.id}`}
        style={({ pressed }) => ({
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          gap: spacing.sm,
          minHeight: 70,
          opacity: disabled ? 0.55 : pressed ? 0.75 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        })}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: complete ? theme.tones.success.text : theme.surface2,
            borderRadius: radii.md,
            height: 30,
            justifyContent: 'center',
            width: 30,
          }}
        >
          {complete ? (
            <Check color="#ffffff" size={15} />
          ) : (
            <Text size="sm" weight={800} tone="dimmed">
              {ordinal}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <Text size="sm" weight={800} numberOfLines={1}>
            {movementName}
          </Text>
          <Caption numberOfLines={1}>{movement.targetSummary || 'Log as you go'}</Caption>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
            <Badge tone={complete ? 'success' : 'neutral'}>
              {completedSets}/{movement.sets.length} sets
            </Badge>
            {movement.isAdded ? <Badge tone="accent">Added</Badge> : null}
          </View>
        </View>
        <ChevronRight color={theme.textMuted} size={18} />
      </Pressable>

      {canMoveUp || canMoveDown || canRemove ? (
        <View
          style={{
            borderLeftColor: theme.border,
            borderLeftWidth: 1,
            justifyContent: 'center',
            paddingHorizontal: 2,
          }}
        >
          {canMoveUp || canMoveDown ? (
            <View style={{ flexDirection: 'row' }}>
              <IconAction
                label={`Move ${movementName} up`}
                disabled={disabled || !canMoveUp}
                onPress={onMoveUp}
              >
                <ArrowUp color={theme.tones.action.text} size={17} />
              </IconAction>
              <IconAction
                label={`Move ${movementName} down`}
                disabled={disabled || !canMoveDown}
                onPress={onMoveDown}
              >
                <ArrowDown color={theme.tones.action.text} size={17} />
              </IconAction>
            </View>
          ) : null}
          {canRemove ? (
            <IconAction
              label={`Remove ${movementName}`}
              disabled={disabled}
              onPress={onRemove}
            >
              <Trash2 color={theme.tones.danger.text} size={16} />
            </IconAction>
          ) : null}
        </View>
      ) : null}
    </Panel>
  )
}

function IconAction({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string
  disabled: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={2}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        minWidth: 44,
        opacity: disabled ? 0.25 : pressed ? 0.55 : 1,
      })}
    >
      {children}
    </Pressable>
  )
}
