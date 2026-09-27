import { useRouter } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { HistoryInsights } from '@sheetless/domain/history/types'
import { Button, Caption, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function BodyweightPrompt({ insights }: { insights: HistoryInsights; user?: User }) {
  const router = useRouter()
  const hasWeight = insights.bodyweight.entries.some(entry => entry.recordedOn <= insights.today)
  const hasSex = insights.bodyweight.sex !== null
  if (hasWeight && hasSex) return null
  return <Panel surface="inset" style={{ padding: spacing.sm, gap: spacing.sm }}>
    <Text weight={800}>Optional strength comparisons</Text>
    <Caption>Bodyweight enables a multiple of bodyweight. Sex selects the supported DOTS curve. Without them, your recorded total stays available.</Caption>
    {!hasWeight ? <Button label="Log bodyweight in You" variant="default" onPress={() => router.push('/you/bodyweight')} /> : null}
    {!hasSex ? <Button label="Edit sex in You" variant="default" onPress={() => router.push('/you/sex')} /> : null}
  </Panel>
}
