import { ActionIcon, Badge, Button, Tooltip, VisuallyHidden } from '@mantine/core'
import { ArrowRight, Dumbbell, Lock, Play, Plus } from 'lucide-react'
import { Caption, Heading, Page, Panel, Text } from '~/components'
import { intensityColor } from '~/domains/history/lib/insights'
import { OnboardingPanel } from '~/domains/onboarding/OnboardingPanel'
import { PendingProgressionReviewModal, PendingReviewAlert, PendingReviewGate } from '~/domains/program/components/PendingReview'
import { formatPreviousHero } from '~/domains/session/lib/today-numbers'
import type { HistoryDashboard, PlannedSession, ProgressionDecision, TodayPayload } from '~/shared/types'
import { TodayWorkoutLedger } from '../TodayWorkoutLedger'
import { RecoveryCheckPanel } from './TodayPanels'

/** Today view before a workout starts — the planned session hero, ledger, and start actions. */
export function TodayPlannedSession({
  data,
  plannedSession,
  history,
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
  history?: HistoryDashboard
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
  const main = plannedSession.movements.find((movement) => movement.role === 'main')
  const startLabel = data.completedSession ? 'Start next session' : 'Start workout'
  const startLocked = pendingDecisions.length > 0
  const heroLastLine = main ? formatPreviousHero(main.previous, plannedSession.units) : null

  return (
    <Page className="max-w-3xl pb-24 md:pb-16">
      <OnboardingPanel />
      <VisuallyHidden>
        <Heading order={1}>Today</Heading>
      </VisuallyHidden>

      {pendingDecisions.length ? (
        <PendingReviewAlert decisions={pendingDecisions} onReview={onReviewOpen} className="mb-4" />
      ) : null}

      {/* minmax(0,1fr): an auto track would size to the widest card's intrinsic width and overflow narrow screens. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <Panel className="space-y-4 vf-card-hover" p="md">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="action" variant="filled">{data.completedSession ? 'Next session' : 'Ready'}</Badge>
              {plannedSession.hardness ? (
                <Badge color={intensityColor(plannedSession.hardness)}>{plannedSession.hardness}</Badge>
              ) : null}
            </div>
            <Heading mt="xs" order={2} size="h3" lh={1.15}>{plannedSession.title}</Heading>
            <Text mt={4} size="sm" tone="dimmed">
              {plannedSession.movements.length} movements · {plannedSession.estimatedMinutes} min
            </Text>
          </div>

          {main ? (
            <Panel surface="inset" p="sm" style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}>
              <div className="flex items-center justify-between gap-3">
                <Badge color="action" leftSection={<Dumbbell size={12} />}>Main lift</Badge>
                <ArrowRight color="var(--mantine-color-dimmed)" size={16} />
              </div>
              <Heading mt="xs" order={3} size="h4" lh={1.15} className="truncate">{main.movementName}</Heading>
              <Text mt={2} size="sm" tone="dimmed">{main.targetSummary}</Text>
              {heroLastLine ? <Caption mt={6} truncate>{heroLastLine}</Caption> : null}
            </Panel>
          ) : null}

          <div>
            <PendingReviewGate
              pendingCount={pendingDecisions.length}
              onReview={onReviewOpen}
              className="flex w-full"
            >
              {/* Mantine's fullWidth, not a Tailwind w-full: unlayered Button styles beat layered
                  utilities, leaving the button narrow while the popover anchor span spans the card. */}
              <Button
                fullWidth
                disabled={startPending || startLocked}
                style={startLocked ? { pointerEvents: 'none' } : undefined}
                onClick={startLocked ? undefined : onStart}
              >
                {startLocked ? <Lock size={16} /> : <Play size={16} />}
                {startPending ? 'Starting...' : startLabel}
              </Button>
            </PendingReviewGate>
            {startLocked ? (
              <Caption component="p" mt={6} ta="center">
                Unlocks after you review the {pendingDecisions[0].movementName} progression
              </Caption>
            ) : null}
          </div>
        </Panel>

        <TodayWorkoutLedger session={plannedSession} />
        <RecoveryCheckPanel history={history} />
      </div>
      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        onClose={onReviewClose}
        onResolved={onDecisionResolved}
      />

      {/* Ad-hoc entry stays ungated by pending reviews (unlike "Start workout"). */}
      <div className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] z-30 md:right-6 md:bottom-6">
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
