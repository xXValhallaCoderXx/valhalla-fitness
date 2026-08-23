import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useKeepAwake } from 'expo-keep-awake'
import { Button, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { FocusWorkoutView } from './FocusWorkoutView'
import { sessionQueryOptions } from './queries'
import { RestTimerProvider } from './RestTimerProvider'

export function LiveSessionScreen({ sessionId }: { sessionId: string }) {
  const { user } = useSession()
  useKeepAwake()

  const session = useQuery({
    ...sessionQueryOptions(user!, sessionId),
    enabled: Boolean(user && sessionId),
  })

  if (session.isPending) {
    return (
      <Screen>
        <PageHeader title="Workout" />
        <Panel style={{ padding: spacing.md }}>
          <Text tone="dimmed">Loading your workout…</Text>
        </Panel>
      </Screen>
    )
  }

  if (session.isError || !session.data) {
    return (
      <Screen>
        <PageHeader title="Workout" />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text tone="danger" size="sm">
            {session.error instanceof Error ? session.error.message : 'This workout could not load.'}
          </Text>
          <Button label="Back to Today" variant="default" onPress={() => router.replace('/(tabs)')} />
        </Panel>
      </Screen>
    )
  }

  return (
    <RestTimerProvider>
      <FocusWorkoutView user={user!} session={session.data} />
    </RestTimerProvider>
  )
}
