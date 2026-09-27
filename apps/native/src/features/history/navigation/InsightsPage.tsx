import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react-native'
import type { User } from '@supabase/supabase-js'
import type { HistoryDashboardWithInsights, InsightGating } from '@sheetless/domain/history/types'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { resolveInsightGating } from '@sheetless/domain/history/insight-state'
import { INSIGHT_RANGES, insightRangeLabels } from '@sheetless/domain/history/insight-ranges'
import { Button, Caption, EmptyState, PageHeader, Panel, SegmentedControl, Text } from '@/components'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing, useTokens } from '@/lib/tokens'
import { programOverviewQueryOptions } from '@/features/program/queries'
import { historyDashboardQueryOptions } from '../queries'
import { SessionSummarySheet } from '../sessions/SessionSummarySheet'
import { useInsightsState, type InsightsDestination } from './InsightsState'

export type InsightsContentProps = {
  data: HistoryDashboardWithInsights; gating: InsightGating; user: User; advanced: boolean
  programOverview: ProgramOverview | null; onOpenSession: (id: string) => void
}

type InsightsPageProps = {
  title: string; page: InsightsDestination; range?: boolean; children: (props: InsightsContentProps) => ReactNode
}

export function InsightsPage(props: InsightsPageProps) {
  const { user } = useSession()
  return user ? <AccountInsightsPage key={user.id} {...props} user={user} /> : null
}

function AccountInsightsPage({ title, page, range = true, children, user }: InsightsPageProps & { user: User }) {
  const me = useMe()
  const dashboard = useQuery(historyDashboardQueryOptions(user))
  const overview = useQuery(programOverviewQueryOptions(user))
  const { state, update } = useInsightsState()
  const [selectedSessionId, selectSession] = useState<string | null>(null)
  const program = overview.data?.activeProgram
  const gating = dashboard.data ? resolveInsightGating({
    completedSessions: dashboard.data.overview.completedSessions,
    lastCompletedAt: dashboard.data.overview.latestTrainingDate ?? null,
    now: dashboard.data.insights.today,
    program: program ? { status: program.status, weekNumber: overview.data?.position?.weekNumber ?? null,
      hardness: overview.data?.position?.hardness ?? null } : null,
  }) : null
  const content = <>
    <PageHeader title={title} eyebrow={page === 'index' ? 'Your training, recorded' : undefined} />
    {dashboard.isPending ? <Text tone="dimmed">Loading your training…</Text> : dashboard.isError ? <>
      <EmptyState title="Insights could not load">{dashboard.error instanceof Error ? dashboard.error.message : 'Try again.'}</EmptyState>
      <Button label="Retry Insights" onPress={() => void dashboard.refetch()} />
    </> : dashboard.data && gating && user ? <>
      <Caption>{dashboard.data.overview.completedSessions} loaded workouts{dashboard.data.insights.firstSessionDate ? ` · ${dashboard.data.insights.firstSessionDate} to ${dashboard.data.overview.latestTrainingDate}` : ''}. Up to 240 recent workouts.</Caption>
      {range ? <>
        <SegmentedControl options={INSIGHT_RANGES.map(value => ({ value, label: value === 'all' ? 'Loaded history' : insightRangeLabels[value] }))}
          value={state.range} onChange={next => update({ range: next, sessions: { ...state.sessions, page: 0 } })}
          accessibilityLabel="Insights range" variant="pills" />
        <Caption>Selected range: {state.range === 'all' ? 'Loaded history' : insightRangeLabels[state.range]}</Caption>
      </> : <Caption>This view covers loaded history. Workout chart range: {state.range === 'all' ? 'Loaded history' : insightRangeLabels[state.range]}.</Caption>}
      {children({ data: dashboard.data, gating, user, advanced: me.data?.experienceMode === 'full',
        programOverview: overview.data ?? null, onOpenSession: selectSession })}
      {me.isError ? <Button label="Retry display preference" variant="subtle" onPress={() => void me.refetch()} /> : null}
      {overview.isError ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text tone="warning">Programme context could not load.</Text>
        <Button label="Retry programme context" onPress={() => void overview.refetch()} />
      </Panel> : null}
    </> : null}
  </>
  return <>
    <InsightsViewport key={`${user?.id}:${dashboard.isSuccess}`} page={page}>{content}</InsightsViewport>
    {user ? <SessionSummarySheet key={user.id} sessionId={selectedSessionId} user={user} onClose={() => selectSession(null)} /> : null}
  </>
}

function InsightsViewport({ children, page }: { children: ReactNode; page: InsightsDestination }) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { state, setScroll } = useInsightsState()
  const [offset] = useState(state.scroll[page] ?? 0)
  return <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
    {page !== 'index' ? <Pressable accessibilityRole="button" accessibilityLabel="Back to Insights"
      onPress={() => router.dismissTo('/history')}
      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.xs }}>
      <ChevronLeft size={20} color={theme.text} /><Text size="sm" weight={700}>Insights</Text>
    </Pressable> : null}
    <ScrollView keyboardShouldPersistTaps="handled" contentOffset={{ x: 0, y: offset }}
      onScroll={event => setScroll(page, event.nativeEvent.contentOffset.y)} scrollEventThrottle={200}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl + insets.bottom, gap: spacing.md, maxWidth: 560, alignSelf: 'center', width: '100%' }}>
      {children}
    </ScrollView>
  </View>
}
