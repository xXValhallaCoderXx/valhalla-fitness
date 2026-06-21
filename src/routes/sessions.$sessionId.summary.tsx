import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, CheckCircle2, Clock3, X } from 'lucide-react'
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
  const completedSets = sets.filter((set) => set.completed)
  const summary = queryClient.getQueryData<SessionSummary>(['summary', sessionId])

  return (
    <Page>
      <PageHeader
        title="Session Summary"
        eyebrow={session.title}
        actions={
          <div className="flex items-center gap-2">
            <Chip>{session.estimatedMinutes} min</Chip>
            <Chip tone="success">Completed</Chip>
          </div>
        }
      >
        {completedSets.length} of {sets.length} sets completed.
      </PageHeader>

      <Card className="mb-4 !border-[var(--success-border)] !bg-[var(--success-soft)]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--success-text)]" size={20} />
          <div>
            <h2 className="text-sm font-extrabold">All logged work saved</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Review completed work and any progression actions before heading back to Today.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-extrabold">{session.movements.length}</p>
            <p className="text-xs text-[var(--muted)]">Movements</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold">{sets.length}</p>
            <p className="text-xs text-[var(--muted)]">Sets</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--warning-text)]">{summary?.decisions.length ?? 0}</p>
            <p className="text-xs text-[var(--muted)]">Decisions</p>
          </div>
        </Card>

        <Card>
          <h2 className="vf-section-label">Progression Actions</h2>
          {summary?.decisions.length ? (
            <div className="mt-3 space-y-3">
              {summary.decisions.map((decision) => (
                <div key={decision.id} className="rounded-xl border border-[var(--warning-border)] bg-[var(--surface-2)] p-3">
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
        <h2 className="vf-section-label">Completed Work</h2>
        <div className="mt-3 grid gap-2">
          {session.movements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
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
          <Button className="w-full sm:w-auto">Done</Button>
        </Link>
      </div>
    </Page>
  )
}
