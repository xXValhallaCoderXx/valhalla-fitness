/** Compact presenter; clock, expiry and notification ownership stay in the provider. */
import { Pressable, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { formatRest } from '@sheetless/domain/session/rest-timer'
import { Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { useRestTimerControls, useRestTimerState } from './rest-timer-context'

export function RestTimerPill() {
  const { endsAt, active, label, secondsLeft } = useRestTimerState()
  const { addTime, dismiss } = useRestTimerControls()
  const { theme } = useTokens()
  if (!active || endsAt == null) return null
  const fill = theme.scheme === 'light' ? theme.text : theme.surfaceInset
  const ink = theme.scheme === 'light' ? theme.surface : theme.text
  return (
    <View style={{ backgroundColor: theme.background, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs }} testID="rest-timer-pill">
      <View style={{ backgroundColor: fill, borderRadius: radii.lg, flexDirection: 'row', flexWrap: 'wrap',
        alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
        <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 100 }}>
          <Text size="caption" weight={800} style={{ color: ink }}>REST{label ? ` AFTER ${label}` : ''}</Text>
          <Text weight={800} style={{ color: ink, fontSize: 24 }}>{formatRest(secondsLeft)}</Text>
        </View>
        <Pressable onPress={() => addTime(15)} accessibilityRole="button" accessibilityLabel="Add 15 seconds" testID="rest-timer-add"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 64,
            borderRadius: radii.md, borderWidth: 1, borderColor: ink, paddingHorizontal: spacing.sm, opacity: pressed ? 0.7 : 1 })}>
          <Plus size={16} color={ink} /><Text weight={800} style={{ color: ink }}>15s</Text>
        </Pressable>
        <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Skip rest" testID="rest-timer-skip"
          style={({ pressed }) => ({ minHeight: 48, minWidth: 48, borderRadius: radii.md, backgroundColor: ink,
            paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Text weight={800} style={{ color: fill }}>Skip</Text>
        </Pressable>
      </View>
    </View>
  )
}
