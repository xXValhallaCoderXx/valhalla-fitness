import { useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type {
  HistoryDashboardWithInsights,
  InsightGating,
  RecentHistoryEntry,
  TodayHistorySupport,
} from '@sheetless/domain/history/types'
import type { SessionFilter } from '@sheetless/domain/history/insights'
import { SegmentedControl } from '@/components'
import { spacing } from '@/lib/tokens'
import { InsightsMovements } from './InsightsMovements'
import { InsightsOverview } from './InsightsOverview'
import { InsightsRecords } from './InsightsRecords'
import { InsightsSessions } from './InsightsSessions'
import { SessionSummarySheet } from './SessionSummarySheet'

type InsightTab = 'overview' | 'sessions' | 'records' | 'movements'

const tabs: Array<{ value: InsightTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'records', label: 'Records' },
  { value: 'movements', label: 'Movements' },
]

export function InsightsTabs({
  data,
  gating,
  recent,
  support,
  user,
}: {
  data: HistoryDashboardWithInsights
  gating: InsightGating
  recent: RecentHistoryEntry[]
  support?: TodayHistorySupport
  user: User
}) {
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

      {tab === 'overview' ? (
        <InsightsOverview data={data} gating={gating} recent={recent} support={support} />
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
