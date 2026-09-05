import { View, type StyleProp, type ViewStyle } from 'react-native'
import { cardShadow, radii, useTokens } from '@/lib/tokens'

export interface PanelProps {
  children: React.ReactNode
  /** `panel` = elevated card; `inset` = recessed surface (mirrors web Panel). */
  surface?: 'panel' | 'inset'
  style?: StyleProp<ViewStyle>
}

/** Card container — mirrors the web `Panel` molecule. */
export function Panel({ children, surface = 'panel', style }: PanelProps) {
  const { theme } = useTokens()
  const inset = surface === 'inset'
  return (
    <View
      style={[
        {
          backgroundColor: inset ? theme.surface2 : theme.surface,
          borderColor: inset ? theme.border : theme.cardBorder,
          borderRadius: inset ? radii.md : radii.lg,
          borderWidth: 1,
        },
        inset ? null : cardShadow(theme),
        style,
      ]}
    >
      {children}
    </View>
  )
}
