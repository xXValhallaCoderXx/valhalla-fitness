import { useQuery, useQueryClient } from '@tanstack/react-query'
import { resolveInsightGating } from '@sheetless/domain/history/insight-state'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import {
  historyDashboardQueryOptions,
  recentHistoryQueryOptions,
  todayHistorySupportQueryOptions,
} from './queries'
import { InsightsTabs } from './InsightsTabs'

export function InsightsScreen() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const dashboard = useQuery({ ...historyDashboardQueryOptions(user!), enabled: Boolean(user) })
  const recent = useQuery({ ...recentHistoryQueryOptions(user!), enabled: Boolean(user) })
  const support = useQuery({ ...todayHistorySupportQueryOptions(user!), enabled: Boolean(user) })

  if (dashboard.isPending) {
    return (
      <Screen>
        <PageHeader title="Insights" subtitle="Chartless signals from your recent training." />
        <Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading recent training…</Text></Panel>
      </Screen>
    )
  }
  if (dashboard.isError) {
    return (
      <Screen>
        <PageHeader title="Insights" />
        <EmptyState title="Insights could not load">
          {dashboard.error instanceof Error ? dashboard.error.message : 'Try again in a moment.'}
        </EmptyState>
      </Screen>
    )
  }

  const today = queryClient.getQueryData<TodayPayload>(accountQueryKeys.today(user!.id))
  const program = today?.activeProgram
  const daysPerWeek = program?.templateDefinition?.daysPerWeek
  const gating = resolveInsightGating({
    completedSessions: dashboard.data.overview.completedSessions,
    lastCompletedAt: dashboard.data.overview.latestTrainingDate ?? null,
    now: dashboard.data.insights.today,
    program: program
      ? {
          status: program.status,
          weekNumber: daysPerWeek ? Math.floor(program.currentWeekIndex / daysPerWeek) + 1 : null,
          hardness: today?.plannedSession?.hardness ?? null,
        }
      : null,
  })

  return (
    <Screen>
      <PageHeader title="Insights" eyebrow="Logged work" subtitle="Chartless signals from your recent training." />
      <InsightsTabs
        data={dashboard.data}
        gating={gating}
        recent={recent.data ?? dashboard.data.recentSessions}
        support={support.data}
        user={user!}
      />
      {recent.isError || support.isError ? (
        <Text size="xs" tone="warning">Some supporting recent-training details could not refresh.</Text>
      ) : null}
    </Screen>
  )
}
