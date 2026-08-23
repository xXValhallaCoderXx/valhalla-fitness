/**
 * Live session route — v0: read-only session view proving the route, query,
 * and navigation wiring. The Focus logger replaces this body in L2/L3.
 */
import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { countPlannedSets } from '@sheetless/domain/session/today-numbers'
import { formatSetTarget, isMovementComplete } from '@sheetless/domain/session/live-session-utils'
import { movementCompletedSets } from '@sheetless/domain/session/live-focus-utils'
import { countCompletedSets } from '@sheetless/domain/session/today-page'
import { Badge, Button, Caption, Heading, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { sessionQueryOptions } from '@/features/session/queries'

export default function LiveSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const { user } = useSession()

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

  const data = session.data
  return (
    <Screen>
      <PageHeader
        title={data.title}
        eyebrow={`${data.programTitle} · ${data.weekLabel}`}
        subtitle={`${countCompletedSets(data)}/${countPlannedSets(data)} sets logged`}
      />
      {data.movements
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((movement) => (
          <Panel key={movement.id} style={{ gap: 4, padding: spacing.md }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
              <Heading order={3}>{movement.performedMovementName ?? movement.movementName}</Heading>
              {isMovementComplete(movement) ? <Badge tone="success">Done</Badge> : null}
            </View>
            <Text tone="dimmed" size="sm">
              {movement.targetSummary}
            </Text>
            <Caption>
              {movementCompletedSets(movement)}/{movement.sets.length} sets ·{' '}
              {movement.sets.map((set) => formatSetTarget(set, data.units, false, movement)).join(' · ')}
            </Caption>
          </Panel>
        ))}
      <Button label="Back to Today" variant="default" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  )
}
