import type { HistoryTab } from '@sheetless/domain/history/history-tabs'
import { INSIGHT_RANGES, insightRangeLabels, type InsightRange } from '@sheetless/domain/history/insight-ranges'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { InsightsStrength } from './InsightsStrength'
import { InsightsBodyLoad } from './InsightsBodyLoad'
import { useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type {
  HistoryDashboardWithInsights,
  InsightGating,
  RecentHistoryEntry,
} from '@sheetless/domain/history/types'
import type { SessionFilter } from '@sheetless/domain/history/insights'
import { SegmentedControl } from '@/components'
import { spacing } from '@/lib/tokens'
import { InsightsMovements } from './InsightsMovements'
import { InsightsOverview } from './InsightsOverview'
import { InsightsRecords } from './InsightsRecords'
import { InsightsSessions } from './InsightsSessions'
import { SessionSummarySheet } from './SessionSummarySheet'

type InsightTab = HistoryTab
const tabs: Array<{ value: InsightTab; label: string }> = [
  { value: 'overview', label: 'Overview' }, { value: 'strength', label: 'Strength' },
  { value: 'body-load', label: 'Muscle Fatigue' }, { value: 'movements', label: 'Movements' },
  { value: 'records', label: 'Records' }, { value: 'sessions', label: 'Sessions' },
]

export function InsightsTabs({
  data,
  gating,
  recent,
  programOverview,
  user,
}: {
  data: HistoryDashboardWithInsights
  gating: InsightGating
  programOverview: ProgramOverview | null
  recent: RecentHistoryEntry[]
  user: User
}) {
  const [range, setRange] = useState<InsightRange>('8w')
  const [tab, setTab] = useState<InsightTab>('overview')
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  return (
    <View style={{ gap: spacing.md }}>
      <SegmentedControl
        options={tabs}
        value={tab}
        onChange={setTab}
        accessibilityLabel="Insights section"
      />

      {tab === 'overview' || tab === 'strength' ? <SegmentedControl
        options={INSIGHT_RANGES.map((value) => ({ value, label: insightRangeLabels[value] }))}
        value={range} onChange={setRange} accessibilityLabel="Insights range" variant="segments" /> : null}
      {tab === 'strength' ? <InsightsStrength insights={data.insights} gating={gating} range={range} user={user} /> : null}
      {tab === 'body-load' ? <InsightsBodyLoad data={data} gating={gating} /> : null}
      {tab === 'overview' ? (
        <InsightsOverview data={data} gating={gating} recent={recent} range={range} user={user}
          programOverview={programOverview} onOpenSession={setSelectedSessionId} onNavigate={setTab} />
      ) : null}
      {tab === 'sessions' ? (
        <InsightsSessions
          sessions={recent}
          filter={sessionFilter}
          onFilterChange={setSessionFilter}
          onOpen={setSelectedSessionId}
        />
      ) : null}
      {tab === 'records' ? <InsightsRecords records={data.bestSets} /> : null}
      {tab === 'movements' ? (
        <InsightsMovements movements={data.movementSummaries} units={data.insights.units} user={user} />
      ) : null}

      <SessionSummarySheet
        sessionId={selectedSessionId}
        user={user}
        onClose={() => setSelectedSessionId(null)}
      />
    </View>
  )
}
