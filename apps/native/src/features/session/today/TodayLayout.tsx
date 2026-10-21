import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Screen } from '@/components'
import { useTokens } from '@/lib/tokens'

/** Keep scrolled content clear of Android's transparent status bar. */
export function TodayLayout({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const { theme } = useTokens()
  return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.background }}>
    <Screen padTop={false}>{children}</Screen>
  </View>
}
