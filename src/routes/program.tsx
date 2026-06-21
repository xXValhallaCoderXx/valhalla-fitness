import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute } from '@tanstack/react-router'
import { Check, Clock3, X } from 'lucide-react'
import { getApiErrorMessage } from '~/lib/api-error'
import { activeProgramQueryOptions, todayQueryOptions } from '~/lib/query-options'
import { resolveProgressionDecisionFn } from '~/server/api'
import { Button, Card, Chip, EmptyState, Page, PageHeader } from '~/components/ui'

export const Route = createFileRoute('/program')({
  loader: async ({ context }) => {
    if ((context as any).user) {
      await Promise.all([
        context.queryClient.ensureQueryData(activeProgramQueryOptions()),
        context.queryClient.ensureQueryData(todayQueryOptions()),
      ])
    }
  },
  component: ProgramRoute,
})

function ProgramRoute() {
  const user = (Route.useRouteContext() as any).user
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to review your program">Program timelines and anchors are account data.</EmptyState>
      </Page>
    )
  }
  return <AuthedProgram />
}

function AuthedProgram() {
  const { data: program } = useSuspenseQuery(activeProgramQueryOptions())
  const { data: today } = useSuspenseQuery(todayQueryOptions())
  const mutation = useMutation({
    mutationFn: (data: { decisionId: string; action: 'accepted' | 'dismissed' | 'pending' }) =>
      resolveProgressionDecisionFn({ data }),
    onSuccess: () => {
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

  if (!program) {
    return (
      <Page>
        <EmptyState title="No active program">Start a template to see its timeline and anchors here.</EmptyState>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader title={program.title} eyebrow="Program">
        Current position: week {program.currentWeekIndex + 1}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Timeline</h2>
            <Chip tone="action">{program.status}</Chip>
          </div>
          <div className="mt-4 space-y-3">
            {Array.from({ length: program.templateId === 'healthy-531-fsl' ? 4 : 3 }, (_, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  index === program.currentWeekIndex % (program.templateId === 'healthy-531-fsl' ? 4 : 3)
                    ? 'border-[var(--action)] bg-blue-500/10'
                    : 'border-[var(--border)] bg-[var(--surface-2)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">Week {index + 1}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {index === 0 ? 'Opening work' : index === 1 ? 'Build' : index === 2 ? 'Heavy review' : 'Deload'}
                    </p>
                  </div>
                  {index === program.currentWeekIndex % (program.templateId === 'healthy-531-fsl' ? 4 : 3) ? (
                    <Chip tone="action">Current</Chip>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Current Anchors</h2>
              <Chip>{program.units}</Chip>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {program.anchors.map((anchor) => (
                <div key={anchor.movementId} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-xs text-[var(--muted)]">{anchor.movementId.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-lg font-bold">
                    {anchor.value} <span className="text-xs text-[var(--muted)]">{program.units}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Progression</h2>
            {today.pendingDecisions.length ? (
              <div className="mt-3 space-y-3">
                {today.pendingDecisions.map((decision) => (
                  <div key={decision.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="font-bold">{decision.movementName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{decision.recommendation}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button variant="success" onClick={() => mutation.mutate({ decisionId: decision.id, action: 'accepted' })}>
                        <Check size={14} />
                        Accept
                      </Button>
                      <Button variant="secondary" onClick={() => mutation.mutate({ decisionId: decision.id, action: 'pending' })}>
                        <Clock3 size={14} />
                        Later
                      </Button>
                      <Button variant="danger" onClick={() => mutation.mutate({ decisionId: decision.id, action: 'dismissed' })}>
                        <X size={14} />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">No pending recommendations.</p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}
