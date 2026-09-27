import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import type { HistoryDashboardWithInsights } from '@sheetless/domain/history/types'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function InsightRecentLinks({ data, onOpenSession }: {
  data: HistoryDashboardWithInsights; onOpenSession: (id: string) => void
}) {
  const router = useRouter()
  const recent = [...data.bestSets].sort((a, b) => (b.performedAt ?? '').localeCompare(a.performedAt ?? '')).slice(0, 3)
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>Recent best sets · loaded history</SectionLabel>
    <Caption>Your strongest result for each movement, newest recorded dates first.</Caption>
    {recent.length ? recent.map(set => <Pressable key={set.id} accessibilityRole="button"
      accessibilityLabel={`Open ${set.movementName} source workout`} onPress={() => onOpenSession(set.sessionId)}>
      <View style={{ paddingVertical: spacing.xs, gap: 2 }}>
        <Text weight={800}>{set.movementName}</Text>
        <Text>{set.load == null ? 'Bodyweight' : formatWeight(set.load, set.units)} × {set.reps ?? '—'}</Text>
        <Caption>{set.performedAt} · {set.isBaseline ? 'Baseline' : 'Best recorded result'} · Open workout</Caption>
      </View>
    </Pressable>) : <Caption>No usable best sets yet. Completed bodyweight sets count too.</Caption>}
    <Button label="All your best sets" variant="subtle" onPress={() => router.push('/history/best-sets')} />
  </Panel>
}
