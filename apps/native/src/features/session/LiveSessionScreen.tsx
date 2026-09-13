import { useEffect } from 'react'
import { router, useIsFocused } from 'expo-router'
import { useKeepAwake } from 'expo-keep-awake'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { Button, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { FocusWorkoutView } from './live/FocusWorkoutView'
import { RestTimerProvider } from './rest-timer/RestTimerProvider'
import { useLiveSessionEntry } from './live/useLiveSessionEntry'

export function LiveSessionScreen({ sessionId }: { sessionId: string }) {
  const { user } = useSession()
  const focused = useIsFocused()
  // Returning to a retained stack route must check its status again before logging.
  if (!focused) return null
  if (!user) {
    return (
      <Screen>
        <PageHeader title="Workout" />
        <Text>Sign in to view your workout.</Text>
        <Button label="Sign in" onPress={() => router.replace('/auth')} />
      </Screen>
    )
  }
  return <AccountLiveSession key={`${user.id}-${sessionId}`} user={user} sessionId={sessionId} />
}

function AccountLiveSession({ user, sessionId }: { user: User; sessionId: string }) {
  const { session, entry, retry } = useLiveSessionEntry(user, sessionId)

  useEffect(() => {
    if (entry.status === 'verified' && session.isSuccess && session.data.status === 'completed') {
      router.replace({ pathname: '/session/[sessionId]/summary', params: { sessionId } })
    }
  }, [entry.status, session.data?.status, session.isSuccess, sessionId])

  // A cached active workout may have ended elsewhere. Its logger and timers must
  // stay unmounted until this entry's authoritative read succeeds.
  if (entry.status === 'checking') return <WorkoutLoading />

  if (entry.status === 'failed' || session.isError || !session.data) {
    const error = entry.status === 'failed' ? entry.error : session.error
    return (
      <Screen>
        <PageHeader title="Workout" />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text tone="danger" size="sm">
            {error instanceof Error ? error.message : 'This workout could not load.'}
          </Text>
          <Button label="Retry" loading={session.isFetching} onPress={() => void retry()} />
          <Button label="Back to Today" variant="default" onPress={() => router.replace('/(tabs)')} />
        </Panel>
      </Screen>
    )
  }

  if (session.data.status === 'completed') return <WorkoutLoading recap />

  if (session.data.status !== 'in_progress') {
    return (
      <Screen>
        <PageHeader title="Workout unavailable" />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text>
            {session.data.status === 'planned'
              ? 'This workout has not started.'
              : session.data.status === 'skipped'
                ? 'This workout was skipped.'
                : 'This workout is no longer active.'}
          </Text>
          <Button label="Back to Today" onPress={() => router.replace('/(tabs)')} />
        </Panel>
      </Screen>
    )
  }

  return <ActiveWorkout user={user} session={session.data} />
}

function ActiveWorkout({ user, session }: { user: User; session: WorkoutSession }) {
  useKeepAwake()
  return (
    <RestTimerProvider>
      <FocusWorkoutView user={user} session={session} />
    </RestTimerProvider>
  )
}

function WorkoutLoading({ recap = false }: { recap?: boolean }) {
  return (
    <Screen>
      <PageHeader title="Workout" />
      <Panel style={{ padding: spacing.md }}>
        <Text tone="dimmed">{recap ? 'Opening your recap…' : 'Loading your workout…'}</Text>
      </Panel>
    </Screen>
  )
}
