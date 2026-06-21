import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Flag } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { sessionQueryOptions } from '~/lib/query-options'
import { finishSessionFn } from '~/server/api'
import { Button, ConfirmDialog, Page } from '~/components/ui'
import {
  IncompleteMainWarning,
  MovementCard,
  NotesBox,
  SessionProgress,
  SyncPill,
} from '~/features/workout/components'

export const Route = createFileRoute('/sessions/$sessionId')({
  loader: async ({ context, params }) => {
    if ((context as any).user) {
      await context.queryClient.ensureQueryData(sessionQueryOptions(params.sessionId))
    }
  },
  component: SessionRoute,
})

function SessionRoute() {
  const router = useRouter()
  const { sessionId } = Route.useParams()
  const { data: session } = useSuspenseQuery(sessionQueryOptions(sessionId))
  const [notes, setNotes] = useState(session.notes ?? '')
  const [finishError, setFinishError] = useState<string | null>(null)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const defaultOpenMovementId =
    session.movements.find((movement) => movement.sets.some((set) => !set.completed))?.id ??
    session.movements[0]?.id
  const [openMovementIds, setOpenMovementIds] = useState<Set<string>>(
    () => new Set(defaultOpenMovementId ? [defaultOpenMovementId] : []),
  )

  const sets = session.movements.flatMap((movement) => movement.sets)
  const incompleteSetCount = sets.filter((set) => !set.completed).length
  const savingSetCount = sets.filter((set) => set.syncState === 'saving').length
  const failedSetCount = sets.filter((set) => set.syncState === 'syncFailed').length
  const finishBlockedReason = savingSetCount
    ? `${savingSetCount} set ${savingSetCount === 1 ? 'is' : 'are'} still saving.`
    : failedSetCount
      ? `${failedSetCount} set ${failedSetCount === 1 ? 'needs' : 'need'} to be retried before finishing.`
      : null

  const finishMutation = useMutation({
    mutationFn: () => finishSessionFn({ data: { sessionId, notes } }),
    onMutate: () => {
      setFinishError(null)
    },
    onSuccess: async (summary) => {
      notifications.show({
        color: 'success',
        title: 'Session finished',
        message: `${summary.completedSets} of ${summary.totalSets} sets completed.`,
      })
      router.options.context.queryClient.setQueryData(['summary', sessionId], summary)
      router.options.context.queryClient.setQueryData(['session', sessionId], summary.session)
      await Promise.all([
        router.options.context.queryClient.invalidateQueries({ queryKey: ['today'] }),
        router.options.context.queryClient.invalidateQueries({ queryKey: ['history'] }),
        router.options.context.queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
      ])
      await router.navigate({ to: '/sessions/$sessionId/summary', params: { sessionId } })
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Unable to finish this session')
      setFinishError(message)
      notifications.show({ color: 'danger', title: 'Could not finish session', message })
    },
  })

  const toggleMovement = (movementId: string) => {
    setOpenMovementIds((current) => {
      const next = new Set(current)
      if (next.has(movementId)) {
        next.delete(movementId)
      } else {
        next.add(movementId)
      }
      return next
    })
  }

  const requestFinish = () => {
    setFinishError(null)
    if (finishBlockedReason) return
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
    <Page className="max-w-4xl">
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3 md:mx-0 md:rounded-lg md:border md:bg-[var(--surface)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold">{session.title}</h1>
              <SyncPill state={session.syncState} />
            </div>
            <p className="text-xs text-[var(--muted)]">
              {session.programTitle} · {session.weekLabel}
            </p>
          </div>
          <Button disabled={finishMutation.isPending || Boolean(finishBlockedReason)} onClick={requestFinish}>
            <Flag size={16} />
            {finishMutation.isPending ? 'Finishing...' : 'Finish'}
          </Button>
        </div>
        <div className="mt-3">
          <SessionProgress session={session} />
        </div>
        {finishBlockedReason ? (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200" role="status">
            {finishBlockedReason}
          </p>
        ) : null}
        {finishError ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200" role="alert">
            {finishError}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <IncompleteMainWarning session={session} />
        {session.movements.map((movement) => (
          <MovementCard
            key={movement.id}
            session={session}
            movement={movement}
            isOpen={openMovementIds.has(movement.id)}
            onToggle={() => toggleMovement(movement.id)}
          />
        ))}
        <NotesBox value={notes} onChange={setNotes} />
      </div>
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
