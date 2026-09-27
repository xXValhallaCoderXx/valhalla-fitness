import { View } from 'react-native'
import { bodyRegionLabels, bodyRegionOrder } from '@sheetless/domain/history/body-load'
import { adequacyExplanation, adequacyTierLabels, balanceSignalLabels, buildMovementBalance, buildRegionAdequacy, calendarRegionWeeks } from '@sheetless/domain/history/muscle-volume'
import { formatDateKey, startOfWeek } from '@sheetless/domain/history/history'
import { selectInsightWeeks } from '@sheetless/domain/history/insight-selectors'
import { INSIGHT_RANGES, insightRangeLabels } from '@sheetless/domain/history/insight-ranges'
import { Badge, Caption, Panel, SectionLabel, SegmentedControl, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { InsightsContentProps } from '../navigation/InsightsPage'
import { useInsightsState } from '../navigation/InsightsState'
import { InsightsBodyLoad } from './InsightsBodyLoad'

export function InsightsMuscles({ data }: InsightsContentProps) {
  const { state, update } = useInsightsState()
  const { theme } = useTokens()
  const insights = data.insights
  const view = state.muscleView
  const recent = calendarRegionWeeks(insights.weeklyRegionSets, insights.today)
  const balance = buildMovementBalance(recent, null)
  const adequacy = buildRegionAdequacy(insights.weeklyRegionSets, insights.today)
  const currentKey = formatDateKey(startOfWeek(new Date(`${insights.today}T00:00:00Z`)))
  const weeks = selectInsightWeeks(calendarRegionWeeks(insights.weeklyRegionSets, insights.today, null), insights, state.range)
  const selectedKey = view === 'this-week' ? currentKey : (weeks.some(week => week.weekStart === state.muscleWeek) ? state.muscleWeek! : weeks.at(-1)?.weekStart ?? currentKey)
  const selected = weeks.find(week => week.weekStart === selectedKey)
  const groups = [{ label: 'Push', value: balance.pushSets }, { label: 'Pull', value: balance.pullSets },
    { label: 'Legs', value: balance.legSets }, { label: 'Core', value: balance.coreSets }]
  const max = Math.max(1, ...groups.map(group => group.value))
  return <>
    <SegmentedControl options={[{ value: 'balance', label: 'Balance' }, { value: 'this-week', label: 'This week' },
      { value: 'by-week', label: 'By week' }, { value: 'fatigue', label: 'Fatigue' }]}
      value={view} onChange={muscleView => update({ muscleView })} accessibilityLabel="Muscle view" />
    {view === 'fatigue' ? <InsightsBodyLoad data={data} /> : view === 'balance' ? <>
      <Panel style={{ padding: spacing.md, gap: spacing.md }}>
        <SectionLabel>Balance · last four calendar weeks</SectionLabel>
        <Badge tone="neutral">{balanceSignalLabels[balance.signal]}</Badge>
        {groups.map(group => <View key={group.label} style={{ gap: spacing.xs }}>
          <Text weight={700}>{group.label} · {group.value} attributed sets</Text>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.surfaceInset }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.tones.action.text, width: `${group.value / max * 100}%` }} />
          </View>
        </View>)}
        <Caption>{balance.totalSets} completed sets across {balance.weeks} calendar weeks. Untrained weeks count as zero; this week is incomplete.</Caption>
        <Caption>Each set is split fractionally across the muscles involved. Grouped bars compare shares of your training; per-muscle target ranges do not apply to these groups.</Caption>
      </Panel>
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel>Per-muscle weekly sets · four-week window</SectionLabel>
        <Caption>{adequacyExplanation} This includes the incomplete current week.</Caption>
        {adequacy.insufficient ? <Caption>About 20 sets in this calendar window are needed for adequacy labels.</Caption> : null}
        {adequacy.regions.map(region => <View key={region.regionId} style={{ gap: spacing.xs }}>
          <Text weight={700}>{region.label} · {region.weeklySets} sets/week</Text>
          {!adequacy.insufficient ? <Caption>{adequacyTierLabels[region.tier]}</Caption> : null}
        </View>)}
      </Panel>
    </> : <>
      {view === 'by-week' ? <SegmentedControl options={INSIGHT_RANGES.map(value => ({ value, label: value === 'all' ? 'Loaded history' : insightRangeLabels[value] }))}
        value={state.range} onChange={range => update({ range })} accessibilityLabel="Muscle history range" /> : null}
      {view === 'by-week' ? <SegmentedControl options={weeks.map(week => ({ value: week.weekStart, label: week.weekLabel }))}
        value={selectedKey} onChange={muscleWeek => update({ muscleWeek })} accessibilityLabel="Muscle week" /> : null}
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel>Week of {selectedKey}</SectionLabel>
        {selectedKey === currentKey ? <Badge tone="neutral">Current week · incomplete</Badge> : null}
        <Caption>{selected?.totalSets ?? 0} completed sets. Fractional attribution shares each set across involved muscles.</Caption>
        {bodyRegionOrder.map(region => <Text key={region}>{bodyRegionLabels[region]} · {selected?.regionSets[region] ?? 0} sets</Text>)}
        {view === 'by-week' ? <Caption>Weeks follow the selected workout range. Only loaded history contributes.</Caption> : null}
      </Panel>
    </>}
  </>
}
