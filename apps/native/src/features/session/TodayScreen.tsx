import { ReturnGuideCard } from '@/features/program/return/ReturnGuideCard'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { getToday } from '@sheetless/data/session/reads'
import { createAccountClock } from '@sheetless/domain/shared/dates'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import {
  Button,
  Panel,
  Text,
} from '@/components'
import { ProgressionReviewAlert } from '@/features/program/progression/ProgressionReviewAlert'
import { ProgressionReviewSheet } from '@/features/program/progression/ProgressionReviewSheet'
import { buildUserContext, useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { useTimezoneSync } from '@/lib/use-timezone-sync'
import { useStartPlannedWorkout } from './today/useStartPlannedWorkout'
import { TodayNoPlan } from './today/TodayNoPlan'
import { TodayWeekSummary } from './today/TodayWeekSummary'
import { todayHistorySupportQueryOptions } from '@/features/history/queries'
import { TodayActiveSessionCard } from './today/TodayActiveSessionCard'
import { TodayPlannedSessionCard } from './today/TodayPlannedSessionCard'
import { LastWorkoutCard } from './today/LastWorkoutCard'
import { TodayHeader } from './today/TodayHeader'
import { TodayLayout as Screen } from './today/TodayLayout'
import { AdvancedInvitation } from '@/features/settings/preferences/AdvancedInvitation'
import { CycleBoundaryCard } from '@/features/program/cycle/CycleBoundaryCard'

export function TodayScreen() {
  const { user } = useSession()
  const me = useMe()
  const startMutation = useStartPlannedWorkout(user)
  const activeStartMutations = startMutation.activeStarts
  const [reviewOpen, setReviewOpen] = useState(false)
  useTimezoneSync()

  const today = useQuery({
    queryKey: user ? accountQueryKeys.today(user.id) : ['account', 'anonymous', 'today'],
    queryFn: () => getToday(buildUserContext(user!), me.data?.timezone ?? undefined),
    enabled: Boolean(user) && me.isSuccess,
    staleTime: queryStaleTimes.today,
  })

  const history = useQuery({
    ...todayHistorySupportQueryOptions(user),
    enabled: Boolean(user) && me.isSuccess,
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
  const weekSummary = <TodayWeekSummary data={history.data ?? undefined} mode={mode}
    plannedDays={program?.templateDefinition?.daysPerWeek} loading={history.isFetching} error={history.isError}
    onRetry={() => void history.refetch()} />
  const streakWeeks = history.data?.consistency.currentStreakWeeks

  const recentHistoryError = data?.historyReadError ? <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
    <Text size="sm" tone="dimmed">Your recent training history could not load. You can still start or resume a workout.</Text>
    <Button label="Retry recent history" variant="subtle" loading={today.isFetching} onPress={() => void today.refetch()} />
  </Panel> : null
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
        <TodayHeader key={`header:${user!.id}`} date={date} program={program} session={active} mode={mode} ready streakWeeks={streakWeeks} activeSessionId={active.sessionId}
          subtitle={active.kind === 'ad_hoc' || active.isAdHoc ? 'Ad-hoc workout' : undefined} />
        <TodayActiveSessionCard
          session={active}
          onResume={() => openSession(active.sessionId)}
        />
        <AdvancedInvitation key={`advanced:${user!.id}`} user={user!} />
        {weekSummary}
        {recentHistoryError}
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

  if (program?.cycleBoundary) return <Screen>
    <TodayHeader key={`header:${user!.id}`} date={date} program={program} ready streakWeeks={streakWeeks} subtitle="Your cycle is complete." />
    <CycleBoundaryCard key={`${user!.id}:${program.cycleBoundary.id}`} user={user!} boundary={program.cycleBoundary} />
    {weekSummary}{recentHistoryError}{lastWorkout}
  </Screen>

  if (!program || !planned) {
    return (
      <Screen>
        <TodayHeader key={`header:${user!.id}`} date={date} ready streakWeeks={streakWeeks}
          subtitle={data?.lastEndedProgram ? 'Choose what comes next.' : last || data?.historyReadError ? 'Make today your own.' : me.data?.displayName ? `Welcome to Sheetless, ${me.data.displayName}.` : 'Welcome to Sheetless.'} />
        <TodayNoPlan ended={data?.lastEndedProgram} hasHistory={Boolean(last) || Boolean(data?.historyReadError)} timeZone={me.data?.timezone} />
        <AdvancedInvitation key={`advanced:${user!.id}`} user={user!} />
        {last ? weekSummary : null}
        {recentHistoryError}
        {lastWorkout}
      </Screen>
    )
  }

  return (
    <Screen>
      <TodayHeader key={`header:${user!.id}`} date={date} program={program} session={planned} mode={mode} ready streakWeeks={streakWeeks} />
      {weekSummary}

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
      <AdvancedInvitation key={`advanced:${user!.id}`} user={user!} />
      {recentHistoryError}
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
