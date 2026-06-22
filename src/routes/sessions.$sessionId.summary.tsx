import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Badge, Button, Card } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, CheckCircle2, Clock3, X } from 'lucide-react'
import { getApiErrorMessage } from '~/lib/api-error'
import { sessionQueryOptions } from '~/lib/query-options'
import { resolveProgressionDecisionFn } from '~/server/api'
import type { SessionSummary } from '~/types/training'
import { Page, PageHeader } from '~/components/ui'

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
  const decisionMutation = useMutation({
    mutationFn: (data: { decisionId: string; action: 'accepted' | 'dismissed' | 'pending' }) =>
      resolveProgressionDecisionFn({ data }),
    onSuccess: async (_pendingDecisions, variables) => {
      if (variables.action !== 'pending') {
        queryClient.setQueryData<SessionSummary>(['summary', sessionId], (current) =>
          current
            ? {
                ...current,
                decisions: current.decisions.filter((decision) => decision.id !== variables.decisionId),
              }
            : current,
        )
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
      ])
      notifications.show({ color: 'success', title: 'Progression updated', message: 'Your decision was saved.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not save decision',
        message: getApiErrorMessage(error, 'Unable to save progression decision'),
      })
    },
  })

  return (
    <Page>
      <PageHeader
        title="Session Summary"
        eyebrow={session.title}
        actions={
          <div className="flex items-center gap-2">
            <Badge>{session.estimatedMinutes} min</Badge>
            <Badge color="success">Completed</Badge>
          </div>
        }
      >
        {completedSets.length} of {sets.length} sets completed.
      </PageHeader>

      <Card className="mb-4 !border-[var(--vf-success-border)] !bg-[var(--vf-success-soft)]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--vf-success-text)]" size={20} />
          <div>
            <h2 className="text-sm font-extrabold">All logged work saved</h2>
            <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">Review completed work and any progression actions before heading back to Today.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-extrabold">{session.movements.length}</p>
            <p className="text-xs text-[var(--mantine-color-dimmed)]">Movements</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold">{sets.length}</p>
            <p className="text-xs text-[var(--mantine-color-dimmed)]">Sets</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--vf-warning-text)]">{summary?.decisions.length ?? 0}</p>
            <p className="text-xs text-[var(--mantine-color-dimmed)]">Decisions</p>
          </div>
        </Card>

        <Card>
          <h2 className="vf-section-label">Progression Actions</h2>
          {summary?.decisions.length ? (
            <div className="mt-3 space-y-3">
              {summary.decisions.map((decision) => (
                <div key={decision.id} className="rounded-xl border border-[var(--vf-warning-border)] bg-[var(--vf-surface-2)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{decision.movementName}</p>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{formatRuleId(decision.ruleId)}</p>
                      <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{decision.inputSummary}</p>
                      <p className="mt-1 text-sm font-semibold">{decision.recommendation}</p>
                    </div>
                    <Badge color="warning">Pending</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button color="success" variant="light" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ decisionId: decision.id, action: 'accepted' })}>
                      <Check size={15} />
                      Accept
                    </Button>
                    <Button variant="default" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ decisionId: decision.id, action: 'pending' })}>
                      <Clock3 size={15} />
                      Later
                    </Button>
                    <Button color="danger" variant="light" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ decisionId: decision.id, action: 'dismissed' })}>
                      <X size={15} />
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">No recommendation was generated yet.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="vf-section-label">Completed Work</h2>
        <div className="mt-3 grid gap-2">
          {session.movements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
              <div>
                <p className="font-semibold">{movement.movementName}</p>
                <p className="text-xs text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
              </div>
              <Badge>{movement.sets.filter((set) => set.completed).length}/{movement.sets.length}</Badge>
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

function formatRuleId(ruleId: string) {
  return ruleId.replaceAll('_', ' ')
}
