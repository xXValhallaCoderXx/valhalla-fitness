import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Screen, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function PlanLayout({ children, backLabel, onBack, footer }: {
  children: ReactNode; backLabel?: string; onBack?: () => void; footer?: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { theme } = useTokens()
  return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.background }}>
    {onBack ? <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${backLabel ?? 'Plan'}`}
      onPress={onBack} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingHorizontal: spacing.md, backgroundColor: theme.backgroundElevated, borderBottomWidth: 1, borderColor: theme.border }}>
      <ChevronLeft size={20} color={theme.text} /><Text size="sm" weight={700}>{backLabel ?? 'Plan'}</Text>
    </Pressable> : null}
    <Screen padTop={false} style={{ padding: spacing.md, gap: spacing.md }}>{children}</Screen>
    {footer ? <View style={{ padding: spacing.md, borderTopWidth: 1, borderColor: theme.border,
      backgroundColor: theme.background }}>{footer}</View> : null}
  </View>
}
