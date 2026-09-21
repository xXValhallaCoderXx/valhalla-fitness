/**
 * Native port of the web RestTimerPill — the only ticking part of the rest
 * timer. Recomputes remaining time from the wall-clock endsAt every 250ms
 * (display-only; no drift), fires the cue once at zero, then dismisses.
 */
import { useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'
import { formatRest, remaining } from '@sheetless/domain/session/rest-timer'
import { Text } from '@/components'
import { playRestCompleteCue } from '@/lib/rest-cue'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { useRestTimerControls, useRestTimerState } from './rest-timer-context'

export function RestTimerPill() {
  const { endsAt, active, label } = useRestTimerState()
  const { addTime, dismiss } = useRestTimerControls()
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const [secondsLeft, setSecondsLeft] = useState(0)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!active || endsAt == null) return
    firedRef.current = false
    const update = () => {
      const left = remaining(endsAt, Date.now())
      setSecondsLeft(left)
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        playRestCompleteCue()
        dismiss()
      }
    }
    update()
    const id = setInterval(update, 250)
    return () => clearInterval(id)
  }, [active, endsAt, dismiss])

  if (!active || endsAt == null) return null
  const fill = theme.scheme === 'light' ? theme.text : theme.surfaceInset
  const ink = theme.scheme === 'light' ? theme.surface : theme.text
  return (
    <View style={{ backgroundColor: theme.background, paddingHorizontal: spacing.md, paddingBottom: insets.bottom + spacing.sm, paddingTop: spacing.xs }} testID="rest-timer-pill">
      <View style={{ backgroundColor: fill, borderRadius: radii.lg, flexDirection: 'row', flexWrap: 'wrap',
        alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
        <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 100 }}>
          <Text size="caption" weight={800} style={{ color: ink }}>REST{label ? ` · ${label}` : ''}</Text>
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
