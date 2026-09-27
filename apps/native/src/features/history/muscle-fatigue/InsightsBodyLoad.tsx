import { View } from 'react-native'
import type { BodyRegionId, HistoryDashboardWithInsights } from '@sheetless/domain/history/types'
import { bodyLoadExplanation, bodyLoadTierLabels } from '@sheetless/domain/history/body-load'
import { Badge, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens, type ToneName } from '@/lib/tokens'
import { BodyLoadMap } from './BodyLoadMap'

export function InsightsBodyLoad({ data }: { data: HistoryDashboardWithInsights }) {
  const { theme } = useTokens()
  const rows = [...data.bodyLoad.regions].sort((a, b) => b.impactPercent - a.impactPercent).map(region => ({
    ...region, tone: (region.tier === 'high' ? 'danger' : region.tier === 'moderate' ? 'warning' : region.tier === 'low' ? 'action' : 'neutral') as ToneName,
  }))
  const styleFor = (id: BodyRegionId) => {
    const row = rows.find(item => item.regionId === id)
    return { fill: theme.tones[row?.tone ?? 'neutral'].text, opacity: 0.35 + (row?.impactPercent ?? 0) / 100 * 0.65 }
  }
  return <>
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Muscle fatigue · last 7 days</SectionLabel>
      <Caption>This window stays fixed when the chart range changes.</Caption>
      <BodyLoadMap label="Muscle fatigue map" styleFor={styleFor} />
      <Caption>{bodyLoadExplanation}</Caption>
    </Panel>
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Regions · most to least</SectionLabel>
      {rows.map(row => <View key={row.regionId} style={{ gap: spacing.xs, paddingVertical: spacing.xs }}>
        <Text weight={800}>{row.label} · {row.impactPercent}%</Text><Badge tone={row.tone}>{bodyLoadTierLabels[row.tier]}</Badge>
        <Caption>Involved in {row.recentSetCount} sets · {row.movementNames.join(', ') || 'No recent work'}</Caption>
        {row.lastTrainedAt ? <Caption>Last trained {row.lastTrainedAt}</Caption> : null}
      </View>)}
      <Caption>Involved sets overlap across regions and cannot be added together.</Caption>
    </Panel>
  </>
}
