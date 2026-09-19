import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { streakBadgeLabel } from '@sheetless/domain/history/consistency'
import { progressionReasonClause } from '@sheetless/domain/program/progression-reason'
import { guidedWeekCharacter } from '@sheetless/domain/program/week-character'
import { buildTodayWeek } from '@sheetless/domain/session/today-week'
import { createAccountClock, formatWeekdayLongDate } from '@sheetless/domain/shared/dates'
import { Badge, Button, PageHeader, Panel, Screen, SettingsHeaderAction, Text } from '@/components'
import { ReturnGuideCard } from '@/features/program/return/ReturnGuideCard'
import { ProgressionReviewAlert } from '@/features/program/progression/ProgressionReviewAlert'
import { ProgressionReviewSheet } from '@/features/program/progression/ProgressionReviewSheet'
import { useExperienceMode } from '@/lib/experience-mode'
import { spacing } from '@/lib/tokens'
import { FullModeHint } from './today/FullModeHint'
import { StartBlankWorkoutButton } from './today/StartBlankWorkoutButton'
import { TodayActiveSessionCard } from './today/TodayActiveSessionCard'
import { TodayGettingStarted } from './today/TodayGettingStarted'
import { TodayLastWorkout, TodayWeekContext } from './today/TodayContext'
import { TodayPlannedSessionCard } from './today/TodayPlannedSessionCard'
import { useTodaySession } from './today/useTodaySession'

export function TodayScreen() {
  const { user, me, today, history, start, activeStarts } = useTodaySession()
  const { isFull, showFormulas } = useExperienceMode()
  const [reviewOpen, setReviewOpen] = useState(false)
  const streakLabel = streakBadgeLabel(history.data?.consistency)
  const actions = (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
      {isFull ? <Badge tone="action">{showFormulas ? 'Full · fx' : 'Full'}</Badge> : null}
      {streakLabel ? <Badge tone="warning">{streakLabel}</Badge> : null}
      <SettingsHeaderAction testID="today-settings" />
    </View>
  )
  const failedQuery = me.isError ? me : today.isError ? today : null
  if (failedQuery) {
    return (
      <Screen>
        <PageHeader title="Today" actions={actions} />
        <Panel style={{ gap: spacing.sm, padding: spacing.lg }}>
          <Text weight={700}>Your training day could not load.</Text>
          <Text tone="danger" size="sm">{failedQuery.error instanceof Error ? failedQuery.error.message : 'Try again when your connection is stable.'}</Text>
          <Button label="Retry" variant="default" loading={failedQuery.isFetching} onPress={() => void failedQuery.refetch()} />
        </Panel>
      </Screen>
    )
  }
  if (me.isPending || today.isPending || !today.data || !me.data) {
    return <Screen><PageHeader title="Today" actions={actions} /><Panel style={{ padding: spacing.lg }}><Text tone="dimmed">Loading your training day…</Text></Panel></Screen>
  }

  const data = today.data
  const active = data.activeSession
  const planned = data.plannedSession
  const program = data.activeProgram
  const pending = data.pendingDecisions
  const last = data.lastCompletedSession ?? data.completedSession
  const week = program?.templateDefinition ? buildTodayWeek(program, program.templateDefinition) : null
  const session = active ?? planned
  const subtitle = [
    active?.isAdHoc ? 'Your workout, your pace' : program?.title,
    week ? `Week ${week.weekNumber} of ${week.totalWeeks}` : session?.weekLabel,
    session?.hardness ? isFull ? session.hardness : guidedWeekCharacter[session.hardness] : null,
  ].filter(Boolean).join(' · ')
  const reasons: Record<string, string> = {}
  for (const decision of data.acceptedDecisions ?? []) {
    if (!decision.stateKey) continue
    const reason = progressionReasonClause(decision, planned?.units ?? program?.units ?? me.data.units)
    if (reason) reasons[decision.stateKey] = reason
  }
  const openReview = () => {
    start.reset()
    setReviewOpen(true)
  }

  return (
    <Screen>
      <PageHeader
        title="Today"
        eyebrow={formatWeekdayLongDate(createAccountClock({ timeZone: me.data.timezone }).today)}
        subtitle={subtitle || 'Your next workout starts here.'}
        actions={actions}
      />
      <FullModeHint key={`${user!.id}-${last?.sessionId ?? 'first-workout'}`} user={user!} profile={me.data} />
      {active ? (
        // Resume remains available even when the programme has pending choices.
        <TodayActiveSessionCard session={active} onResume={() => router.push({ pathname: '/session/[sessionId]', params: { sessionId: active.sessionId } })} />
      ) : null}
      <ProgressionReviewAlert decisions={pending} onReview={openReview} />
      {!active && program && planned ? (
        <>
          {data.completedSession ? <Text size="sm" tone="success">Today’s workout is complete. Your next planned workout is ready whenever you are.</Text> : null}
          <TodayPlannedSessionCard
            session={planned}
            program={program}
            week={week}
            reasonByStateKey={reasons}
            completedToday={Boolean(data.completedSession)}
            pendingDecisionCount={pending.length}
            isStarting={start.isPending}
            startDisabled={activeStarts > 0 && !start.isPending}
            startError={start.isError ? start.error instanceof Error ? start.error.message : 'The workout could not start.' : null}
            onStart={() => start.mutate()}
          />
          <ReturnGuideCard program={program} today lastWorkoutLogged={data.lastWorkoutLogged} />
          <StartBlankWorkoutButton />
        </>
      ) : null}
      {!active && !program ? <TodayGettingStarted user={user!} returning={Boolean(last)} /> : null}
      {!active && program && !planned ? (
        <Panel style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text weight={700}>{data.completedSession ? 'Your workout is complete' : 'No planned workout is ready'}</Text>
          <Text size="sm" tone="dimmed">Take a rest day, check your programme, or start a blank workout when you’re ready.</Text>
          <Button label="Open your plan" variant="default" onPress={() => router.navigate('/(tabs)/program')} />
          <StartBlankWorkoutButton />
        </Panel>
      ) : null}
      {week ? <TodayWeekContext week={week} /> : null}
      {last ? <TodayLastWorkout session={last} completedToday={last.sessionId === data.completedSession?.sessionId} /> : null}
      <ProgressionReviewSheet
        key={user!.id}
        open={reviewOpen}
        decisions={pending}
        units={program?.units ?? active?.units ?? planned?.units ?? me.data.units}
        user={user!}
        contextLabel={active ? 'Before your next planned workout' : program?.title ?? 'Your programme'}
        onClose={() => setReviewOpen(false)}
      />
    </Screen>
  )
}
