import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Badge, Button, Card } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Play, RotateCw } from 'lucide-react'
import { getApiErrorMessage } from '~/lib/api-error'
import { todayQueryOptions } from '~/lib/query-options'
import { startSessionFn } from '~/server/api'
import { EmptyState, Page, PageHeader } from '~/components/ui'
import { SessionProgress, SyncPill } from '~/features/workout/components'

export const Route = createFileRoute('/today')({
  loader: async ({ context }) => {
    if ((context as any).user) {
      await context.queryClient.ensureQueryData(todayQueryOptions())
    }
  },
  component: TodayRoute,
})

function TodayRoute() {
  const router = useRouter()
  const user = (Route.useRouteContext() as any).user

  if (!user) {
    return (
      <Page>
        <EmptyState
          title="Sign in to see today's workout"
          action={<Button onClick={() => router.navigate({ to: '/auth' })}>Sign in</Button>}
        >
          Your active program and live workout drafts are tied to your Supabase account.
        </EmptyState>
      </Page>
    )
  }

  return <AuthedToday />
}

function AuthedToday() {
  const router = useRouter()
  const { data } = useSuspenseQuery(todayQueryOptions())
  const startMutation = useMutation({
    mutationFn: () => startSessionFn({ data: { clientMutationId: crypto.randomUUID() } }),
    onSuccess: async (session) => {
      router.options.context.queryClient.setQueryData(['session', session.sessionId], session)
      await router.options.context.queryClient.invalidateQueries({ queryKey: ['today'] })
      await router.navigate({ to: '/sessions/$sessionId', params: { sessionId: session.sessionId } })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not start workout',
        message: getApiErrorMessage(error, "Unable to start today's workout"),
      })
    },
  })

  if (!data.activeProgram || !data.plannedSession) {
    return (
      <Page>
        <EmptyState
          title="No active program"
          action={
            <Link to="/templates">
              <Button>Choose a program</Button>
            </Link>
          }
        >
          Start Healthy 5/3/1 FSL or Bullmastiff to generate today&apos;s session.
        </EmptyState>
      </Page>
    )
  }

  if (data.activeSession) {
    return (
      <Page>
        <PageHeader
          title="Today"
          eyebrow={`${data.activeProgram.title} · ${data.plannedSession.weekLabel}`}
          actions={<SyncPill state={data.activeSession.syncState} />}
        >
          Resume the workout currently in progress.
        </PageHeader>
        <Card className="space-y-4 vf-card-hover">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{data.activeSession.title}</h2>
                <Badge color="warning">{data.activeSession.hardness}</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
                {data.activeSession.movements.length} movements · {data.activeSession.estimatedMinutes} min
              </p>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => router.navigate({ to: '/sessions/$sessionId', params: { sessionId: data.activeSession!.sessionId } })}>
              <RotateCw size={16} />
              Resume
            </Button>
          </div>
          <SessionProgress session={data.activeSession} />
        </Card>
      </Page>
    )
  }

  const main = data.plannedSession.movements.find((movement) => movement.role === 'main')
  const accessories = data.plannedSession.movements.filter((movement) => movement.role !== 'main')
  const completedSets = data.completedSession?.movements.flatMap((movement) => movement.sets) ?? []
  const completedSetCount = completedSets.filter((set) => set.completed).length
  const startLabel = data.completedSession ? 'Start next session' : 'Start workout'

  return (
    <Page>
      <PageHeader
        title="Today"
        eyebrow={`${data.activeProgram.title} · ${data.plannedSession.weekLabel}`}
        actions={<Badge color="success">Synced</Badge>}
      >
        {data.completedSession ? 'Workout complete. Your next session is ready.' : new Date(data.plannedSession.scheduledDate).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </PageHeader>

      {data.completedSession ? (
        <Card className="mb-4 !border-[var(--vf-success-border)] !bg-[var(--vf-success-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="text-emerald-300" size={18} />
                <Badge color="success">Completed</Badge>
              </div>
              <h2 className="mt-2 text-lg font-bold">{data.completedSession.title}</h2>
              <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
                {completedSetCount} of {completedSets.length} sets completed
                {data.completedSession.completedAt
                  ? ` · ${new Date(data.completedSession.completedAt).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`
                  : ''}
              </p>
            </div>
            <Badge color="action">Next session unlocked</Badge>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <Card className="space-y-4 vf-card-hover">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {data.completedSession ? <Badge color="action">Next session</Badge> : null}
                <h2 className="text-base font-extrabold md:text-lg">{data.plannedSession.title}</h2>
                <Badge color={data.plannedSession.hardness === 'Hard' ? 'danger' : 'warning'}>
                  {data.plannedSession.hardness}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
                {data.plannedSession.movements.length} movements · {data.plannedSession.estimatedMinutes} min
              </p>
            </div>
            <Button className="w-full sm:w-auto" disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
              <Play size={16} />
              {startMutation.isPending ? 'Starting...' : startLabel}
            </Button>
          </div>

          {main ? (
            <div className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge color="action">Main</Badge>
                  <h3 className="mt-2 text-base font-extrabold md:text-lg">{main.movementName}</h3>
                  <p className="text-sm text-[var(--mantine-color-dimmed)]">{main.targetSummary}</p>
                </div>
                <ArrowRight className="text-[var(--mantine-color-dimmed)]" size={18} />
              </div>
              <p className="mt-3 text-xs text-[var(--mantine-color-dimmed)]">{main.previous?.label}</p>
            </div>
          ) : null}

          <div>
            <h3 className="vf-section-label mb-1.5">Accessories</h3>
            <div className="divide-y divide-[var(--mantine-color-default-border)]">
            {accessories.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-semibold">{movement.movementName}</p>
                  <p className="text-xs text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
                </div>
                <Badge>{movement.role}</Badge>
              </div>
            ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="vf-section-label">Pending decisions</h2>
            {data.pendingDecisions.length ? (
              <div className="mt-3 space-y-3">
                {data.pendingDecisions.map((decision) => (
                  <div key={decision.id} className="rounded-xl border border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-3">
                    <p className="text-sm font-bold">{decision.movementName}</p>
                    <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{decision.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">No pending progression decisions.</p>
            )}
          </Card>
          <Card>
            <h2 className="vf-section-label">Up next</h2>
            <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">
              {data.completedSession
                ? `${data.plannedSession.title} is queued next. Review any progression decisions before starting if needed.`
                : 'Finish today\'s session to unlock reviewable progression recommendations.'}
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="vf-section-label">Program</h2>
              <Badge color="action">{data.activeProgram.title}</Badge>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--vf-surface-2)]">
              <div className="h-full w-2/3 rounded-full bg-[var(--mantine-primary-color-filled)]" />
            </div>
            <p className="mt-2 text-[10px] text-[var(--mantine-color-dimmed)]">Today&apos;s work is queued from {data.plannedSession.weekLabel}.</p>
          </Card>
        </div>
      </div>
    </Page>
  )
}
