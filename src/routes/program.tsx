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

  const weeksInCycle = program.templateId === 'healthy-531-fsl' ? 4 : 3
  const currentWeek = program.currentWeekIndex % weeksInCycle
  const weekLabels = ['Opening work', 'Build', 'Heavy review', 'Deload']

  return (
    <Page>
      <PageHeader
        title={program.title}
        eyebrow="Program"
        actions={<Chip tone="action">Week {currentWeek + 1} of {weeksInCycle}</Chip>}
      >
        Current position: week {program.currentWeekIndex + 1}
      </PageHeader>

      {today.pendingDecisions.length ? (
        <Card className="mb-4 !border-[var(--warning-border)] !bg-[var(--warning-soft)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="vf-section-label text-[var(--warning-text)]">Pending Decision</p>
              <p className="mt-1 text-sm font-semibold">Review {today.pendingDecisions[0]?.movementName} progression before the next block.</p>
            </div>
            <Chip tone="warning">{today.pendingDecisions.length} pending</Chip>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="vf-section-label">Timeline — Cycle</h2>
            <Chip tone="action">{program.status}</Chip>
          </div>
          <div className="relative mt-4 space-y-3 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-[var(--border)]">
            {Array.from({ length: weeksInCycle }, (_, index) => {
              const current = index === currentWeek
              const complete = index < currentWeek
              return (
              <div key={index} className="relative z-10 flex gap-3">
                <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-[var(--bg)] ${complete ? 'bg-[var(--success)] text-white' : current ? 'bg-[var(--action)] text-white shadow-sm' : 'bg-[var(--surface-2)] text-[var(--muted)]'}`}>
                  {complete ? <Check size={12} /> : current ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : <span className="h-2 w-2 rounded-full bg-[var(--border)]" />}
                </div>
                <div
                  className={`flex-1 rounded-xl border p-3 ${
                    current
                      ? 'border-[var(--action)] bg-[var(--action-soft)]'
                      : complete
                        ? 'border-[var(--border)] bg-[var(--surface)] opacity-70'
                        : 'border-dashed border-[var(--border)] bg-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold">Week {index + 1}</p>
                      <p className="text-xs text-[var(--muted)]">{weekLabels[index] ?? 'Training week'}</p>
                    </div>
                    {complete ? <Chip tone="success">Done</Chip> : current ? <Chip tone="action">Current</Chip> : <Chip>Locked</Chip>}
                  </div>
                  {current ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
                      {['S1', 'S2', 'S3', 'S4'].slice(0, program.templateId === 'healthy-531-fsl' ? 4 : 3).map((sessionLabel, sessionIndex) => (
                        <span key={sessionLabel} className={`rounded-lg px-2.5 py-2 text-[11px] font-semibold ${sessionIndex === 0 ? 'bg-[var(--surface-2)] text-[var(--muted)] line-through' : sessionIndex === 1 ? 'border border-[var(--action-border)] bg-[var(--action-soft)] text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                          {sessionLabel}: {sessionIndex === 0 ? 'Squat' : sessionIndex === 1 ? 'Deadlift' : sessionIndex === 2 ? 'Bench' : 'OHP'}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )})}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="vf-section-label">Current Anchors</h2>
              <Chip>{program.units}</Chip>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {program.anchors.map((anchor) => (
                <div key={anchor.movementId} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-xs text-[var(--muted)]">{anchor.movementId.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-lg font-bold">
                    {anchor.value} <span className="text-xs text-[var(--muted)]">{program.units}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="vf-section-label">Progression</h2>
            {today.pendingDecisions.length ? (
              <div className="mt-3 space-y-3">
                {today.pendingDecisions.map((decision) => (
                  <div key={decision.id} className="rounded-xl border border-[var(--warning-border)] bg-[var(--surface-2)] p-3">
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
