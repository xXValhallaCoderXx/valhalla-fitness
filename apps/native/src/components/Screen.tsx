import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing, useTokens } from '@/lib/tokens'

export interface ScreenProps {
  children: React.ReactNode
  /** Scrollable by default; set false for screens that manage their own scroll. */
  scroll?: boolean
  /** Content column cap, mirroring the web `Page` gutter wrapper. */
  maxWidth?: number
  style?: StyleProp<ViewStyle>
}

/** Route shell: themed background, safe-area bottom padding, centered column. */
export function Screen({ children, scroll = true, maxWidth = 560, style }: ScreenProps) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const content: StyleProp<ViewStyle> = [
    {
      alignSelf: 'center',
      gap: spacing.md,
      maxWidth,
      padding: spacing.md,
      paddingBottom: spacing.md + insets.bottom,
      width: '100%',
    },
    style,
  ]

  if (!scroll) {
    return <View style={[{ backgroundColor: theme.background, flex: 1 }]}>{<View style={content}>{children}</View>}</View>
  }
  return (
    <ScrollView
      style={{ backgroundColor: theme.background, flex: 1 }}
      contentContainerStyle={content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  )
}
