import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronLeft, Clock3, Ellipsis, List, type LucideIcon } from 'lucide-react-native'
import { BrandMark, Button, Caption, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function FocusTopBar({ title, subtitle, overview, startedAt, busy, finishBlocked, onBack, onMenu, onFinish }: {
  title: string; subtitle: string; overview: boolean; startedAt?: string | null; busy: boolean; finishBlocked: boolean
  onBack: () => void; onMenu: () => void; onFinish: () => void
}) {
  const { theme } = useTokens()
  return <View style={{ minHeight: 54, paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: overview ? theme.backgroundElevated : theme.background, borderBottomColor: theme.border, borderBottomWidth: overview ? 1 : 0,
    flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    {overview ? <>
      <HeaderButton icon={ChevronLeft} label="Back to Today" onPress={onBack} disabled={busy} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight={800} numberOfLines={2}>{title}</Text>
        {subtitle ? <Caption>{subtitle}</Caption> : null}
      </View>
      <Button label="Finish" variant="subtle" disabled={finishBlocked} onPress={onFinish}
        testID="focus-finish" style={{ paddingHorizontal: spacing.xs }} />
      <HeaderButton icon={Ellipsis} label="Workout menu" onPress={onMenu} />
    </> : <>
      <HeaderButton icon={List} label="Back to Overview" onPress={onBack} disabled={busy} />
      <Pressable accessibilityRole="button" accessibilityLabel="Workout menu" onPress={onMenu}
        style={{ flex: 1, minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <BrandMark size={28} /><Text weight={800}>sheetless</Text><Text size="caption" weight={800} tone="action">FOCUS</Text>
        <Ellipsis size={12} color={theme.textMuted} />
      </Pressable>
      <WorkoutElapsed startedAt={startedAt} />
    </>}
  </View>
}

function WorkoutElapsed({ startedAt }: { startedAt?: string | null }) {
  const { theme } = useTokens()
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const start = startedAt ? Date.parse(startedAt) : NaN
  const seconds = Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 1000)) : null
  const label = seconds == null ? '—' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return <View accessible accessibilityLabel={`Workout elapsed time ${label}`} style={{ minHeight: 44,
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.xs, borderRadius: 22, backgroundColor: theme.surface2 }}>
    <Clock3 size={12} color={theme.textMuted} /><Text size="xs" weight={800}>{label}</Text>
  </View>
}

function HeaderButton({ icon: Icon, label, onPress, disabled }: {
  icon: LucideIcon; label: string; onPress: () => void; disabled?: boolean
}) {
  const { theme } = useTokens()
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    onPress={onPress} disabled={disabled} style={({ pressed }) => ({ minWidth: 44, minHeight: 44,
      alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
    <Icon size={20} color={theme.textMuted} />
  </Pressable>
}
