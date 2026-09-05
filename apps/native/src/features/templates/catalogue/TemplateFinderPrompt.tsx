import { View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { Button, Caption, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TemplateFinderPrompt({ onOpen }: { onOpen: () => void }) {
  const { theme } = useTokens()
  return (
    <Panel
      style={{
        borderColor: theme.tones.action.border,
        gap: spacing.md,
        padding: spacing.md,
      }}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.tones.action.soft,
            borderColor: theme.tones.action.border,
            borderRadius: 12,
            borderWidth: 1,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <Sparkles color={theme.tones.action.text} size={20} />
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <Text size="sm" weight={800}>Not sure where to start?</Text>
          <Caption>Answer three quick questions and we’ll pick a plan for you.</Caption>
        </View>
      </View>
      <Button
        label="Find my plan"
        leftSection={<Sparkles color={theme.primaryFillText} size={16} />}
        fullWidth
        style={{ minHeight: 44 }}
        onPress={onOpen}
        testID="find-my-plan-open"
      />
    </Panel>
  )
}
