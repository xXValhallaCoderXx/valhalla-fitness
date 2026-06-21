import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Flag } from 'lucide-react'
import { useState } from 'react'
import { sessionQueryOptions } from '~/lib/query-options'
import { finishSessionFn } from '~/server/api'
import { Button, Page } from '~/components/ui'
import {
  IncompleteMainWarning,
  MovementCard,
  NotesBox,
  SessionProgress,
  SyncPill,
} from '~/components/workout'

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

  const finishMutation = useMutation({
    mutationFn: () => finishSessionFn({ data: { sessionId, notes } }),
    onSuccess: async (summary) => {
      router.options.context.queryClient.setQueryData(['summary', sessionId], summary)
      router.options.context.queryClient.setQueryData(['session', sessionId], summary.session)
      await Promise.all([
        router.options.context.queryClient.invalidateQueries({ queryKey: ['today'] }),
        router.options.context.queryClient.invalidateQueries({ queryKey: ['history'] }),
        router.options.context.queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
      ])
      await router.navigate({ to: '/sessions/$sessionId/summary', params: { sessionId } })
    },
  })

  const anyCompleted = session.movements.some((movement) => movement.sets.some((set) => set.completed))

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
          <Button disabled={finishMutation.isPending || !anyCompleted} onClick={() => finishMutation.mutate()}>
            <Flag size={16} />
            Finish
          </Button>
        </div>
        <div className="mt-3">
          <SessionProgress session={session} />
        </div>
      </div>

      <div className="space-y-4">
        <IncompleteMainWarning session={session} />
        {session.movements.map((movement) => (
          <MovementCard key={movement.id} session={session} movement={movement} />
        ))}
        <NotesBox value={notes} onChange={setNotes} />
      </div>
    </Page>
  )
}
