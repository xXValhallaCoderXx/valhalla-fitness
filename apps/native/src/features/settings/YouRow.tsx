import { Pressable, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { Caption, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function YouRow({ title, subtitle, value, onPress, disabled = false }: {
  title: string; subtitle?: string; value?: string; onPress: () => void; disabled?: boolean
}) {
  const { theme } = useTokens()
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
    accessibilityState={{ disabled }} style={({ pressed }) => ({ padding: spacing.md, minHeight: 60,
      flexDirection: 'row', gap: spacing.sm, alignItems: 'center', borderRadius: radii.lg,
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
    <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
      <Text weight={800}>{title}</Text>
      {subtitle ? <Caption>{subtitle}</Caption> : null}
      {value ? <Text size="sm" tone="action">{value}</Text> : null}
    </View>
    <ChevronRight size={20} color={theme.textMuted} />
  </Pressable>
}
