import { useQuery } from '@tanstack/react-query'
import { resolveInsightGating } from '@sheetless/domain/history/insight-state'
import { Button, EmptyState, PageHeader, Panel, Screen, SettingsHeaderAction, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { historyDashboardQueryOptions } from './queries'
import { programOverviewQueryOptions } from '@/features/program/queries'
import { InsightsTabs } from './InsightsTabs'

export function InsightsScreen() {
  const { user } = useSession()
  const dashboard = useQuery({ ...historyDashboardQueryOptions(user!), enabled: Boolean(user) })
  const overview = useQuery({ ...programOverviewQueryOptions(user!), enabled: Boolean(user) })
  const settingsAction = <SettingsHeaderAction testID="insights-settings" />

  if (dashboard.isPending) {
    return (
      <Screen>
        <PageHeader
          title="Insights"
          subtitle="Up to 240 recent workouts · latest 20 sessions."
          actions={settingsAction}
        />
        <Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading recent training…</Text></Panel>
      </Screen>
    )
  }
  if (dashboard.isError) {
    return (
      <Screen>
        <PageHeader title="Insights" actions={settingsAction} />
        <EmptyState title="Insights could not load">
          {dashboard.error instanceof Error ? dashboard.error.message : 'Try again in a moment.'}
        </EmptyState>
        <Button label="Retry Insights" onPress={() => void dashboard.refetch()} />
      </Screen>
    )
  }

  const program = overview.data?.activeProgram
  const gating = resolveInsightGating({
    completedSessions: dashboard.data.overview.completedSessions,
    lastCompletedAt: dashboard.data.overview.latestTrainingDate ?? null,
    now: dashboard.data.insights.today,
    program: program
      ? {
          status: program.status,
          weekNumber: overview.data?.position?.weekNumber ?? null,
          hardness: overview.data?.position?.hardness ?? null,
        }
      : null,
  })

  return (
    <Screen>
      <PageHeader
        title="Insights"
        eyebrow="Logged work"
        subtitle="Up to 240 recent workouts · latest 20 sessions."
        actions={settingsAction}
      />
      <InsightsTabs
        key={user!.id}
        data={dashboard.data}
        gating={gating}
        programOverview={overview.data ?? null}
        recent={dashboard.data.recentSessions.slice(0, 20)}
        user={user!}
      />
      {overview.isError ? (
        <Panel>
          <Text tone="warning">Programme context could not load.</Text>
          <Button label="Retry programme context" onPress={() => void overview.refetch()} />
        </Panel>
      ) : null}
    </Screen>
  )
}
