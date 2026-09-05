import { useState } from 'react'
import { View } from 'react-native'
import type { BodyRegionId, HistoryDashboardWithInsights, InsightGating } from '@sheetless/domain/history/types'
import { bodyLoadExplanation, bodyLoadTierLabels } from '@sheetless/domain/history/body-load'
import { ADEQUACY_HIGH_SETS, adequacyExplanation, adequacyTierLabels, buildRegionAdequacy } from '@sheetless/domain/history/muscle-volume'
import { Badge, Caption, Panel, SectionLabel, SegmentedControl, Text } from '@/components'
import { spacing, useTokens, type ToneName } from '@/lib/tokens'
import { BodyLoadMap } from './BodyLoadMap'

export function InsightsBodyLoad({ data, gating }: { data: HistoryDashboardWithInsights; gating: InsightGating }) {
  const [view, setView] = useState<'fatigue' | 'sets'>('fatigue')
  const { theme } = useTokens()
  const adequacy = buildRegionAdequacy(data.insights.weeklyRegionSets, data.insights.today)
  const setsGated = adequacy.insufficient || gating.lifecycle === 'empty' || gating.lifecycle === 'cold_start'
  const rows = view === 'fatigue' ? [...data.bodyLoad.regions].sort((a, b) => b.impactPercent - a.impactPercent).map((region) => ({
    id: region.regionId, label: region.label, value: `${region.impactPercent}%`, tier: bodyLoadTierLabels[region.tier],
    tone: (region.tier === 'high' ? 'danger' : region.tier === 'moderate' ? 'warning' : region.tier === 'low' ? 'action' : 'neutral') as ToneName,
    opacity: 0.35 + region.impactPercent / 100 * 0.65,
    detail: `${region.recentSetCount} recent sets · ${region.movementNames.join(', ') || 'No recent work'}`,
  })) : adequacy.regions.map((region) => ({
    id: region.regionId, label: region.label, value: `${region.weeklySets} sets/week`, tier: adequacyTierLabels[region.tier],
    tone: (region.tier === 'in_range' ? 'success' : region.tier === 'high' ? 'warning' : 'neutral') as ToneName,
    opacity: 0.35 + Math.min(region.weeklySets / ADEQUACY_HIGH_SETS, 1) * 0.65, detail: '',
  }))
  const styleFor = (id: BodyRegionId) => {
    const row = rows.find((item) => item.id === id)
    return { fill: theme.tones[row?.tone ?? 'neutral'].text, opacity: row?.opacity ?? 0.35 }
  }
  return <>
    <SegmentedControl options={[{ value: 'fatigue', label: 'Fatigue' }, { value: 'sets', label: 'Weekly sets' }]}
      value={view} onChange={setView} variant="segments" accessibilityLabel="Muscle map metric" />
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>{view === 'fatigue' ? 'Muscle fatigue · last 7 days' : 'Weekly set adequacy · last 4 weeks'}</SectionLabel>
      <Caption>These windows stay fixed when the chart range changes.</Caption>
      {view === 'sets' && setsGated ? <Caption>Your weekly-sets picture appears after about 20 recent logged sets.</Caption> : <>
        <BodyLoadMap label={view === 'fatigue' ? 'Muscle fatigue map' : 'Weekly sets map'} styleFor={styleFor} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {view === 'fatigue' ? <><Badge tone="danger">Worked hard</Badge><Badge tone="warning">Moderate</Badge><Badge tone="action">Light</Badge><Badge tone="neutral">Fresh</Badge></>
            : <><Badge tone="neutral">Could use more</Badge><Badge tone="success">On track</Badge><Badge tone="warning">High</Badge></>}
        </View>
      </>}
    </Panel>
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Regions · most to least</SectionLabel>
      <Caption>{view === 'fatigue' ? bodyLoadExplanation : adequacyExplanation}</Caption>
      {view !== 'sets' || !setsGated ? rows.map((row) => <View key={row.id} style={{ gap: 4, paddingVertical: spacing.xs }}>
        <Text weight={800}>{row.label} · {row.value}</Text><Badge tone={row.tone}>{row.tier}</Badge>
        {row.detail ? <Caption>{row.detail}</Caption> : null}
      </View>) : <Caption>Not enough recent sets to judge weekly volume yet.</Caption>}
    </Panel>
  </>
}
