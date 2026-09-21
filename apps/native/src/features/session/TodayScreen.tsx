import { ReturnGuideCard } from '@/features/program/return/ReturnGuideCard'
import { useState } from 'react'
import { View } from 'react-native'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { startSession } from '@sheetless/data/session/lifecycle'
import { getToday } from '@sheetless/data/session/reads'
import { createAccountClock } from '@sheetless/domain/shared/dates'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import {
  Button,
  EmptyState,
  Panel,
  Text,
} from '@/components'
import { ProgressionReviewAlert } from '@/features/program/progression/ProgressionReviewAlert'
import { ProgressionReviewSheet } from '@/features/program/progression/ProgressionReviewSheet'
import {
  invalidateProgramOverviewBestEffort,
  patchProgramHasActiveSession,
} from '@/features/program/program-cache'
import { buildUserContext, useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { useTimezoneSync } from '@/lib/use-timezone-sync'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { StartBlankWorkoutButton } from './today/StartBlankWorkoutButton'
import { TodayActiveSessionCard } from './today/TodayActiveSessionCard'
import { TodayPlannedSessionCard } from './today/TodayPlannedSessionCard'
import { LastWorkoutCard } from './today/LastWorkoutCard'
import { TodayHeader } from './today/TodayHeader'
import { TodayLayout as Screen } from './today/TodayLayout'

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
  const date = createAccountClock({ timeZone: me.data?.timezone }).today

  const failedQuery = me.isError ? me : today.isError ? today : null
  if (failedQuery) {
    return (
      <Screen>
        <TodayHeader date={date} />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text tone="danger" size="sm">
            {failedQuery.error instanceof Error ? failedQuery.error.message : 'The screen could not load.'}
          </Text>
          <Button label="Retry" variant="default" loading={failedQuery.isFetching} onPress={() => void failedQuery.refetch()} />
        </Panel>
      </Screen>
    )
  }

  if (me.isPending || today.isPending) {
    return (
      <Screen>
        <TodayHeader date={date} />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text tone="dimmed">Loading your training day…</Text>
        </Panel>
      </Screen>
    )
  }

  const data = today.data
  const active = data?.activeSession ?? null
  const planned = data?.plannedSession ?? null
  const program = data?.activeProgram ?? null
  const pending = data?.pendingDecisions ?? []
  const mode = me.data?.experienceMode ?? 'guided'
  const last = data?.lastCompletedSession ?? data?.completedSession
  const lastWorkout = <LastWorkoutCard key={last?.sessionId} session={last} mode={mode} today={date}
    program={program} lastWorkoutLogged={data?.lastWorkoutLogged} hasActiveSession={Boolean(active)} />
  const openReview = () => {
    startMutation.reset()
    setReviewOpen(true)
  }

  // Active session wins. A programme review never blocks Resume, including
  // when the live session itself is ad-hoc.
  if (active) {
    return (
      <Screen>
        <TodayHeader key={`header:${user!.id}`} date={date} program={program} session={active} mode={mode} ready activeSessionId={active.sessionId}
          subtitle={active.kind === 'ad_hoc' || active.isAdHoc ? 'Ad-hoc workout' : undefined} />
        <TodayActiveSessionCard
          session={active}
          onResume={() => openSession(active.sessionId)}
        />
        {lastWorkout}
        <ProgressionReviewAlert decisions={pending} onReview={openReview} />
        <ProgressionReviewSheet
          key={user!.id}
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
        <TodayHeader
          key={`header:${user!.id}`} date={date} ready
          subtitle={program ? 'Your programme is complete. Choose what comes next.' : 'Choose a plan, or make today your own.'}
        />
        <EmptyState
          title={program ? 'Plan completed' : 'No active program'}
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
          Choose a programme from Plan, or start a one-off workout now.
        </EmptyState>
        {lastWorkout}
      </Screen>
    )
  }

  return (
    <Screen>
      <TodayHeader key={`header:${user!.id}`} date={date} program={program} session={planned} mode={mode} ready />

      <TodayPlannedSessionCard
        session={planned}
        program={program}
        mode={me.data?.experienceMode}
        onReview={openReview}
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
      {lastWorkout}
      {!last ? <ReturnGuideCard program={program} today lastWorkoutLogged={data?.lastWorkoutLogged} /> : null}

      <ProgressionReviewSheet
        key={user!.id}
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
