import { useMutation, useQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { sessionQueryOptions, todayQueryOptions } from '~/lib/query-options'
import { loadRouteQuery } from '~/lib/route-loading'
import { finishSessionFn } from '~/server/api'
import type { WorkoutSession } from '~/types/training'
import { ConfirmDialog, EmptyState, Page, PageLoadError, PageSkeleton } from '~/components/ui'
import { LiveSessionFrame } from '~/features/workout/components'

export const Route = createFileRoute('/sessions/$sessionId')({
  loader: async ({ context, params }) => {
    if ((context as any).user) {
      await loadRouteQuery(context.queryClient, sessionQueryOptions(params.sessionId))
    }
  },
  component: SessionRoute,
})

function SessionRoute() {
  const { sessionId } = Route.useParams()
  const user = (Route.useRouteContext() as any).user
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
      await router.navigate({ to: '/today' })
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
        title="Finish with incomplete sets?"
        confirmLabel="Finish anyway"
        cancelLabel="Review sets"
        isPending={finishMutation.isPending}
        onCancel={() => setShowFinishConfirm(false)}
        onConfirm={confirmFinish}
      >
        {incompleteSetCount} set{incompleteSetCount === 1 ? '' : 's'} are still incomplete. You can finish now, but
        progression recommendations will only use completed sets with saved reps and RIR.
      </ConfirmDialog>
    </Page>
  )
}
