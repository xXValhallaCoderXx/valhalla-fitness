import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { router, useIsFocused } from 'expo-router'
import type { SessionSummary } from '@sheetless/domain/session/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { formatFullDate, formatWeekdayLongDate } from '@sheetless/domain/shared/dates'
import { buildWorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { Button, EmptyState, Panel, Screen, SheetModal, Text } from '@/components'
import { WorkoutSharePreview } from '@/features/history/sharing/WorkoutSharePreview'
import { useSession } from '@/lib/session-provider'
import { useMe } from '@/lib/account'
import { spacing } from '@/lib/tokens'
import { sessionSummaryQueryOptions } from './queries'
import { SessionRecapContent } from './summary/SessionRecapContent'
import { RecapActions, RecapLayout } from './summary/RecapLayout'

export function SessionSummaryScreen({ sessionId }: { sessionId: string }) {
  const { user } = useSession()
  const focused = useIsFocused()
  if (!focused) return null
  if (!user) return <Screen><Text>Sign in to view your workout summary.</Text></Screen>
  return <AccountSummary key={`${user.id}-${sessionId}`} user={user} sessionId={sessionId} />
}

function AccountSummary({ user, sessionId }: { user: User; sessionId: string }) {
  const client = useQueryClient()
  const me = useMe()
  const [sharing, setSharing] = useState(false)
  // This account-scoped marker is written only by Finish; historical visits do not create it.
  const [freshFinish] = useState(() => Boolean(client.getQueryData<SessionSummary>(accountQueryKeys.summary(user.id, sessionId))))
  useEffect(() => {
    client.removeQueries({ queryKey: accountQueryKeys.summary(user.id, sessionId), exact: true })
  }, [client, sessionId, user.id])
  const query = useQuery(sessionSummaryQueryOptions(user, sessionId))
  const done = () => router.dismissTo('/(tabs)')
  if (query.isPending || (!query.isError && !query.isFetchedAfterMount)) return <RecapLayout title="Workout recap" onClose={done}
    footer={<RecapActions onDone={done} />}>
    <Text>Loading your recap…</Text>
  </RecapLayout>
  if (query.isError || !query.data) return <RecapLayout title="Workout recap" onClose={done} footer={<RecapActions onDone={done} />}>
    <EmptyState title="This recap could not load">{query.error instanceof Error ? query.error.message : 'The workout was not found.'}</EmptyState>
    <Button label="Retry" fullWidth loading={query.isFetching} onPress={() => void query.refetch()} />
  </RecapLayout>
  const summary = query.data
  const workout = summary.session
  const mode = me.data?.experienceMode ?? 'guided'
  const advanced = mode === 'full'
  const shareModel = buildWorkoutShareModel(workout)
  const date = advanced ? formatFullDate(workout.scheduledDate) : formatWeekdayLongDate(workout.scheduledDate)
  return <>
    <RecapLayout title={freshFinish ? `${workout.title} is saved` : workout.title}
      eyebrow={[date, advanced && workout.weekLabel].filter(Boolean).join(' · ')} onClose={done}
      footer={<RecapActions onShare={shareModel ? () => setSharing(true) : undefined} onDone={done} />}>
      {me.isError ? <Panel style={{ padding: spacing.sm, gap: spacing.xs }}>
        <Text size="sm">Using {advanced ? 'Advanced' : 'Simple'} view. Your display preference could not refresh.</Text>
        <Button label="Retry display preference" variant="subtle" onPress={() => void me.refetch()} />
      </Panel> : null}
      <SessionRecapContent summary={summary} user={user} mode={mode} freshFinish={freshFinish} />
    </RecapLayout>
    {sharing && shareModel ? <SheetModal open title="Share workout" onClose={() => setSharing(false)}>
      <WorkoutSharePreview model={shareModel} onBack={() => setSharing(false)} />
    </SheetModal> : null}
  </>
}
