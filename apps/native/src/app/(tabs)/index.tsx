import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { View } from 'react-native'
import { startSession } from '@sheetless/data/session/lifecycle'
import { getToday } from '@sheetless/data/session/reads'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { countCompletedSets, nextIncompleteSetLabel } from '@sheetless/domain/session/today-page'
import { countPlannedSets, formatPreviousHero } from '@sheetless/domain/session/today-numbers'
import {
  Badge,
  Button,
  Caption,
  EmptyState,
  Heading,
  PageHeader,
  Panel,
  Screen,
  SectionLabel,
  StatCard,
  Text,
} from '@/components'
import { buildUserContext, useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { useTimezoneSync } from '@/lib/use-timezone-sync'
import { spacing, useTokens } from '@/lib/tokens'

export default function TodayScreen() {
  const { user } = useSession()
  const { theme } = useTokens()
  const me = useMe()
  const queryClient = useQueryClient()
  useTimezoneSync()

  const today = useQuery({
    queryKey: user ? accountQueryKeys.today(user.id) : ['account', 'anonymous', 'today'],
    queryFn: () => getToday(buildUserContext(user!), me.data?.timezone ?? undefined),
    enabled: Boolean(user) && me.isSuccess,
    staleTime: queryStaleTimes.today,
  })

  const startMutation = useMutation({
    mutationFn: () =>
      startSession(buildUserContext(user!), {
        clientMutationId: crypto.randomUUID(),
        timeZone: browserIanaTimeZone() ?? undefined,
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(accountQueryKeys.session(user!.id, session.sessionId), session)
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user!.id) })
      router.push({ pathname: '/session/[sessionId]', params: { sessionId: session.sessionId } })
    },
  })

  const openSession = (sessionId: string) =>
    router.push({ pathname: '/session/[sessionId]', params: { sessionId } })

  if (me.isPending || today.isPending) {
    return (
      <Screen>
        <PageHeader title="Today" />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text tone="dimmed">Loading your training day…</Text>
        </Panel>
      </Screen>
    )
  }

  if (today.isError) {
    return (
      <Screen>
        <PageHeader title="Today" />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text tone="danger" size="sm">
            {today.error instanceof Error ? today.error.message : 'The screen could not load.'}
          </Text>
          <Button label="Retry" variant="default" onPress={() => today.refetch()} />
        </Panel>
      </Screen>
    )
  }

  const data = today.data
  const active = data?.activeSession ?? null
  const planned = data?.plannedSession ?? null
  const program = data?.activeProgram ?? null
  const pending = data?.pendingDecisions ?? []

  // Active session wins — an ad-hoc workout can be live with no program at all.
  if (active) {
    const done = countCompletedSets(active)
    const total = countPlannedSets(active)
    return (
      <Screen>
        <PageHeader
          title="Today"
          eyebrow={program ? `${program.title} · ${active.weekLabel ?? ''}` : 'Ad-hoc workout'}
          subtitle="A workout is currently in progress."
        />
        <Panel style={{ borderColor: theme.tones.action.border, gap: spacing.sm, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Badge tone="action" variant="filled">
              In progress
            </Badge>
            {active.hardness ? <Badge tone="warning">{active.hardness}</Badge> : null}
          </View>
          <Heading order={2}>{active.title}</Heading>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatCard label="Completed sets" value={`${done}/${total}`} />
            <StatCard label="Next up" value={nextIncompleteSetLabel(active) ?? 'All done'} tone="action" />
          </View>
          <Button
            label="Resume workout"
            fullWidth
            onPress={() => openSession(active.sessionId)}
            testID="today-resume"
          />
        </Panel>
      </Screen>
    )
  }

  if (!program || !planned) {
    return (
      <Screen>
        <PageHeader title="Today" subtitle={`Signed in as ${me.data?.email ?? user?.email ?? ''}.`} />
        <EmptyState title="No active program">
          Choose a training template on sheetless.fitness to generate your daily sessions — or log a
          one-off workout there.
        </EmptyState>
      </Screen>
    )
  }

  const mainMovement = planned.movements.find((movement) => movement.role === 'main') ?? planned.movements[0]
  const previousLine = mainMovement
    ? formatPreviousHero(mainMovement.previous, planned.units ?? me.data?.units ?? 'kg')
    : null

  return (
    <Screen>
      <PageHeader
        title="Today"
        eyebrow={`${program.title} · ${planned.weekLabel ?? ''}`}
        subtitle={data?.completedSession ? 'Today’s planned session is already completed.' : undefined}
      />

      {pending.length > 0 ? (
        <Panel
          surface="inset"
          style={{ borderColor: theme.tones.warning.border, gap: 4, padding: spacing.md }}
        >
          <SectionLabel tone="warning">Progression review pending</SectionLabel>
          <Text size="sm">
            {pending[0].movementName}: {pending[0].recommendation}
          </Text>
          <Caption>Review on the web before starting the next session.</Caption>
        </Panel>
      ) : null}

      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
          <Badge tone="action" variant="filled">
            Next session
          </Badge>
          {planned.hardness ? <Badge tone="warning">{planned.hardness}</Badge> : null}
          {planned.equipmentMode === 'free_weight' ? <Badge tone="neutral">Free weights</Badge> : null}
        </View>

        <View style={{ gap: 2 }}>
          <Heading order={2}>{planned.title}</Heading>
          <Text tone="dimmed" size="sm">
            {planned.movements.length} movements
            {planned.estimatedMinutes ? ` · ${planned.estimatedMinutes} min` : ''}
          </Text>
        </View>

        {mainMovement ? (
          <Panel
            surface="inset"
            style={{
              backgroundColor: theme.tones.action.soft,
              borderColor: theme.tones.action.border,
              gap: 2,
              padding: spacing.md,
            }}
          >
            <SectionLabel tone="action">Main lift</SectionLabel>
            <Heading order={3}>{mainMovement.movementName}</Heading>
            {mainMovement.targetSummary ? <Text size="sm">{mainMovement.targetSummary}</Text> : null}
            {previousLine ? <Caption>{previousLine}</Caption> : null}
          </Panel>
        ) : null}

        <StatCard label="Planned sets" value={String(countPlannedSets(planned))} />

        <Button
          label={data?.completedSession ? 'Start next session' : 'Start workout'}
          fullWidth
          loading={startMutation.isPending}
          onPress={() => startMutation.mutate()}
          testID="today-start"
        />
        {startMutation.isError ? (
          <Text tone="danger" size="sm">
            {startMutation.error instanceof Error
              ? startMutation.error.message
              : 'The workout could not start.'}
          </Text>
        ) : null}
      </Panel>
    </Screen>
  )
}
