import { useEffect, type ReactNode } from 'react'
import { BackHandler, Keyboard, Pressable, ScrollView, View } from 'react-native'
import { router, useIsFocused } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Heading, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

/** Full-screen browsing keeps the originating tab mounted underneath it. */
export function TemplatesLayout({ children, title, backLabel = 'Plan', onBack, footer, contentKey }: {
  children: ReactNode
  title?: string
  backLabel?: string
  onBack?: () => void
  footer?: ReactNode
  contentKey?: string
}) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const focused = useIsFocused()
  const goBack = onBack ?? (() => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/program')
  })
  useEffect(() => {
    if (!focused) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Keyboard.isVisible() || router.canGoBack()) return false
      if (onBack) onBack()
      else router.replace('/(tabs)/program')
      return true
    })
    return () => subscription.remove()
  }, [focused, onBack])
  return <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top,
    paddingBottom: footer ? 0 : insets.bottom }}>
    <View style={{ backgroundColor: theme.backgroundElevated, borderBottomWidth: 1, borderColor: theme.border,
      paddingHorizontal: spacing.md, paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right }}>
      <Pressable accessibilityRole="button" accessibilityLabel={backLabel === 'Back' ? 'Back' : `Back to ${backLabel}`} onPress={goBack}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <ChevronLeft color={theme.text} size={20} /><Text size="sm" weight={800}>{backLabel}</Text>
      </Pressable>
    </View>
    <ScrollView key={contentKey} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={{ alignSelf: 'center', maxWidth: 560, width: '100%', gap: spacing.md,
        padding: spacing.md, paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right,
        paddingBottom: spacing.lg }}>
      {title ? <Heading order={1}>{title}</Heading> : null}
      {children}
    </ScrollView>
    {footer ? <View style={{ backgroundColor: theme.backgroundElevated, borderTopWidth: 1, borderColor: theme.border,
      padding: spacing.md, paddingBottom: spacing.md + insets.bottom }}>
      <View style={{ alignSelf: 'center', maxWidth: 560, width: '100%', gap: spacing.sm }}>{footer}</View>
    </View> : null}
  </View>
}
