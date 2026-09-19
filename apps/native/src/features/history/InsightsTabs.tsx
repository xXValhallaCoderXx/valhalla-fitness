import type { HistoryTab } from '@sheetless/domain/history/history-tabs'
import { INSIGHT_RANGES, insightRangeLabels, type InsightRange } from '@sheetless/domain/history/insight-ranges'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { InsightsStrength } from './strength/InsightsStrength'
import { InsightsBodyLoad } from './muscle-fatigue/InsightsBodyLoad'
import { useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type {
  HistoryDashboardWithInsights,
  InsightGating,
  RecentHistoryEntry,
} from '@sheetless/domain/history/types'
import type { SessionFilter } from '@sheetless/domain/history/insights'
import { Button, Heading, SegmentedControl } from '@/components'
import { useExperienceMode } from '@/lib/experience-mode'
import { insightTabLabel } from '@sheetless/domain/history/insight-labels'
import { InsightsLibrary } from './InsightsLibrary'
import { spacing } from '@/lib/tokens'
import { InsightsMovements } from './movements/InsightsMovements'
import { InsightsOverview } from './overview/InsightsOverview'
import { InsightsRecords } from './records/InsightsRecords'
import { InsightsSessions } from './sessions/InsightsSessions'
import { SessionSummarySheet } from './sessions/SessionSummarySheet'

type InsightTab = HistoryTab

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
  const { mode } = useExperienceMode()

  return (
    <View style={{ gap: spacing.md }}>
      {tab !== 'overview' ? <View style={{ gap: spacing.sm }}>
        <Button label="Back to overview" variant="subtle" onPress={() => setTab('overview')} />
        <Heading order={2}>{insightTabLabel(tab, mode)}</Heading>
      </View> : null}

      {tab === 'overview' || tab === 'strength' ? <SegmentedControl
        options={INSIGHT_RANGES.map((value) => ({ value, label: insightRangeLabels[value] }))}
        value={range} onChange={setRange} accessibilityLabel="Insights range" variant="segments" /> : null}
      {tab === 'strength' ? <InsightsStrength insights={data.insights} gating={gating} range={range} user={user} /> : null}
      {tab === 'body-load' ? <InsightsBodyLoad data={data} gating={gating} /> : null}
      {tab === 'overview' ? (
        <>
        <InsightsLibrary onOpen={setTab} />
        <InsightsOverview data={data} gating={gating} recent={recent} range={range} user={user}
          programOverview={programOverview} onOpenSession={setSelectedSessionId} onNavigate={setTab} />
        </>
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
