import { Pressable, View } from 'react-native'
import { ChevronLeft, Ellipsis, Menu, X, type LucideIcon } from 'lucide-react-native'
import { Button, Caption, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function FocusTopBar({ title, subtitle, overview, busy, finishBlocked, onBack, onMenu, onFinish }: {
  title: string; subtitle: string; overview: boolean; busy: boolean; finishBlocked: boolean
  onBack: () => void; onMenu: () => void; onFinish: () => void
}) {
  const { theme } = useTokens()
  return <View style={{ minHeight: 54, paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: theme.backgroundElevated, borderBottomColor: theme.border, borderBottomWidth: 1,
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
      <HeaderButton icon={Menu} label="Workout menu" onPress={onMenu} />
      <Text size="xs" tone="action" weight={800} align="center" style={{ flex: 1 }}>Focus</Text>
      <HeaderButton icon={X} label="Back to Overview" onPress={onBack} disabled={busy} />
    </>}
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
