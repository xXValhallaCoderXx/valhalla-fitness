import { ActionIcon, Tooltip } from '@mantine/core'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { buildTodayWeek } from '@sheetless/domain/session/today-week'
import { progressionReasonClause } from '@sheetless/domain/program/progression-reason'
import { guidedWeekCharacter } from '@sheetless/domain/program/week-character'
import { InspectorLayout, Page, Panel } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import type { TodayHistorySupport } from '~/domains/history'
import { OnboardingPanel } from '~/domains/onboarding/OnboardingPanel'
import {
  PendingProgressionReviewModal,
  PendingReviewAlert,
} from '~/domains/program/components/PendingReview'
import { ReturnGuideCard } from '~/domains/program/components/return/ReturnGuideCard'
import { ProgramEquipmentModeControl } from '~/domains/program'
import type { ProgressionDecision } from '~/domains/program'
import type { PlannedSession, TodayPayload } from '~/domains/session'
import { cn } from '~/shared/lib/cn'
import { FullModeHint } from './FullModeHint'
import { RecoveryCheckPanel } from './TodayPanels'
import { ShowFormulasToggle } from './ShowFormulasToggle'
import { TodayHeader } from './TodayHeader'
import { TodayLastSessionCard } from './TodayLastSessionCard'
import { TodaySessionCard } from './TodaySessionCard'
import { TodayTraceInspector } from './TodayTraceInspector'
import { TodayWeekCard } from './TodayWeekCard'

/** Today before a workout starts — the session hero, this week, and the last workout's receipt. */
export function TodayPlannedSession({
  data,
  plannedSession,
  history,
  historyPending,
  historyError,
  pendingDecisions,
  reviewOpen,
  onReviewOpen,
  onReviewClose,
  onDecisionResolved,
  onStart,
  startPending,
  onStartAdHoc,
  adHocPending,
}: {
  data: TodayPayload
  plannedSession: PlannedSession
  history?: TodayHistorySupport
  historyPending: boolean
  historyError: boolean
  pendingDecisions: ProgressionDecision[]
  reviewOpen: boolean
  onReviewOpen: () => void
  onReviewClose: () => void
  onDecisionResolved: (decisionId: string) => void
  onStart: () => void
  startPending: boolean
  onStartAdHoc: () => void
  adHocPending: boolean
}) {
  const { isFull } = useExperienceMode()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const definition = data.activeProgram?.templateDefinition
  const week = data.activeProgram && definition ? buildTodayWeek(data.activeProgram, definition) : null
  const isNext = Boolean(data.completedSession)

  const subtitle = [
    plannedSession.programTitle,
    week ? `week ${week.weekNumber} of ${week.totalWeeks}` : plannedSession.weekLabel,
    // Full names the phase and the hardness token; Guided says what that hardness feels like.
    ...(isFull
      ? [plannedSession.phaseLabel, plannedSession.hardness]
      : [plannedSession.hardness ? guidedWeekCharacter[plannedSession.hardness] : null]),
  ]
    .filter(Boolean)
    .join(' · ')

  // Rows explain a load that already moved, so the reason comes from *accepted* decisions —
  // pending ones are changes nobody has applied yet.
  const reasonByStateKey: Record<string, string> = {}
  for (const decision of data.acceptedDecisions ?? []) {
    if (!decision.stateKey) continue
    const clause = progressionReasonClause(decision, plannedSession.units)
    if (clause) reasonByStateKey[decision.stateKey] = clause
  }

  const sessionCard = (
    <TodaySessionCard
      session={plannedSession}
      program={data.activeProgram}
      sessionNumber={week?.sessionNumber}
      daysPerWeek={week?.daysPerWeek}
      isNext={isNext}
      reasonByStateKey={reasonByStateKey}
      pendingDecisions={pendingDecisions}
      onReview={onReviewOpen}
      onStart={onStart}
      startPending={startPending}
      selectedSlotId={selectedSlotId}
      onSelectSlot={setSelectedSlotId}
    />
  )

  const sideCards = (
    <>
      {week ? <TodayWeekCard week={week} /> : null}
      {data.lastCompletedSession ? (
        <TodayLastSessionCard session={data.lastCompletedSession} pendingDecisions={pendingDecisions} />
      ) : null}
    </>
  )

  return (
    <Page className="pb-24 md:pb-16">
      <OnboardingPanel />
      <FullModeHint />
      {data.activeProgram ? (
        <ReturnGuideCard program={data.activeProgram} today lastWorkoutLogged={data.lastWorkoutLogged} />
      ) : null}

      <TodayHeader
        scheduledDate={plannedSession.scheduledDate}
        subtitle={subtitle}
        actions={<ShowFormulasToggle />}
      />

      {pendingDecisions.length ? (
        <PendingReviewAlert decisions={pendingDecisions} onReview={onReviewOpen} className="mb-4" />
      ) : null}

      <InspectorLayout
        inspector={
          <TodayTraceInspector
            session={plannedSession}
            program={data.activeProgram}
            selectedSlotId={selectedSlotId}
          />
        }
      >
        {/* Guided sets the hero beside its context; Full gives the wider table its own row and
            drops the context cards beneath, because the trace rail already takes 20rem. */}
        <div
          className={cn(
            'grid gap-4',
            isFull
              ? 'lg:grid-cols-[minmax(0,1fr)]'
              : 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start',
          )}
        >
          {sessionCard}
          <div
            className={cn(
              'grid gap-4',
              isFull ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]' : 'lg:content-start',
            )}
          >
            {sideCards}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <RecoveryCheckPanel history={history} isPending={historyPending} isError={historyError} />
          {data.activeProgram ? (
            <Panel surface="inset" p="sm">
              <ProgramEquipmentModeControl program={data.activeProgram} compact />
            </Panel>
          ) : null}
        </div>
      </InspectorLayout>

      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        onClose={onReviewClose}
        onResolved={onDecisionResolved}
      />

      {/* Ad-hoc entry stays ungated by pending reviews (unlike "Start workout"). */}
      <div
        className={cn(
          'fixed right-4 bottom-[calc(var(--vf-mobile-bottom-offset)+1rem)] z-30 md:right-6 md:bottom-6',
          isFull && 'lg:right-[22rem]',
        )}
      >
        <Tooltip label="Blank workout">
          <ActionIcon
            size={56}
            radius={9999}
            variant="filled"
            color="action"
            aria-label="Blank workout"
            disabled={adHocPending}
            onClick={onStartAdHoc}
            style={{ boxShadow: 'var(--vf-shadow-card)' }}
          >
            <Plus size={24} />
          </ActionIcon>
        </Tooltip>
      </div>
    </Page>
  )
}
