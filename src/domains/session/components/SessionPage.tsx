import { useMutation, useQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { sessionQueryOptions, todayQueryOptions } from '~/domains/session/queries'
import { finishSessionFn } from '~/domains/session/server/session-functions'
import { buildLiveSessionSteps } from '~/domains/onboarding/onboarding-tour'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import type { WorkoutSession } from '~/shared/types'
import { ConfirmDialog, EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
import { LiveSessionFrame } from './LiveSession'

const LIVE_TOUR_AUTORUN_KEY = 'sheetless.liveTourAutorun'

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
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const defaultOpenMovementId =
    session.movements.find((movement) => movement.sets.some((set) => !set.completed))?.id ??
    session.movements[0]?.id
  const [activeMovementId, setActiveMovementId] = useState(defaultOpenMovementId ?? '')

  // First-workout coach-marks: auto-run once per device on a genuinely fresh session, or
  // whenever forced via `?tour=live` (Settings replay / e2e). Capture freshness at mount so
  // the one-shot timer isn't cancelled when `session` is replaced on each set save.
  const search = useRouterState({ select: (state) => state.location.search as Record<string, unknown> })
  const forceLiveTour = search.tour === 'live'
  const { start: startLiveTour } = useOnboardingTour(buildLiveSessionSteps, 'live')
  const [sessionWasFresh] = useState(
    () => !session.movements.some((movement) => movement.sets.some((set) => set.completed)),
  )
  const liveTourRan = useRef(false)
  useEffect(() => {
    if (liveTourRan.current || typeof window === 'undefined') return
    if (!forceLiveTour) {
      if (window.localStorage.getItem(LIVE_TOUR_AUTORUN_KEY)) return
      if (!sessionWasFresh) return
    }
    liveTourRan.current = true
    if (!forceLiveTour) window.localStorage.setItem(LIVE_TOUR_AUTORUN_KEY, '1')
    const timer = window.setTimeout(() => {
      if (document.querySelector('[data-tour="live-movement"]')) startLiveTour()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [forceLiveTour, sessionWasFresh, startLiveTour])

  const sets = session.movements.flatMap((movement) => movement.sets)
  const incompleteSetCount = sets.filter((set) => !set.completed).length
  const savingSetCount = sets.filter((set) => set.syncState === 'saving').length
  const failedSetCount = sets.filter((set) => set.syncState === 'syncFailed').length
  const finishBlocked = savingSetCount > 0 || failedSetCount > 0
  const finishBlockedReason = failedSetCount
    ? `${failedSetCount} set ${failedSetCount === 1 ? 'needs' : 'need'} to be retried before finishing.`
    : null

  const finishMutation = useMutation({
    mutationFn: () => finishSessionFn({ data: { sessionId, notes } }),
    onMutate: () => {
      setFinishError(null)
    },
    onSuccess: async (summary) => {
      const queryClient = router.options.context.queryClient
      notifications.show({
        color: 'success',
        title: 'Session finished',
        message: `${summary.completedSets} of ${summary.totalSets} sets completed. Your next session is ready.`,
      })
      queryClient.setQueryData(['summary', sessionId], summary)
      queryClient.setQueryData(['session', sessionId], summary.session)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
        queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
      ])
      await queryClient.fetchQuery(todayQueryOptions())
      await router.navigate({ to: '/sessions/$sessionId/summary', params: { sessionId } })
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Unable to finish this session')
      setFinishError(message)
      notifications.show({ color: 'danger', title: 'Could not finish session', message })
    },
  })

  const requestFinish = () => {
    setFinishError(null)
    if (finishBlocked) return
    if (incompleteSetCount) {
      setShowFinishConfirm(true)
      return
    }
    finishMutation.mutate()
  }

  const confirmFinish = () => {
    setShowFinishConfirm(false)
    finishMutation.mutate()
  }

  return (
    <Page className="max-w-none md:py-8">
      <LiveSessionFrame
        session={session}
        activeMovementId={activeMovementId}
        onSelectMovement={setActiveMovementId}
        notes={notes}
        onNotesChange={setNotes}
        onFinish={requestFinish}
        finishLabel={finishMutation.isPending ? 'Finishing...' : 'Finish'}
        finishDisabled={finishMutation.isPending || finishBlocked}
        finishBlockedReason={finishBlockedReason}
        finishError={finishError}
      />
      <ConfirmDialog
        open={showFinishConfirm}
        title="Finish here?"
        confirmLabel="Finish anyway"
        cancelLabel="Keep going"
        isPending={finishMutation.isPending}
        onCancel={() => setShowFinishConfirm(false)}
        onConfirm={confirmFinish}
      >
        You have {incompleteSetCount} set{incompleteSetCount === 1 ? '' : 's'} left to log. Finishing now is fine — Sheetless
        only uses the sets you&apos;ve logged and won&apos;t make aggressive changes.
      </ConfirmDialog>
    </Page>
  )
}
