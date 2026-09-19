import { Pressable, View } from 'react-native'
import { ChevronRight, Dumbbell, Activity, Trophy, History, TrendingUp } from 'lucide-react-native'
import type { HistoryTab } from '@sheetless/domain/history/history-tabs'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

const destinations = [
  { value: 'strength', title: 'Strength over time', detail: 'Lift trends, strength score and rep records', Icon: TrendingUp },
  { value: 'movements', title: 'Exercise progress', detail: 'Find a movement and explore your logged sets', Icon: Dumbbell },
  { value: 'body-load', title: 'Muscle workload', detail: 'Recent work and weekly sets by muscle', Icon: Activity },
  { value: 'records', title: 'Records', detail: 'Your best sets in available training history', Icon: Trophy },
  { value: 'sessions', title: 'Workout history', detail: 'Search, filter and revisit completed workouts', Icon: History },
] as const

export function InsightsLibrary({ onOpen }: { onOpen: (tab: HistoryTab) => void }) {
  const { theme } = useTokens()
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Explore your training</SectionLabel>
      <Panel>
        {destinations.map(({ value, title, detail, Icon }, index) => (
          <Pressable key={value} accessibilityRole="button" onPress={() => onOpen(value)}
            style={({ pressed }) => ({
              padding: spacing.md, minHeight: 64, flexDirection: 'row', alignItems: 'center',
              gap: spacing.sm, borderTopWidth: index ? 1 : 0, borderTopColor: theme.border,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon size={20} color={theme.tones.action.text} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text weight="700">{title}</Text>
              <Caption>{detail}</Caption>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </Pressable>
        ))}
      </Panel>
    </View>
  )
}
