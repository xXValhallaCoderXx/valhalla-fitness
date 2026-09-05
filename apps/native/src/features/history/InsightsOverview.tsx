import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { HistoryDashboardWithInsights, InsightGating, RecentHistoryEntry } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import type { HistoryTab } from '@sheetless/domain/history/history-tabs'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { dataLifecycleLabels } from '@sheetless/domain/history/insight-state'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Badge, Button, Caption, EmptyState, Panel, SectionLabel, StatCard, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { InsightSignals } from './InsightSignals'
import { BodyweightTrendCard } from './BodyweightTrendCard'
import { StrengthScorePanel } from './StrengthScorePanel'
import { WeeklyVolumePanel } from './WeeklyVolumePanel'
import { TrainingHealth } from './TrainingHealth'
import { InsightRecentLinks } from './InsightRecentLinks'

export function InsightsOverview({ data, gating, recent, range, user, programOverview, onOpenSession, onNavigate }: {
  data: HistoryDashboardWithInsights; gating: InsightGating; recent: RecentHistoryEntry[]
  range: InsightRange; user: User; programOverview: ProgramOverview | null
  onOpenSession: (id: string) => void; onNavigate: (tab: HistoryTab) => void
}) {
  const pulse = gating.planState
  const position = programOverview?.position
  return <>
    <BodyweightTrendCard insights={data.insights} range={range} />
    {gating.lifecycle === 'empty' ? <EmptyState title="No workouts yet">Finish a workout to start your training insights.</EmptyState> : <>
      <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
        <Badge tone="neutral">{dataLifecycleLabels[gating.lifecycle]}</Badge>
        <Caption>Training analytics use up to 240 recent workouts. All shows all available data for each metric.</Caption>
        {gating.staleWelcomeBack ? <Text size="sm">Welcome back. These numbers describe your earlier training; log new sessions for a fresh read.</Text> : null}
      </Panel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <StatCard label="Available workouts" value={String(data.overview.completedSessions)} />
        <StatCard label="Logged sets" value={String(data.overview.loggedSets)} />
        <StatCard label="Volume" value={`${formatNumber(data.overview.completedVolume)} ${data.insights.units ?? ''}`} />
        <StatCard label="Movements" value={String(data.overview.uniqueMovements)} />
      </View>
      {gating.lifecycle === 'cold_start' ? <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <Text weight={900}>First session logged</Text>
        <Caption>Volume: 2 sessions. Strength trends: 4 sessions on a big lift. Consistency: 2 weeks. Muscle balance: about 20 sets.</Caption>
      </Panel> : <>
        <StrengthScorePanel insights={data.insights} gating={gating} range={range} user={user} />
        <Button label="See lift trends" variant="subtle" onPress={() => onNavigate('strength')} />
        <WeeklyVolumePanel insights={data.insights} gating={gating} range={range} />
        <TrainingHealth insights={data.insights} gating={gating} />
        <InsightSignals insights={data.insights} gating={gating} range={range} />
      </>}
      {programOverview?.activeProgram ? <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Programme context</SectionLabel><Text weight={800}>{programOverview.activeProgram.title}</Text>
        <Caption>{pulse === 'active_deload' ? 'Deload week: lighter on purpose.' : pulse === 'active_week1' ? 'Week 1: building your baseline.'
          : pulse === 'completed' ? 'Block complete. Review what changed before your next plan.' : pulse === 'paused' ? 'Programme paused.'
          : position ? `Week ${position.weekNumber} of ${position.totalWeeks} · session ${position.sessionNumber} · ${position.progressPercent}% through the block.` : 'Active programme'}</Caption>
      </Panel> : null}
      <InsightRecentLinks data={data} recent={recent} onOpenSession={onOpenSession} onNavigate={onNavigate} />
    </>}
  </>
}
