import { ReturnSessionNotice } from './live/ReturnSessionNotice'
import type { User } from '@supabase/supabase-js'
import { buildSessionReceipt } from '@sheetless/domain/session/session-receipt'
import { postWorkoutFeedbackEligible } from '@sheetless/domain/feedback/post-workout'
import { PostWorkoutFeedback } from '@/features/feedback/PostWorkoutFeedback'
import { WhatChangedCard } from './summary/WhatChangedCard'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useIsFocused } from 'expo-router'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { summaryHeadline } from '@sheetless/domain/session/summary-decisions'
import type { SessionSummary } from '@sheetless/domain/session/types/read-models'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { sessionSummaryQueryOptions } from './queries'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { WorkoutSummaryRecap } from './summary/WorkoutSummaryRecap'
import { AdHocSessionActions } from './summary/AdHocSessionActions'
import { SummaryDecisions } from './summary/SummaryDecisions'
import { ShareWorkoutButton } from '@/features/history/sharing/ShareWorkoutButton'

export function SessionSummaryScreen({ sessionId }: { sessionId: string }) {
  const { user } = useSession()
  const focused = useIsFocused()
  if (!focused) return null
  if (!user) return <Screen><Text>Sign in to view your workout summary.</Text></Screen>
  return <AccountSummary key={`${user.id}-${sessionId}`} user={user} sessionId={sessionId} />
}

function AccountSummary({ user, sessionId }: { user: User; sessionId: string }) {
  const queryClient = useQueryClient()
  // Consume only the feedback invitation; saved decisions are read on every visit.
  const [freshFinish] = useState(() => Boolean(
    queryClient.getQueryData<SessionSummary>(accountQueryKeys.summary(user.id, sessionId)),
  ))
  useEffect(() => {
    if (!user) return
    queryClient.removeQueries({
      queryKey: accountQueryKeys.summary(user.id, sessionId),
      exact: true,
    })
  }, [queryClient, sessionId, user])
  const session = useQuery({
    ...sessionSummaryQueryOptions(user, sessionId),
    enabled: Boolean(user && sessionId),
  })

  if (session.isPending || (!session.isError && !session.isFetchedAfterMount)) {
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
        <Button label="Retry" fullWidth loading={session.isFetching} onPress={() => void session.refetch()} />
        <Button label="Back to Today" variant="default" fullWidth onPress={() => router.replace('/(tabs)')} />
      </Screen>
    )
  }

  const summary = session.data
  const workout = summary.session
  const receiptAvailable = summary.decisionReceiptAvailable !== false
  const recap = buildWorkoutSummary(workout)
  const decisions = summary.decisions
  const receipt = buildSessionReceipt(workout, summary)
  const onResolved = (id: string, action: 'accepted' | 'dismissed') => {
    queryClient.setQueryData<SessionSummary>(accountQueryKeys.sessionReceipt(user.id, sessionId), (current) => current && ({
      ...current,
      decisions: current.decisions.map((decision) => decision.id === id ? { ...decision, status: action } : decision),
    }))
  }
  return (
    <Screen>
      <PageHeader
        eyebrow={`${workout.title} · Session summary`}
        title={summaryHeadline(recap.completion.completed, recap.completion.planned)}
        subtitle={`${recap.completion.completed} of ${recap.completion.planned} sets · ${recap.stats.durationMinutes} min`}
      />
      {!receiptAvailable ? (
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text>Progression details are unavailable for this older workout.</Text>
          <Button label="Review current choices in Your Plan" variant="default" onPress={() => router.push('/(tabs)/program')} />
        </Panel>
      ) : null}
      {decisions.length ? (
        <SummaryDecisions
          decisions={decisions}
          onResolved={onResolved}
          units={workout.units}
          user={user}
        />
      ) : null}
      <ReturnSessionNotice session={workout} />
      <WhatChangedCard receipt={receipt} user={user} sessionId={sessionId} />
      {freshFinish && receiptAvailable && postWorkoutFeedbackEligible(workout, summary) ? (
        <PostWorkoutFeedback key={`${user.id}-${sessionId}`} user={user} session={workout} decisions={decisions} />
      ) : null}
      <WorkoutSummaryRecap session={workout} recap={recap} />
      <AdHocSessionActions user={user} session={workout} />
      <ShareWorkoutButton session={workout} />
      <Button label="Back to Today" fullWidth onPress={() => router.dismissTo('/(tabs)')} />
    </Screen>
  )
}
