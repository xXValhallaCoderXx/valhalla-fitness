import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, Clock3, X } from 'lucide-react'
import { sessionQueryOptions } from '~/lib/query-options'
import type { SessionSummary } from '~/types/training'
import { Button, Card, Chip, Page, PageHeader } from '~/components/ui'

export const Route = createFileRoute('/sessions/$sessionId/summary')({
  loader: async ({ context, params }) => {
    if ((context as any).user) {
      await context.queryClient.ensureQueryData(sessionQueryOptions(params.sessionId))
    }
  },
  component: SummaryRoute,
})

function SummaryRoute() {
  const { sessionId } = Route.useParams()
  const { data: session } = useSuspenseQuery(sessionQueryOptions(sessionId))
  const queryClient = useQueryClient()
  const sets = session.movements.flatMap((movement) => movement.sets)
  const summary = queryClient.getQueryData<SessionSummary>(['summary', sessionId])

  return (
    <Page>
      <PageHeader title="Session Summary" eyebrow={session.title}>
        {sets.filter((set) => set.completed).length} of {sets.length} sets completed.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold">{session.movements.length}</p>
            <p className="text-xs text-[var(--muted)]">Movements</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{sets.length}</p>
            <p className="text-xs text-[var(--muted)]">Sets</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{summary?.decisions.length ?? 0}</p>
            <p className="text-xs text-[var(--muted)]">Decisions</p>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Progression Actions</h2>
          {summary?.decisions.length ? (
            <div className="mt-3 space-y-3">
              {summary.decisions.map((decision) => (
                <div key={decision.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{decision.movementName}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{decision.recommendation}</p>
                    </div>
                    <Chip tone="warning">Pending</Chip>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button variant="success">
                      <Check size={15} />
                      Accept
                    </Button>
                    <Button variant="secondary">
                      <Clock3 size={15} />
                      Later
                    </Button>
                    <Button variant="danger">
                      <X size={15} />
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No recommendation was generated yet.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Completed Work</h2>
        <div className="mt-3 grid gap-2">
          {session.movements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div>
                <p className="font-semibold">{movement.movementName}</p>
                <p className="text-xs text-[var(--muted)]">{movement.targetSummary}</p>
              </div>
              <Chip>{movement.sets.filter((set) => set.completed).length}/{movement.sets.length}</Chip>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5">
        <Link to="/today">
          <Button>Done</Button>
        </Link>
      </div>
    </Page>
  )
}
