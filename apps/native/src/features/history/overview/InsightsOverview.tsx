import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { filterToRange, type InsightRange } from '@sheetless/domain/history/insight-ranges'
import { lockedInsightSteps, resolveInsightGates } from '@sheetless/domain/history/insight-gates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Caption, EmptyState, Panel, SectionLabel, StatCard, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import type { InsightsContentProps } from '../navigation/InsightsPage'
import { StrengthScorePanel } from '../strength/StrengthScorePanel'
import { BodyweightTrendCard } from '../bodyweight/BodyweightTrendCard'
import { InsightLink } from './InsightLink'
import { InsightRecentLinks } from './InsightRecentLinks'
import { LiftComparisons } from './LiftComparisons'
import { WeeklyVolumePanel } from './WeeklyVolumePanel'
import { ConsistencyPanel } from './TrainingHealth'
import { Milestones } from './InsightSignals'

export function InsightsOverview({ data, gating, user, advanced, range, onOpenSession }: InsightsContentProps & { range: InsightRange }) {
  const router = useRouter()
  const insights = data.insights
  const sessions = filterToRange(data.recentSessions, range, { firstDataDate: insights.firstSessionDate,
    now: insights.today, getDate: session => session.scheduledDate })
  const gates = resolveInsightGates(insights)
  const locked = lockedInsightSteps(gates)
  return <>
    {gating.lifecycle === 'empty' ? <EmptyState title="Your training story starts here">
      Completed workouts will appear here. Each metric builds from the sets and dates you record.
    </EmptyState> : null}
    {gating.staleWelcomeBack ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text weight={800}>Your history is still here</Text>
      <Caption>Last workout logged: {data.overview.latestTrainingDate}. These are recorded results. There are no new strength readings during your break.</Caption>
    </Panel> : null}
    <StrengthScorePanel insights={insights} gating={gating} range={range} user={user} compact advanced={advanced} />
    <InsightLink title="See your strength" detail="Recorded estimates, source lifts and how the score works" onPress={() => router.push('/history/strength')} />
    {locked.length && (gating.lifecycle === 'cold_start' || gating.lifecycle === 'warming' || gating.lifecycle === 'empty') ?
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel>Building your picture</SectionLabel>
        <Caption>First observations are baselines. A later result must beat an earlier usable result to earn a record.</Caption>
        {locked.map(step => <Caption key={step}>{step}</Caption>)}
      </Panel> : null}
    <InsightRecentLinks data={data} onOpenSession={onOpenSession} />
    <LiftComparisons insights={insights} range={range} advanced={advanced} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <StatCard label="Workouts in range" value={String(sessions.length)} />
      <StatCard label="Sets logged" value={String(sessions.reduce((sum, row) => sum + row.completedSetCount, 0))} />
    </View>
    <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
      <SectionLabel>Weight moved</SectionLabel>
      <Text size="lg" weight={800}>{formatWeight(sessions.reduce((sum, row) => sum + row.tonnage, 0), insights.units) ?? '—'}</Text>
    </Panel>
    {advanced ? <WeeklyVolumePanel insights={insights} gating={gating} range={range} /> : null}
    <ConsistencyPanel insights={insights} range={range} />
    {advanced ? <Milestones insights={insights} /> : null}
    <InsightLink title="Your lifts" detail={`${data.overview.uniqueMovements} movements in loaded history`} onPress={() => router.push('/history/lifts')} />
    <InsightLink title="Muscles" detail="Balance, sets by week and recent fatigue" onPress={() => router.push('/history/muscles')} />
    <InsightLink title="Past workouts" detail={`${data.recentSessions.length} loaded ${data.recentSessions.length === 1 ? 'workout' : 'workouts'}, with saved recaps`} onPress={() => router.push('/history/workouts')} />
    <BodyweightTrendCard insights={insights} range={range} />
  </>
}
