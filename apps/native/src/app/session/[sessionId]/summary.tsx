import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, PageHeader, Panel, Screen, Text } from '@/components'
import { sessionQueryOptions } from '@/features/session/queries'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'

export default function SessionSummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const { user } = useSession()
  const session = useQuery({
    ...sessionQueryOptions(user!, sessionId),
    enabled: Boolean(user && sessionId),
  })

  return (
    <Screen>
      <PageHeader title={session.data?.title ?? 'Workout summary'} subtitle="Your workout is saved." />
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        {session.isPending ? <Text tone="dimmed">Loading your recap…</Text> : null}
        {session.isError ? (
          <Text tone="danger" size="sm">
            {session.error instanceof Error ? session.error.message : 'The recap could not load.'}
          </Text>
        ) : null}
        {session.isSuccess ? <Text tone="dimmed">A detailed recap is coming next.</Text> : null}
        <Button label="Back to Today" fullWidth onPress={() => router.replace('/(tabs)')} />
      </Panel>
    </Screen>
  )
}
