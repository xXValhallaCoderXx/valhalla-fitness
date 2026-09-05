/**
 * Native port of the web RestTimerPill — the only ticking part of the rest
 * timer. Recomputes remaining time from the wall-clock endsAt every 250ms
 * (display-only; no drift), fires the cue once at zero, then dismisses.
 */
import { useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus, X } from 'lucide-react-native'
import { formatRest, remaining } from '@sheetless/domain/session/rest-timer'
import { SectionLabel, Text } from '@/components'
import { playRestCompleteCue } from '@/lib/rest-cue'
import { cardShadow, spacing, useTokens } from '@/lib/tokens'
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

  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: 'center',
        bottom: insets.bottom + spacing.md,
        left: 0,
        position: 'absolute',
        right: 0,
      }}
      testID="rest-timer-pill"
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.surface,
          borderColor: theme.primaryFill,
          borderRadius: 999,
          borderWidth: 1,
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.xs + 2,
          paddingVertical: spacing.xs + 2,
          ...cardShadow(theme),
        }}
      >
        <Pressable
          onPress={dismiss}
          accessibilityLabel="Skip rest"
          testID="rest-timer-skip"
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: theme.surface2,
            borderRadius: 18,
            height: 36,
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
            width: 36,
          })}
        >
          <X size={16} color={theme.textMuted} />
        </Pressable>

        <View style={{ alignItems: 'center', minWidth: 80 }}>
          <SectionLabel>Rest{label ? ` · ${label}` : ''}</SectionLabel>
          <Text size="lg" weight={900}>
            {formatRest(secondsLeft)}
          </Text>
        </View>

        <Pressable
          onPress={() => addTime(15)}
          accessibilityLabel="Add 15 seconds"
          testID="rest-timer-add"
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: theme.primaryFill,
            borderRadius: 18,
            flexDirection: 'row',
            gap: 2,
            height: 36,
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
            paddingHorizontal: spacing.sm,
          })}
        >
          <Plus size={14} color={theme.primaryFillText} />
          <Text size="sm" style={{ color: theme.primaryFillText, fontWeight: '800' }}>
            15s
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
