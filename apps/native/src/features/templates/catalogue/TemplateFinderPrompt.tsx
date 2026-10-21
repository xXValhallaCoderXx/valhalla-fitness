import { Pressable, View } from 'react-native'
import { ArrowRight, Sparkles } from 'lucide-react-native'
import { Caption, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function TemplateFinderPrompt({ onOpen }: { onOpen: () => void }) {
  const { theme } = useTokens()
  return <Pressable accessibilityRole="button" accessibilityLabel="Find my plan" onPress={onOpen}
    testID="find-my-plan-open" style={({ pressed }) => ({ backgroundColor: theme.tones.action.soft,
      borderColor: theme.tones.action.border, borderWidth: 1, borderRadius: radii.lg,
      padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.7 : 1 })}>
    <View style={{ backgroundColor: theme.surface, padding: spacing.sm, borderRadius: radii.md }}>
      <Sparkles color={theme.tones.action.text} size={22} />
    </View>
    <View style={{ flex: 1, gap: 3 }}>
      <Text size="sm" weight={800}>Find my plan</Text>
      <Caption>Three questions to find a plan that fits.</Caption>
    </View>
    <ArrowRight color={theme.tones.action.text} size={20} />
  </Pressable>
}
