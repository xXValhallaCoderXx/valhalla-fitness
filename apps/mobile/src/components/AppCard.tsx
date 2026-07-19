import { useAppTheme } from '@/theme/useAppTheme'
import { radius } from '@sheetless/tokens'
import type { PropsWithChildren } from 'react'
import { StyleSheet, View } from 'react-native'

export function AppCard({ children }: PropsWithChildren) {
  const { colors } = useAppTheme()
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
})
