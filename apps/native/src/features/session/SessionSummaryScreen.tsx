import { ReturnSessionNotice } from './live/ReturnSessionNotice'
import type { User } from '@supabase/supabase-js'
import { buildSessionReceipt } from '@sheetless/domain/session/session-receipt'
import { postWorkoutFeedbackEligible } from '@sheetless/domain/feedback/post-workout'
import { PostWorkoutFeedback } from '@/features/feedback/PostWorkoutFeedback'
import { WhatChangedCard } from './summary/WhatChangedCard'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { summaryHeadline } from '@sheetless/domain/session/summary-decisions'
import type { SessionSummary } from '@sheetless/domain/session/types/read-models'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { sessionQueryOptions } from './queries'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { WorkoutSummaryRecap } from './summary/WorkoutSummaryRecap'
import { AdHocSessionActions } from './summary/AdHocSessionActions'
import { SummaryDecisions } from './summary/SummaryDecisions'
import { ShareWorkoutButton } from '@/features/history/sharing/ShareWorkoutButton'

export function SessionSummaryScreen({ sessionId }: { sessionId: string }) {
  const { user } = useSession()
  if (!user) return <Screen><Text>Sign in to view your workout summary.</Text></Screen>
  return <AccountSummary key={`${user.id}-${sessionId}`} user={user} sessionId={sessionId} />
}

function AccountSummary({ user, sessionId }: { user: User; sessionId: string }) {
  const [resolved, setResolved] = useState<Record<string, 'accepted' | 'dismissed'>>({})
  const queryClient = useQueryClient()
  // Snapshot the finish payload once: the effect below drops it from the cache so
  // a revisit shows the persisted session rather than a stale one-shot summary.
  // useState's lazy initializer keeps that one-shot semantic without reading a ref
  // during render (and without re-reading the cache on every render).
  const [finishSummary] = useState(() =>
    user
      ? queryClient.getQueryData<SessionSummary>(accountQueryKeys.summary(user.id, sessionId))
      : undefined,
  )
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
  const decisions = (finishSummary?.decisions ?? []).map((decision) => ({ ...decision, status: resolved[decision.id] ?? decision.status }))
  const effectiveSummary = finishSummary ? { ...finishSummary, decisions } : undefined
  const receipt = buildSessionReceipt(session.data, effectiveSummary)
  return (
    <Screen>
      <PageHeader
        eyebrow={`${session.data.title} · Session summary`}
        title={summaryHeadline(recap.completion.completed, recap.completion.planned)}
        subtitle={`${recap.completion.completed} of ${recap.completion.planned} sets · ${recap.stats.durationMinutes} min`}
      />
      {finishSummary?.decisions.length ? (
        <SummaryDecisions
          decisions={decisions}
          onResolved={(id, action) => setResolved((current) => ({ ...current, [id]: action }))}
          units={session.data.units}
          user={user!}
        />
      ) : null}
      <ReturnSessionNotice session={session.data} />
      <WhatChangedCard receipt={receipt} user={user} sessionId={sessionId} />
      {postWorkoutFeedbackEligible(session.data, effectiveSummary) ? (
        <PostWorkoutFeedback key={`${user.id}-${sessionId}`} user={user} session={session.data} decisions={decisions} />
      ) : null}
      <WorkoutSummaryRecap session={session.data} recap={recap} />
      <AdHocSessionActions user={user!} session={session.data} />
      <ShareWorkoutButton session={session.data} />
      <Button label="Back to Today" fullWidth onPress={() => router.dismissTo('/(tabs)')} />
    </Screen>
  )
}
