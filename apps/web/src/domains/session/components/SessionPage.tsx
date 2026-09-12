import { useIsMutating, useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { sessionQueryOptions } from '~/domains/session/queries'
import { isSessionMutationKey } from '~/domains/session/lib/session-mutations'
import { useFinishSession } from '~/domains/session/lib/useFinishSession'
import { buildFocusSessionSteps, buildLiveSessionSteps } from '~/domains/onboarding/onboarding-tour'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import type { WorkoutSession } from '~/domains/session'
import { EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
import { cn } from '~/shared/lib/cn'
import { FinishSessionModal, type FinishReflection } from './FinishSessionModal'
import { DiscardWorkoutDialog } from './DiscardWorkoutDialog'
import { LiveSessionFrame } from './LiveSession'
import { LiveFocusView } from './LiveFocusView'
import { RestTimerProvider } from './RestTimerProvider'

export function SessionPage({
  sessionId,
  user,
}: {
  sessionId: string
  user: AuthUser | null
}) {
  const sessionQuery = useQuery({
    ...sessionQueryOptions(user?.id ?? '', sessionId),
    enabled: Boolean(user),
  })

  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to open this workout">Workout logs are tied to your account.</EmptyState>
      </Page>
    )
  }

  if (sessionQuery.isPending) return <PageSkeleton />
  if (sessionQuery.isError) return <PageLoadError error={sessionQuery.error} onRetry={() => void sessionQuery.refetch()} />

  return <LoadedSessionRoute sessionId={sessionId} session={sessionQuery.data} />
}

function LoadedSessionRoute({
  session,
  sessionId,
}: {
  session: WorkoutSession
  sessionId: string
}) {
  const [notes, setNotes] = useState(session.notes ?? '')
  const finishMutation = useFinishSession(session, notes)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const sessionMutationPending = useIsMutating({
    predicate: (mutation) => isSessionMutationKey(mutation.options.mutationKey, sessionId),
  }) > 0
  const defaultOpenMovementId =
    session.movements.find((movement) => movement.sets.some((set) => !set.completed))?.id ??
    session.movements[0]?.id
  const [activeMovementId, setActiveMovementId] = useState(defaultOpenMovementId ?? '')

  // Settings replay / e2e can still force the walkthrough. First-run discovery
  // now lives in LiveSessionOnboarding, so nothing auto-runs here.
  const search = useRouterState({ select: (state) => state.location.search as Record<string, unknown> })
  const forceLiveTour = search.tour === 'live'
  const forceFocusTour = search.tour === 'focus'
  // Mobile shows the single-exercise Focus view by default; Overview is the existing list.
  // The live walkthrough spotlights elements in the Overview frame, so it starts there —
  // as does an empty ad-hoc session, whose add-exercise flow is clearest in the list view.
  const [mobileView, setMobileView] = useState<'focus' | 'overview'>(() =>
    forceLiveTour || (session.isAdHoc && session.movements.length === 0) ? 'overview' : 'focus',
  )
  const { start: startLiveTour } = useOnboardingTour(buildLiveSessionSteps, 'live')
  const { start: startFocusTour } = useOnboardingTour(buildFocusSessionSteps, 'focus')
  const liveTourRan = useRef(false)
  const focusTourRan = useRef(false)
  useEffect(() => {
    if (!forceLiveTour || liveTourRan.current || typeof window === 'undefined') return
    liveTourRan.current = true
    const timer = window.setTimeout(() => {
      if (document.querySelector('[data-tour="live-movement"]')) startLiveTour()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [forceLiveTour, startLiveTour])
  useEffect(() => {
    if (!forceFocusTour || focusTourRan.current || typeof window === 'undefined') return
    focusTourRan.current = true
    const timer = window.setTimeout(() => {
      if (document.querySelector('[data-tour="focus-log"]')) startFocusTour()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [forceFocusTour, startFocusTour])

  const sets = session.movements.flatMap((movement) => movement.sets)
  const incompleteSetCount = sets.filter((set) => !set.completed).length
  const savingSetCount = sets.filter((set) => set.syncState === 'saving').length
  const failedSetCount = sets.filter((set) => set.syncState === 'syncFailed').length
  const finishBlocked = savingSetCount > 0 || failedSetCount > 0
  const finishBlockedReason = failedSetCount
    ? `${failedSetCount} set ${failedSetCount === 1 ? 'needs' : 'need'} to be retried before finishing.`
    : null

  const requestFinish = () => {
    finishMutation.clearError()
    if (finishBlocked || sessionMutationPending) return
    setShowFinishModal(true)
  }

  const requestDiscard = () => {
    if (sessionMutationPending) return
    setShowDiscardDialog(true)
  }

  const confirmFinish = (reflection: FinishReflection) => {
    if (finishMutation.isPending) return
    finishMutation.mutate(
      {
        reflection,
        requestId: finishMutation.requestIdFor({
          notes: notes.trim() || null,
          ...reflection,
        }),
      },
      { onSuccess: () => setShowFinishModal(false) },
    )
  }

  return (
    <RestTimerProvider>
      <Page className="max-w-none md:py-8">
        <div className={cn('md:hidden', mobileView !== 'focus' && 'hidden')}>
          <LiveFocusView
            session={session}
            activeMovementId={activeMovementId}
            onSelectMovement={setActiveMovementId}
            onExitToOverview={() => setMobileView('overview')}
            onFinish={requestFinish}
            finishLabel={finishMutation.isPending ? 'Finishing...' : 'Finish'}
            finishDisabled={finishMutation.isPending || finishBlocked || sessionMutationPending}
            onDiscard={requestDiscard}
            discardDisabled={sessionMutationPending}
          />
        </div>
        <div className={cn(mobileView !== 'overview' && 'hidden md:block')}>
          <LiveSessionFrame
            session={session}
            activeMovementId={activeMovementId}
            onSelectMovement={setActiveMovementId}
            notes={notes}
            onNotesChange={setNotes}
            onFinish={requestFinish}
            finishLabel={finishMutation.isPending ? 'Finishing...' : 'Finish'}
            finishDisabled={finishMutation.isPending || finishBlocked || sessionMutationPending}
            finishBlockedReason={finishBlockedReason}
            finishError={finishMutation.errorMessage}
            onEnterFocus={() => setMobileView('focus')}
            managementPending={sessionMutationPending}
            onDiscard={requestDiscard}
            discardDisabled={sessionMutationPending}
          />
        </div>
        <FinishSessionModal
          open={showFinishModal}
          incompleteSetCount={incompleteSetCount}
          isPending={finishMutation.isPending}
          onCancel={() => setShowFinishModal(false)}
          onFinish={confirmFinish}
        />
        <DiscardWorkoutDialog
          open={showDiscardDialog}
          session={session}
          onClose={() => setShowDiscardDialog(false)}
        />
      </Page>
    </RestTimerProvider>
  )
}
