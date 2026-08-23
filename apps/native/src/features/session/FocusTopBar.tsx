/** Native port of web FocusTopBar: ‹ Today · centre context · discard + Finish. */
import { Pressable, View } from 'react-native'
import { ChevronLeft, Trash2 } from 'lucide-react-native'
import type { PlannedSession } from '@sheetless/domain/session/types/session'
import { Badge, Caption, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function FocusTopBar({
  onBack,
  backDisabled,
  centerPrimary,
  centerSecondary,
  equipmentMode,
  finishLabel,
  finishDisabled,
  onFinish,
  discardDisabled,
  onDiscard,
}: {
  onBack: () => void
  backDisabled: boolean
  centerPrimary: string
  centerSecondary: string
  equipmentMode?: PlannedSession['equipmentMode']
  finishLabel: string
  finishDisabled: boolean
  onFinish: () => void
  discardDisabled: boolean
  onDiscard: () => void
}) {
  const { theme } = useTokens()
  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: theme.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        gap: spacing.xs,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 2,
      }}
    >
      <Pressable
        onPress={onBack}
        disabled={backDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: backDisabled }}
        testID="focus-back"
        style={({ pressed }) => ({
          alignItems: 'center',
          flexDirection: 'row',
          minHeight: 44,
          opacity: backDisabled ? 0.4 : pressed ? 0.6 : 1,
        })}
      >
        <ChevronLeft size={20} color={theme.textMuted} />
        <Text size="sm" style={{ color: theme.textMuted, fontWeight: '700' }}>
          Today
        </Text>
      </Pressable>

      <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
        <Text size="sm" weight={900} numberOfLines={1}>
          {centerPrimary}
        </Text>
        <Caption numberOfLines={1}>{centerSecondary}</Caption>
        {equipmentMode === 'free_weight' ? <Badge tone="neutral">Free weights</Badge> : null}
      </View>

      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
        <Pressable
          onPress={onDiscard}
          disabled={discardDisabled}
          accessibilityLabel="Discard workout"
          accessibilityRole="button"
          accessibilityState={{ disabled: discardDisabled }}
          testID="focus-discard"
          style={({ pressed }) => ({
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            minWidth: 44,
            opacity: discardDisabled ? 0.3 : pressed ? 0.6 : 1,
          })}
        >
          <Trash2 size={15} color={theme.tones.danger.text} />
        </Pressable>
        <Pressable
          onPress={onFinish}
          disabled={finishDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: finishDisabled }}
          testID="focus-finish"
          style={({ pressed }) => ({
            alignItems: 'center',
            borderRadius: radii.sm,
            justifyContent: 'center',
            minHeight: 44,
            opacity: finishDisabled ? 0.4 : pressed ? 0.6 : 1,
            paddingHorizontal: spacing.xs,
          })}
        >
          <Text size="sm" style={{ color: theme.tones.action.text, fontWeight: '700' }}>
            {finishLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
