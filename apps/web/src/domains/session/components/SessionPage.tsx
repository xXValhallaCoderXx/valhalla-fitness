import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { sessionQueryOptions, todayQueryOptions } from '~/domains/session/queries'
import { finishSessionFn } from '~/domains/session/server/session-functions'
import { isSessionMutationKey } from '~/domains/session/lib/session-mutations'
import { buildFocusSessionSteps, buildLiveSessionSteps } from '~/domains/onboarding/onboarding-tour'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import type { WorkoutSession } from '~/shared/types'
import { EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
import { cn } from '~/shared/lib/cn'
import { FinishSessionModal, type FinishReflection } from './FinishSessionModal'
import { DiscardWorkoutDialog } from './DiscardWorkoutDialog'
import { LiveSessionFrame } from './LiveSession'
import { LiveFocusView } from './LiveFocusView'
import { RestTimerProvider } from './RestTimerProvider'

export function SessionPage({ sessionId, user }: { sessionId: string; user: unknown }) {
  const sessionQuery = useQuery({
    ...sessionQueryOptions(sessionId),
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
  const router = useRouter()
  const [notes, setNotes] = useState(session.notes ?? '')
  const [finishError, setFinishError] = useState<string | null>(null)
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

  const finishMutation = useMutation({
    mutationKey: ['finishSession', sessionId],
    mutationFn: (reflection: FinishReflection) =>
      finishSessionFn({ data: { sessionId, notes, ...reflection } }),
    onMutate: () => {
      setFinishError(null)
    },
    onSuccess: async (summary) => {
      const queryClient = router.options.context.queryClient
      notifications.show({
        color: 'success',
        title: 'Session finished',
        message: `${summary.completedSets} of ${summary.totalSets} sets completed. ${
          session.isAdHoc ? 'Logged to your history.' : 'Your next session is ready.'
        }`,
      })
      queryClient.setQueryData(['summary', sessionId], summary)
      queryClient.setQueryData(['session', sessionId], summary.session)
      // Cache refreshes are best-effort: the session is already finished on the
      // server, so a failed refetch must never strand the user in the finish
      // modal — always reach the summary.
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['today'] }),
          queryClient.invalidateQueries({ queryKey: ['history'] }),
          queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        ])
        await queryClient.fetchQuery(todayQueryOptions())
      } catch {
        void queryClient.invalidateQueries({ queryKey: ['today'] })
      }
      await router.navigate({ to: '/sessions/$sessionId/summary', params: { sessionId } })
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Unable to finish this session')
      // A retry after a lost response lands here even though the finish
      // committed — treat it as success and get the user to their summary.
      if (message.includes('already finished')) {
        void router.navigate({ to: '/sessions/$sessionId/summary', params: { sessionId } })
        return
      }
      setFinishError(message)
      notifications.show({ color: 'danger', title: 'Could not finish session', message })
    },
  })

  const requestFinish = () => {
    setFinishError(null)
    if (finishBlocked || sessionMutationPending) return
    setShowFinishModal(true)
  }

  const requestDiscard = () => {
    if (sessionMutationPending) return
    setShowDiscardDialog(true)
  }

  const confirmFinish = (reflection: FinishReflection) => {
    if (finishMutation.isPending) return
    finishMutation.mutate(reflection, { onSuccess: () => setShowFinishModal(false) })
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
            finishError={finishError}
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
