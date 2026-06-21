import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, Play, RotateCw } from 'lucide-react'
import { getApiErrorMessage } from '~/lib/api-error'
import { todayQueryOptions } from '~/lib/query-options'
import { startSessionFn } from '~/server/api'
import { Button, Card, Chip, EmptyState, Page, PageHeader } from '~/components/ui'
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
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{data.activeSession.title}</h2>
                <Chip tone="warning">{data.activeSession.hardness}</Chip>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {data.activeSession.movements.length} movements · {data.activeSession.estimatedMinutes} min
              </p>
            </div>
            <Button onClick={() => router.navigate({ to: '/sessions/$sessionId', params: { sessionId: data.activeSession!.sessionId } })}>
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

  return (
    <Page>
      <PageHeader
        title="Today"
        eyebrow={`${data.activeProgram.title} · ${data.plannedSession.weekLabel}`}
        actions={<Chip tone="success">Synced</Chip>}
      >
        {new Date(data.plannedSession.scheduledDate).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{data.plannedSession.title}</h2>
                <Chip tone={data.plannedSession.hardness === 'Hard' ? 'danger' : 'warning'}>
                  {data.plannedSession.hardness}
                </Chip>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {data.plannedSession.movements.length} movements · {data.plannedSession.estimatedMinutes} min
              </p>
            </div>
            <Button disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
              <Play size={16} />
              Start workout
            </Button>
          </div>

          {main ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Chip tone="action">Main</Chip>
                  <h3 className="mt-2 text-lg font-bold">{main.movementName}</h3>
                  <p className="text-sm text-[var(--muted)]">{main.targetSummary}</p>
                </div>
                <ArrowRight className="text-[var(--muted)]" size={18} />
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">{main.previous?.label}</p>
            </div>
          ) : null}

          <div className="grid gap-2">
            {accessories.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div>
                  <p className="font-semibold">{movement.movementName}</p>
                  <p className="text-xs text-[var(--muted)]">{movement.targetSummary}</p>
                </div>
                <Chip>{movement.role}</Chip>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Pending decisions</h2>
            {data.pendingDecisions.length ? (
              <div className="mt-3 space-y-3">
                {data.pendingDecisions.map((decision) => (
                  <div key={decision.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="text-sm font-bold">{decision.movementName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{decision.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">No pending progression decisions.</p>
            )}
          </Card>
          <Card>
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Up next</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Finish today&apos;s session to unlock reviewable progression recommendations.
            </p>
          </Card>
        </div>
      </div>
    </Page>
  )
}
