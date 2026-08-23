import { useState } from 'react'
import { View } from 'react-native'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { startSession } from '@sheetless/data/session/lifecycle'
import { getToday } from '@sheetless/data/session/reads'
import { streakBadgeLabel } from '@sheetless/domain/history/consistency'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Screen,
  SettingsHeaderAction,
  Text,
} from '@/components'
import { todayHistorySupportQueryOptions } from '@/features/history/queries'
import { ProgressionReviewAlert } from '@/features/program/ProgressionReviewAlert'
import { ProgressionReviewSheet } from '@/features/program/ProgressionReviewSheet'
import {
  invalidateProgramOverviewBestEffort,
  patchProgramHasActiveSession,
} from '@/features/program/program-cache'
import { buildUserContext, useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { useTimezoneSync } from '@/lib/use-timezone-sync'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { StartBlankWorkoutButton } from './StartBlankWorkoutButton'
import { TodayActiveSessionCard } from './TodayActiveSessionCard'
import { TodayPlannedSessionCard } from './TodayPlannedSessionCard'

export function TodayScreen() {
  const { user } = useSession()
  const me = useMe()
  const queryClient = useQueryClient()
  const plannedStartRequest = useStableMutationRequest()
  const activeStartMutations = useIsMutating({ mutationKey: ['startSession', user?.id] })
  const [reviewOpen, setReviewOpen] = useState(false)
  useTimezoneSync()

  const today = useQuery({
    queryKey: user ? accountQueryKeys.today(user.id) : ['account', 'anonymous', 'today'],
    queryFn: () => getToday(buildUserContext(user!), me.data?.timezone ?? undefined),
    enabled: Boolean(user) && me.isSuccess,
    staleTime: queryStaleTimes.today,
  })
  const historySupport = useQuery({
    ...todayHistorySupportQueryOptions(user!),
    enabled: Boolean(user && (today.data?.activeSession || today.data?.plannedSession)),
  })

  const startMutation = useMutation({
    mutationKey: ['startSession', user?.id, 'planned'],
    scope: { id: `account:${user?.id ?? 'anonymous'}:start-session` },
    mutationFn: () => {
      const timeZone = browserIanaTimeZone() ?? undefined
      return startSession(buildUserContext(user!), {
        clientMutationId: plannedStartRequest.requestIdFor({ timeZone: timeZone ?? null }),
        timeZone,
      })
    },
    onSuccess: (session) => {
      plannedStartRequest.clearRequest()
      queryClient.setQueryData(accountQueryKeys.session(user!.id, session.sessionId), session)
      patchProgramHasActiveSession(queryClient, user!.id, true)
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user!.id) })
      void invalidateProgramOverviewBestEffort(queryClient, user!.id)
      router.push({ pathname: '/session/[sessionId]', params: { sessionId: session.sessionId } })
    },
    onError: () => {
      // A stale Today cache can reach the authoritative start guard. Refresh so
      // any newly-discovered review is rendered instead of leaving a dead end.
      void today.refetch()
    },
  })

  const openSession = (sessionId: string) =>
    router.push({ pathname: '/session/[sessionId]', params: { sessionId } })
  const streakLabel = streakBadgeLabel(historySupport.data?.consistency)
  const settingsAction = (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
      {streakLabel ? <Badge tone="warning">{streakLabel}</Badge> : null}
      <SettingsHeaderAction testID="today-settings" />
    </View>
  )

  if (me.isPending || today.isPending) {
    return (
      <Screen>
        <PageHeader title="Today" actions={settingsAction} />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text tone="dimmed">Loading your training day…</Text>
        </Panel>
      </Screen>
    )
  }

  if (today.isError) {
    return (
      <Screen>
        <PageHeader title="Today" actions={settingsAction} />
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
  const openReview = () => {
    startMutation.reset()
    setReviewOpen(true)
  }

  // Active session wins. A programme review never blocks Resume, including
  // when the live session itself is ad-hoc.
  if (active) {
    return (
      <Screen>
        <PageHeader
          title="Today"
          actions={settingsAction}
          eyebrow={program ? `${program.title} · ${active.weekLabel ?? ''}` : 'Ad-hoc workout'}
          subtitle="A workout is currently in progress."
        />
        <ProgressionReviewAlert decisions={pending} onReview={openReview} />
        <TodayActiveSessionCard
          session={active}
          onResume={() => openSession(active.sessionId)}
        />
        <ProgressionReviewSheet
          open={reviewOpen}
          decisions={pending}
          units={program?.units ?? active.units}
          user={user!}
          contextLabel="Before your next planned workout"
          onClose={() => setReviewOpen(false)}
        />
      </Screen>
    )
  }

  if (!program || !planned) {
    return (
      <Screen>
        <PageHeader
          title="Today"
          actions={settingsAction}
          subtitle={`Signed in as ${me.data?.email ?? user?.email ?? ''}.`}
        />
        <EmptyState
          title="No active program"
          action={
            <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
              <Button
                label="Browse programs"
                fullWidth
                onPress={() => router.navigate('/(tabs)/templates')}
                testID="today-browse-programs"
              />
              <StartBlankWorkoutButton />
            </View>
          }
        >
          Choose a plan in Programs to generate your daily sessions, or start a one-off workout now.
        </EmptyState>
      </Screen>
    )
  }

  return (
    <Screen>
      <PageHeader
        title="Today"
        actions={settingsAction}
        eyebrow={`${program.title} · ${planned.weekLabel ?? ''}`}
        subtitle={data?.completedSession ? 'Today’s planned session is already completed.' : undefined}
      />

      <ProgressionReviewAlert decisions={pending} onReview={openReview} />
      <TodayPlannedSessionCard
        session={planned}
        units={me.data?.units ?? program.units}
        completedToday={Boolean(data?.completedSession)}
        pendingDecisionCount={pending.length}
        isStarting={startMutation.isPending}
        startDisabled={activeStartMutations > 0 && !startMutation.isPending}
        startError={
          startMutation.isError
            ? startMutation.error instanceof Error
              ? startMutation.error.message
              : 'The workout could not start.'
            : null
        }
        onStart={() => startMutation.mutate()}
      />
      <StartBlankWorkoutButton />

      <ProgressionReviewSheet
        open={reviewOpen}
        decisions={pending}
        units={planned.units ?? program.units}
        user={user!}
        contextLabel={program.title}
        onClose={() => setReviewOpen(false)}
      />
    </Screen>
  )
}
