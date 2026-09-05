import { Pressable, View } from 'react-native'
import { formatCategoryLabel, formatEquipmentLabel } from '@sheetless/domain/session/live-session-utils'
import { Badge, Caption, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import type { MovementPickerOption } from './MovementPicker'

export function MovementPickerOptionRow({
  option,
  selected,
  disabled,
  onPress,
}: {
  option: MovementPickerOption
  selected: boolean
  disabled: boolean
  onPress: () => void
}) {
  const { theme } = useTokens()
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? theme.tones.action.soft : theme.surface2,
        borderColor: selected ? theme.primaryFill : theme.border,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.xs,
        minHeight: 64,
        opacity: disabled ? 0.55 : pressed ? 0.75 : 1,
        padding: spacing.sm,
      })}
      testID={`movement-option-${option.movementId}`}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <Text size="sm" weight={900} numberOfLines={2}>{option.movementName}</Text>
          <Caption>
            {option.relationshipLabel
              ? `${option.relationshipLabel} · ${formatCategoryLabel(option.category)}`
              : formatCategoryLabel(option.category)}
          </Caption>
        </View>
        {option.source ? <Badge>{sourceLabel(option.source)}</Badge> : null}
        {option.defaultUnit ? <Badge>{option.defaultUnit}</Badge> : null}
      </View>
      {option.equipment.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {option.equipment.map((item) => <Badge key={item}>{formatEquipmentLabel(item)}</Badge>)}
        </View>
      ) : null}
    </Pressable>
  )
}

export function MovementPickerCategoryChip({
  label,
  count,
  selected,
  disabled,
  onPress,
}: {
  label: string
  count: number
  selected: boolean
  disabled: boolean
  onPress: () => void
}) {
  const { theme } = useTokens()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? theme.tones.action.soft : theme.surface,
        borderColor: selected ? theme.primaryFill : theme.border,
        borderRadius: 22,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 5,
        minHeight: 44,
        opacity: disabled ? 0.55 : pressed ? 0.7 : 1,
        paddingHorizontal: spacing.md,
      })}
    >
      <Text size="xs" weight={800} tone={selected ? 'action' : 'dimmed'}>{label}</Text>
      <Caption tone={selected ? 'action' : 'dimmed'}>{count}</Caption>
    </Pressable>
  )
}

function sourceLabel(source: NonNullable<MovementPickerOption['source']>) {
  if (source === 'default') return 'Default'
  return source === 'rule' ? 'Suggested' : 'Related'
}
