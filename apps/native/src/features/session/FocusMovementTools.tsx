import { Pressable, View } from 'react-native'
import { ArrowLeftRight, Calculator, History, Trash2 } from 'lucide-react-native'
import { Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export interface FocusMovementToolsProps {
  disabled?: boolean
  swapDisabled?: boolean
  swapDisabledReason?: string
  platesDisabled?: boolean
  showRemove?: boolean
  removeDisabled?: boolean
  onSwap: () => void
  onPlates: () => void
  onHistory: () => void
  onRemove?: () => void
}

/** Movement-specific 44dp tools placed directly below the Focus header. */
export function FocusMovementTools({
  disabled = false,
  swapDisabled = false,
  swapDisabledReason,
  platesDisabled = false,
  showRemove = false,
  removeDisabled = false,
  onSwap,
  onPlates,
  onHistory,
  onRemove,
}: FocusMovementToolsProps) {
  const { theme } = useTokens()
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      <ToolButton
        label="Swap"
        icon={<ArrowLeftRight color={theme.tones.action.text} size={17} />}
        disabled={disabled || swapDisabled}
        disabledReason={swapDisabledReason}
        onPress={onSwap}
      />
      <ToolButton
        label="Plates"
        icon={<Calculator color={theme.tones.action.text} size={17} />}
        disabled={disabled || platesDisabled}
        onPress={onPlates}
      />
      <ToolButton
        label="History"
        icon={<History color={theme.tones.action.text} size={17} />}
        disabled={disabled}
        onPress={onHistory}
      />
      {showRemove && onRemove ? (
        <ToolButton
          label="Remove"
          tone="danger"
          icon={<Trash2 color={theme.tones.danger.text} size={17} />}
          disabled={disabled || removeDisabled}
          onPress={onRemove}
        />
      ) : null}
    </View>
  )
}

function ToolButton({
  label,
  icon,
  tone = 'action',
  disabled,
  disabledReason,
  onPress,
}: {
  label: string
  icon: React.ReactNode
  tone?: 'action' | 'danger'
  disabled: boolean
  disabledReason?: string
  onPress: () => void
}) {
  const { theme } = useTokens()
  const colors = theme.tones[tone]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={disabled ? disabledReason : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: colors.soft,
        borderColor: colors.border,
        borderRadius: radii.md,
        borderWidth: 1,
        flex: 1,
        gap: 3,
        justifyContent: 'center',
        minHeight: 48,
        minWidth: 0,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        paddingHorizontal: 3,
      })}
    >
      {icon}
      <Text size="xs" weight={800} style={{ color: colors.text }} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}
