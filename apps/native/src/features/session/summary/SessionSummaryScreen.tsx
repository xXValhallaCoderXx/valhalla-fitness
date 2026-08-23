import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { summaryHeadline } from '@sheetless/domain/session/summary-decisions'
import type { SessionSummary } from '@sheetless/domain/session/types/read-models'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { sessionQueryOptions } from '@/features/session/queries'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { WorkoutSummaryRecap } from './WorkoutSummaryRecap'
import { AdHocSessionActions } from './AdHocSessionActions'
import { SummaryDecisions } from './SummaryDecisions'

export function SessionSummaryScreen({ sessionId }: { sessionId: string }) {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const finishSummary = useRef(
    user
      ? queryClient.getQueryData<SessionSummary>(accountQueryKeys.summary(user.id, sessionId))
      : undefined,
  ).current
  useEffect(() => {
    if (!user) return
    queryClient.removeQueries({
      queryKey: accountQueryKeys.summary(user.id, sessionId),
      exact: true,
    })
  }, [queryClient, sessionId, user])
  const session = useQuery({
    ...sessionQueryOptions(user!, sessionId),
    enabled: Boolean(user && sessionId),
  })

  if (session.isPending) {
    return (
      <Screen>
        <PageHeader title="Workout summary" />
        <Panel style={{ padding: spacing.md }}>
          <Text tone="dimmed">Loading your recap…</Text>
        </Panel>
      </Screen>
    )
  }

  if (session.isError || !session.data) {
    return (
      <Screen>
        <EmptyState title="This recap could not load">
          {session.error instanceof Error ? session.error.message : 'The workout was not found.'}
        </EmptyState>
        <Button label="Back to Today" fullWidth onPress={() => router.replace('/(tabs)')} />
      </Screen>
    )
  }

  const recap = buildWorkoutSummary(session.data)
  return (
    <Screen>
      <PageHeader
        eyebrow={`${session.data.title} · Session summary`}
        title={summaryHeadline(recap.completion.completed, recap.completion.planned)}
        subtitle={`${recap.completion.completed} of ${recap.completion.planned} sets · ${recap.stats.durationMinutes} min`}
      />
      {finishSummary?.decisions.length ? (
        <SummaryDecisions
          decisions={finishSummary.decisions}
          units={session.data.units}
          user={user!}
        />
      ) : null}
      <WorkoutSummaryRecap session={session.data} recap={recap} />
      <AdHocSessionActions user={user!} session={session.data} />
      <Button label="Back to Today" fullWidth onPress={() => router.dismissTo('/(tabs)')} />
    </Screen>
  )
}
