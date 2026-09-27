import { Pressable, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { Caption, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function InsightLink({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  const { theme } = useTokens()
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
    {({ pressed }) => <Panel style={{ padding: spacing.md, opacity: pressed ? 0.7 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xs }}><Text weight={800}>{title}</Text><Caption>{detail}</Caption></View>
        <ChevronRight size={20} color={theme.textMuted} />
      </View>
    </Panel>}
  </Pressable>
}
