import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Button, Card } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, CheckCircle2, Dumbbell, Play, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { todayQueryOptions } from '~/domains/session/queries'
import { startSessionFn } from '~/domains/session/server/session-functions'
import type { WorkoutSession } from '~/shared/types'
import { EmptyState, Page, PageHeader, PageLoadError, PageSkeleton } from '~/components'
import { PendingProgressionReviewModal, PendingReviewAlert, useResolveProgressionDecision } from '~/domains/program/components/PendingReview'
import { SessionProgress, SyncPill } from './Session'

export function TodayPage({ user }: { user: unknown }) {
  const router = useRouter()

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
  const todayQuery = useQuery(todayQueryOptions())
  const [reviewOpen, setReviewOpen] = useState(false)
  const [resolvedDecisionIds, setResolvedDecisionIds] = useState<Set<string>>(() => new Set())
  const pendingDecisions = (todayQuery.data?.pendingDecisions ?? []).filter((decision) => !resolvedDecisionIds.has(decision.id))
  const decisionMutation = useResolveProgressionDecision({
    onResolved: (decisionId) => {
      setResolvedDecisionIds((current) => new Set(current).add(decisionId))
      const remainingDecisions = (todayQuery.data?.pendingDecisions ?? []).filter(
        (decision) => decision.id !== decisionId && !resolvedDecisionIds.has(decision.id),
      )
      if (!remainingDecisions.length) setReviewOpen(false)
    },
  })
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

  if (todayQuery.isPending) return <PageSkeleton />
  if (todayQuery.isError) return <PageLoadError error={todayQuery.error} onRetry={() => void todayQuery.refetch()} />

  const data = todayQuery.data

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
          Start a template to generate today&apos;s session.
        </EmptyState>
      </Page>
    )
  }

  if (data.activeSession) {
    const nextIncompleteLabel = nextIncompleteSetLabel(data.activeSession)
    const syncAction = isMeaningfulSyncState(data.activeSession.syncState)
      ? <SyncPill state={data.activeSession.syncState} />
      : null

    return (
      <Page>
        <PageHeader
          title="Today"
          eyebrow={`${data.activeProgram.title} · ${data.plannedSession.weekLabel}`}
          actions={syncAction}
        >
          Resume the workout currently in progress.
        </PageHeader>
        <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />
        <div className="max-w-5xl">
          <Card className="space-y-4 border-[var(--vf-action-border)] bg-[var(--mantine-color-default)] p-4 vf-card-hover md:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="vf-chip" data-active="true">In progress</span>
                  <Badge color="warning">{data.activeSession.hardness}</Badge>
                </div>
                <h2 className="truncate text-xl font-extrabold">{data.activeSession.title}</h2>
                <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
                  {data.activeSession.movements.length} movements · {data.activeSession.estimatedMinutes} min
                </p>
                <p className="mt-2 text-xs font-semibold text-[var(--mantine-color-dimmed)]">
                  {data.activeProgram.title} · {data.activeSession.weekLabel}
                </p>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => router.navigate({ to: '/sessions/$sessionId', params: { sessionId: data.activeSession!.sessionId } })}>
                <RotateCw size={16} />
                Resume workout
              </Button>
            </div>
            {nextIncompleteLabel ? (
              <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-3 py-2">
                <p className="vf-stat-label">Next up</p>
                <p className="mt-0.5 truncate text-sm font-extrabold text-[var(--mantine-color-text)]">{nextIncompleteLabel}</p>
              </div>
            ) : null}
            <SessionProgress session={data.activeSession} compact />
          </Card>
        </div>
        <PendingProgressionReviewModal
          opened={reviewOpen}
          decisions={pendingDecisions}
          isSaving={decisionMutation.isPending}
          onClose={() => setReviewOpen(false)}
          onResolve={(decisionId, action) => decisionMutation.mutate({ decisionId, action })}
        />
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
      >
        {data.completedSession ? 'Workout complete. Your next session is ready.' : new Date(data.plannedSession.scheduledDate).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </PageHeader>

      {data.completedSession ? (
        <Card className="mb-4 border-[var(--vf-success-border)] bg-[var(--vf-success-soft)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="text-[var(--vf-success-text)]" size={18} />
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

      {data.pendingDecisions.length ? (
        <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="space-y-4 p-4 vf-card-hover">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {data.completedSession ? <span className="vf-chip" data-active="true">Next session</span> : <span className="vf-chip" data-active="true">Ready</span>}
                <Badge color={data.plannedSession.hardness === 'Hard' ? 'danger' : 'warning'}>
                  {data.plannedSession.hardness}
                </Badge>
              </div>
              <h2 className="mt-2 text-xl font-extrabold">{data.plannedSession.title}</h2>
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
            <div className="rounded-lg border border-[var(--vf-action-border)] bg-[var(--vf-action-soft)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="vf-chip" data-active="true"><Dumbbell size={12} /> Main lift</span>
                  <h3 className="mt-2 truncate text-base font-extrabold md:text-lg">{main.movementName}</h3>
                  <p className="text-sm text-[var(--mantine-color-dimmed)]">{main.targetSummary}</p>
                </div>
                <ArrowRight className="text-[var(--mantine-color-dimmed)]" size={18} />
              </div>
              <p className="mt-3 text-xs text-[var(--mantine-color-dimmed)]">{main.previous?.label}</p>
            </div>
          ) : null}

          <div>
            <h3 className="vf-section-label mb-1.5">Accessories</h3>
            <div className="grid gap-2">
            {accessories.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{movement.movementName}</p>
                  <p className="text-xs text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
                  {movement.previous?.label ? (
                    <p className="mt-0.5 text-[10px] text-[var(--mantine-color-dimmed)]">{movement.previous.label}</p>
                  ) : null}
                </div>
                <Badge>{movement.role}</Badge>
              </div>
            ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-[var(--vf-action-text)]" />
              <h2 className="vf-section-label">Up next</h2>
            </div>
            <p className="mt-2 text-sm leading-snug text-[var(--mantine-color-dimmed)]">
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
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--vf-surface-inset)]">
              <div className="h-full w-2/3 rounded-full bg-[var(--mantine-primary-color-filled)]" />
            </div>
            <p className="mt-2 text-[10px] text-[var(--mantine-color-dimmed)]">Today&apos;s work is queued from {data.plannedSession.weekLabel}.</p>
          </Card>
        </div>
      </div>
      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        isSaving={decisionMutation.isPending}
        onClose={() => setReviewOpen(false)}
        onResolve={(decisionId, action) => decisionMutation.mutate({ decisionId, action })}
      />
    </Page>
  )
}

function nextIncompleteSetLabel(session: WorkoutSession) {
  const movement = session.movements.find((item) => item.sets.some((set) => !set.completed))
  const set = movement?.sets.find((item) => !item.completed)
  if (!movement || !set) return null
  return `${movement.movementName} · set ${set.setIndex}`
}

function isMeaningfulSyncState(state?: string) {
  return state === 'saving' || state === 'syncFailed'
}
