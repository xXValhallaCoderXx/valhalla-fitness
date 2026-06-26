import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link, useRouter } from '@tanstack/react-router'
import { Activity, ArrowRight, CalendarDays, CheckCircle2, Dumbbell, Layers3, ListChecks, Play, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { startSessionFn } from '~/domains/session/server/session-functions'
import type { HistoryDashboard, PlannedSession, ProgramOverview, Unit, WorkoutSession } from '~/shared/types'
import { Caption, EmptyState, Heading, Page, PageHeader, PageLoadError, PageSkeleton, Panel, SectionLabel, StatCard, Text } from '~/components'
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
  const overviewQuery = useQuery({
    ...programOverviewQueryOptions(),
    enabled: Boolean(todayQuery.data?.activeProgram),
  })
  const historyQuery = useQuery({
    ...historyDashboardQueryOptions(),
    enabled: Boolean(todayQuery.data?.activeProgram),
  })
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
          centered
          title="No active program"
          action={
            <Link to="/templates">
              <Button>Browse plans</Button>
            </Link>
          }
        >
          Choose a training template to generate your daily sessions and start tracking your progress.
        </EmptyState>
      </Page>
    )
  }

  if (data.activeSession) {
    const nextIncompleteLabel = nextIncompleteSetLabel(data.activeSession)
    const syncAction = isMeaningfulSyncState(data.activeSession.syncState)
      ? <SyncPill state={data.activeSession.syncState} />
      : null
    const completedSets = countCompletedSets(data.activeSession)
    const totalSets = countPlannedSets(data.activeSession)
    const completionPercent = totalSets ? Math.round((completedSets / totalSets) * 100) : 0

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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Panel className="space-y-4 vf-card-hover" p="md" style={{ borderColor: 'var(--vf-action-border)' }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color="action" variant="filled">In progress</Badge>
                  <Badge color="warning">{data.activeSession.hardness}</Badge>
                </div>
                <Heading order={2} size="h3" lh={1.15} className="truncate">
                  {data.activeSession.title}
                </Heading>
                <Text mt="xs" size="sm" tone="dimmed">
                  {data.activeSession.movements.length} movements · {data.activeSession.estimatedMinutes} min
                </Text>
                <Caption mt="xs" fw={700}>
                  {data.activeProgram.title} · {data.activeSession.weekLabel}
                </Caption>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => router.navigate({ to: '/sessions/$sessionId', params: { sessionId: data.activeSession!.sessionId } })}>
                <RotateCw size={16} />
                Resume workout
              </Button>
            </div>
            {nextIncompleteLabel ? (
              <Panel surface="inset" px="sm" py="xs">
                <SectionLabel>Next up</SectionLabel>
                <Text mt={2} size="sm" fw={800} truncate>{nextIncompleteLabel}</Text>
              </Panel>
            ) : null}
            <SessionProgress session={data.activeSession} compact />
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <StatCard label="Completed sets" value={`${completedSets}/${totalSets}`} icon={<ListChecks size={15} />} />
            <StatCard label="Session progress" value={`${completionPercent}%`} icon={<Activity size={15} />} />
            <ProgramProgressPanel overview={overviewQuery.data} />
            <WeeklyVolumePanel history={historyQuery.data} />
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

  const main = data.plannedSession.movements.find((movement) => movement.role === 'main')
  const accessories = data.plannedSession.movements.filter((movement) => movement.role !== 'main')
  const completedSets = data.completedSession?.movements.flatMap((movement) => movement.sets) ?? []
  const completedSetCount = completedSets.filter((set) => set.completed).length
  const startLabel = data.completedSession ? 'Start next session' : 'Start workout'
  const plannedSetCount = countPlannedSets(data.plannedSession)

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
        <Panel className="mb-4" p="md" style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 color="var(--vf-success-text)" size={18} />
                <Badge color="success">Completed</Badge>
              </div>
              <Heading mt="xs" order={2} size="h4">{data.completedSession.title}</Heading>
              <Text mt={4} size="sm" tone="dimmed">
                {completedSetCount} of {completedSets.length} sets completed
                {data.completedSession.completedAt
                  ? ` · ${new Date(data.completedSession.completedAt).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`
                  : ''}
              </Text>
            </div>
            <Badge color="action">Next session unlocked</Badge>
          </div>
        </Panel>
      ) : null}

      {data.pendingDecisions.length ? (
        <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel className="space-y-4 vf-card-hover" p="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="action" variant="filled">{data.completedSession ? 'Next session' : 'Ready'}</Badge>
                <Badge color={data.plannedSession.hardness === 'Hard' ? 'danger' : 'warning'}>
                  {data.plannedSession.hardness}
                </Badge>
              </div>
              <Heading mt="xs" order={2} size="h3" lh={1.15}>{data.plannedSession.title}</Heading>
              <Text mt={4} size="sm" tone="dimmed">
                {data.plannedSession.movements.length} movements · {data.plannedSession.estimatedMinutes} min
              </Text>
            </div>
            <Button className="w-full sm:w-auto" disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
              <Play size={16} />
              {startMutation.isPending ? 'Starting...' : startLabel}
            </Button>
          </div>

          {main ? (
            <Panel surface="inset" p="sm" style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Badge color="action"><Dumbbell size={12} /> Main lift</Badge>
                  <Heading mt="xs" order={3} size="h4" lh={1.15} className="truncate">{main.movementName}</Heading>
                  <Text size="sm" tone="dimmed">{main.targetSummary}</Text>
                </div>
                <ArrowRight color="var(--mantine-color-dimmed)" size={18} />
              </div>
              {main.previous?.label ? <Caption mt="sm">{main.previous.label}</Caption> : null}
            </Panel>
          ) : null}

          <div>
            <SectionLabel className="mb-1.5">Accessories</SectionLabel>
            <div className="grid gap-2">
            {accessories.map((movement) => (
              <Panel key={movement.id} surface="inset" p="sm" className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Text fw={700} truncate>{movement.movementName}</Text>
                  <Caption>{movement.targetSummary}</Caption>
                  {movement.previous?.label ? (
                    <Caption mt={2} size="0.625rem">{movement.previous.label}</Caption>
                  ) : null}
                </div>
                <Badge>{movement.role}</Badge>
              </Panel>
            ))}
            </div>
          </div>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard label="Planned sets" value={plannedSetCount} icon={<ListChecks size={15} />} />
          <StatCard label="Movements" value={data.plannedSession.movements.length} icon={<Layers3 size={15} />} />
          <Panel p="sm">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} color="var(--vf-action-text)" />
              <SectionLabel>Up next</SectionLabel>
            </div>
            <Text mt="xs" size="sm" lh={1.35} tone="dimmed">
              {data.completedSession
                ? `${data.plannedSession.title} is queued next. Review any progression decisions before starting if needed.`
                : 'Finish today\'s session to unlock reviewable progression recommendations.'}
            </Text>
          </Panel>
          <ProgramProgressPanel overview={overviewQuery.data} fallbackWeekLabel={data.plannedSession.weekLabel} />
          <WeeklyVolumePanel history={historyQuery.data} />
          <BodyLoadPanel history={historyQuery.data} />
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

function ProgramProgressPanel({
  overview,
  fallbackWeekLabel,
}: {
  overview?: ProgramOverview
  fallbackWeekLabel?: string
}) {
  const progress = overview?.position?.progressPercent ?? null
  return (
    <Panel p="sm">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Program</SectionLabel>
        <Badge color="action">{overview?.activeProgram?.title ?? 'Active'}</Badge>
      </div>
      <ProgressBar value={progress ?? 0} className="mt-3" />
      <Caption mt="xs">
        {overview?.position
          ? `${overview.position.weekLabel} · ${overview.position.phaseLabel}`
          : fallbackWeekLabel
            ? `Queued from ${fallbackWeekLabel}.`
            : 'Program position loads with your dashboard.'}
      </Caption>
    </Panel>
  )
}

function WeeklyVolumePanel({ history }: { history?: HistoryDashboard }) {
  const weeks = history?.weeklyVolume.slice(-5) ?? []
  return (
    <Panel p="sm">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Weekly volume</SectionLabel>
        <Badge>{weeks.length ? `${weeks.length} wk` : 'No data'}</Badge>
      </div>
      {weeks.length ? (
        <MiniBars
          className="mt-3"
          values={weeks.map((week) => week.volume)}
          labels={weeks.map((week) => week.weekLabel)}
          units={history?.overview.units}
        />
      ) : (
        <Caption mt="xs">Complete sessions to build a volume trend.</Caption>
      )}
    </Panel>
  )
}

function BodyLoadPanel({ history }: { history?: HistoryDashboard }) {
  const regions = history?.bodyLoad.topRegions.slice(0, 3) ?? []
  return (
    <Panel p="sm">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Muscle Fatigue</SectionLabel>
        <Badge>{history?.bodyLoad.windowDays ?? 0} days</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {regions.length ? regions.map((region) => (
          <div key={region.regionId} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
            <div className="min-w-0">
              <Text size="xs" fw={800} truncate>{region.label}</Text>
              <ProgressBar value={region.impactPercent} className="mt-1" />
            </div>
            <Text size="xs" fw={900} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {region.impactPercent}%
            </Text>
          </div>
        )) : (
          <Caption>No recent muscle fatigue data.</Caption>
        )}
      </div>
    </Panel>
  )
}

function MiniBars({
  values,
  labels,
  units,
  className,
}: {
  values: number[]
  labels: string[]
  units?: Unit | null
  className?: string
}) {
  const maxValue = Math.max(...values, 1)
  return (
    <div
      className={`grid items-end gap-1 ${className ?? ''}`}
      style={{ gridTemplateColumns: `repeat(${values.length || 1}, minmax(0, 1fr))` }}
    >
      {values.map((value, index) => {
        const height = Math.max(12, Math.round((value / maxValue) * 54))
        return (
          <div key={`${labels[index]}-${index}`} className="min-w-0">
            <div className="flex h-16 items-end rounded-md" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
              <div
                className="w-full rounded-md"
                style={{
                  height,
                  backgroundColor: 'var(--mantine-primary-color-filled)',
                }}
                aria-label={`${labels[index]} ${formatLoad(value, units)}`}
              />
            </div>
            <Caption mt={4} size="0.625rem" ta="center" truncate>{labels[index]}</Caption>
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  const width = `${Math.max(0, Math.min(100, value))}%`
  return (
    <div className={className} style={{ height: 6, overflow: 'hidden', borderRadius: 999, backgroundColor: 'var(--vf-surface-inset)' }}>
      <div style={{ width, height: '100%', borderRadius: 999, backgroundColor: 'var(--mantine-primary-color-filled)' }} />
    </div>
  )
}

function countPlannedSets(session: Pick<PlannedSession, 'movements'>) {
  return session.movements.reduce((total, movement) => total + movement.sets.length, 0)
}

function countCompletedSets(session: WorkoutSession) {
  return session.movements.reduce((total, movement) => total + movement.sets.filter((set) => set.completed).length, 0)
}

function formatLoad(value: number, units?: Unit | null) {
  return `${Math.round(value).toLocaleString()} ${units ?? ''}`.trim()
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
