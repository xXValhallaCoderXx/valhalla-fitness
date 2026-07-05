import { useMutation, useQuery } from '@tanstack/react-query'
import { ActionIcon, Badge, Button, Tooltip, VisuallyHidden } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link, useRouter } from '@tanstack/react-router'
import { Activity, ArrowRight, Dumbbell, ListChecks, Lock, Play, Plus, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { bodyLoadTierLabels, recoverySummaryLine, worstBodyLoadTier } from '~/domains/history/lib/body-load'
import { intensityColor } from '~/domains/history/lib/insights'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { AD_HOC_BADGE_LABEL, DEFAULT_AD_HOC_TITLE } from '~/domains/session/lib/ad-hoc'
import { countPlannedSets, formatPreviousHero } from '~/domains/session/lib/today-numbers'
import { todayQueryOptions } from '~/domains/session/queries'
import { startAdHocSessionFn, startSessionFn } from '~/domains/session/server/session-functions'
import type { BodyLoadTier, HistoryDashboard, ProgramOverview, Unit, WorkoutSession } from '~/shared/types'
import { Caption, CollapsiblePanel, EmptyState, Heading, Page, PageHeader, PageLoadError, PageSkeleton, Panel, SectionLabel, StatCard, Text } from '~/components'
import { PendingProgressionReviewModal, PendingReviewAlert, PendingReviewGate } from '~/domains/program/components/PendingReview'
import { OnboardingPanel } from '~/domains/onboarding/OnboardingPanel'
import { useOnboardingActive } from '~/domains/onboarding/useOnboardingActive'
import { SessionProgress, SyncPill } from './Session'
import { TodayWorkoutLedger } from './TodayWorkoutLedger'

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
  const { active: onboardingActive, pending: onboardingPending } = useOnboardingActive()
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
  const adHocMutation = useMutation({
    mutationFn: () => startAdHocSessionFn({ data: { clientMutationId: crypto.randomUUID() } }),
    onSuccess: async (session) => {
      router.options.context.queryClient.setQueryData(['session', session.sessionId], session)
      await router.options.context.queryClient.invalidateQueries({ queryKey: ['today'] })
      await router.navigate({ to: '/sessions/$sessionId', params: { sessionId: session.sessionId } })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not start workout',
        message: getApiErrorMessage(error, 'Unable to start a blank workout'),
      })
    },
  })

  if (todayQuery.isPending) return <PageSkeleton />
  if (todayQuery.isError) return <PageLoadError error={todayQuery.error} onRetry={() => void todayQuery.refetch()} />

  const data = todayQuery.data

  // Active session first: an ad-hoc workout can be live with no programme at all, and it
  // must surface here rather than falling into the "No active program" empty state.
  if (data.activeSession) {
    const activeSession = data.activeSession
    const isAdHoc = Boolean(activeSession.isAdHoc)
    const nextIncompleteLabel = nextIncompleteSetLabel(activeSession)
    const syncAction = isMeaningfulSyncState(activeSession.syncState)
      ? <SyncPill state={activeSession.syncState} />
      : null
    const completedSets = countCompletedSets(activeSession)
    const totalSets = countPlannedSets(activeSession)
    const completionPercent = totalSets ? Math.round((completedSets / totalSets) * 100) : 0
    const eyebrow =
      !isAdHoc && data.activeProgram && data.plannedSession
        ? `${data.activeProgram.title} · ${data.plannedSession.weekLabel}`
        : DEFAULT_AD_HOC_TITLE

    return (
      <Page className="max-w-5xl">
        <OnboardingPanel />
        <PageHeader
          title="Today"
          eyebrow={eyebrow}
          actions={syncAction}
        >
          Resume the workout currently in progress.
        </PageHeader>
        {pendingDecisions.length ? (
          <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />
        ) : null}
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Panel className="space-y-4 vf-card-hover" p="md" style={{ borderColor: 'var(--vf-action-border)' }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color="action" variant="filled">In progress</Badge>
                  {isAdHoc ? (
                    <Badge color="accent">{AD_HOC_BADGE_LABEL}</Badge>
                  ) : (
                    <Badge color="warning">{activeSession.hardness}</Badge>
                  )}
                </div>
                <Heading order={2} size="h3" lh={1.15} className="truncate">
                  {activeSession.title}
                </Heading>
                <Text mt="xs" size="sm" tone="dimmed">
                  {activeSession.movements.length} movements
                  {activeSession.estimatedMinutes ? ` · ${activeSession.estimatedMinutes} min` : ''}
                </Text>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => router.navigate({ to: '/sessions/$sessionId', params: { sessionId: activeSession.sessionId } })}>
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
            <SessionProgress session={activeSession} compact />
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <StatCard label="Completed sets" value={`${completedSets}/${totalSets}`} icon={<ListChecks size={15} />} />
            <StatCard label="Session progress" value={`${completionPercent}%`} icon={<Activity size={15} />} />
            {data.activeProgram ? (
              <>
                <ProgramProgressPanel overview={overviewQuery.data} />
                <WeeklyVolumePanel history={historyQuery.data} />
              </>
            ) : null}
          </div>
        </div>
        <PendingProgressionReviewModal
          opened={reviewOpen}
          decisions={pendingDecisions}
          onClose={() => setReviewOpen(false)}
          onResolved={(decisionId) => setResolvedDecisionIds((current) => new Set(current).add(decisionId))}
        />
      </Page>
    )
  }

  if (!data.activeProgram || !data.plannedSession) {
    return (
      <Page>
        <OnboardingPanel />
        {!onboardingActive && !onboardingPending ? (
          <EmptyState
            centered
            title="No active program"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/templates">
                  <Button>Browse plans</Button>
                </Link>
                <Button
                  variant="default"
                  disabled={adHocMutation.isPending}
                  onClick={() => adHocMutation.mutate()}
                >
                  <Plus size={16} />
                  {adHocMutation.isPending ? 'Starting...' : 'Start a blank workout'}
                </Button>
              </div>
            }
          >
            Choose a training template to generate your daily sessions — or just log a one-off workout.
          </EmptyState>
        ) : null}
      </Page>
    )
  }

  const main = data.plannedSession.movements.find((movement) => movement.role === 'main')
  const startLabel = data.completedSession ? 'Start next session' : 'Start workout'
  const startLocked = pendingDecisions.length > 0
  const heroLastLine = main ? formatPreviousHero(main.previous, data.plannedSession.units) : null

  return (
    <Page className="max-w-3xl pb-24 md:pb-16">
      <OnboardingPanel />
      <VisuallyHidden>
        <Heading order={1}>Today</Heading>
      </VisuallyHidden>

      {data.pendingDecisions.length ? (
        <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />
      ) : null}

      {/* minmax(0,1fr): an auto track would size to the widest card's intrinsic width and overflow narrow screens. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <Panel className="space-y-4 vf-card-hover" p="md">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="action" variant="filled">{data.completedSession ? 'Next session' : 'Ready'}</Badge>
              {data.plannedSession.hardness ? (
                <Badge color={intensityColor(data.plannedSession.hardness)}>{data.plannedSession.hardness}</Badge>
              ) : null}
            </div>
            <Heading mt="xs" order={2} size="h3" lh={1.15}>{data.plannedSession.title}</Heading>
            <Text mt={4} size="sm" tone="dimmed">
              {data.plannedSession.movements.length} movements · {data.plannedSession.estimatedMinutes} min
            </Text>
          </div>

          {main ? (
            <Panel surface="inset" p="sm" style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}>
              <div className="flex items-center justify-between gap-3">
                <Badge color="action" leftSection={<Dumbbell size={12} />}>Main lift</Badge>
                <ArrowRight color="var(--mantine-color-dimmed)" size={16} />
              </div>
              <Heading mt="xs" order={3} size="h4" lh={1.15} className="truncate">{main.movementName}</Heading>
              <Text mt={2} size="sm" tone="dimmed">{main.targetSummary}</Text>
              {heroLastLine ? <Caption mt={6} truncate>{heroLastLine}</Caption> : null}
            </Panel>
          ) : null}

          <div>
            <PendingReviewGate
              pendingCount={pendingDecisions.length}
              onReview={() => setReviewOpen(true)}
              className="flex w-full"
            >
              {/* Mantine's fullWidth, not a Tailwind w-full: unlayered Button styles beat layered
                  utilities, leaving the button narrow while the popover anchor span spans the card. */}
              <Button
                fullWidth
                disabled={startMutation.isPending || startLocked}
                style={startLocked ? { pointerEvents: 'none' } : undefined}
                onClick={startLocked ? undefined : () => startMutation.mutate()}
              >
                {startLocked ? <Lock size={16} /> : <Play size={16} />}
                {startMutation.isPending ? 'Starting...' : startLabel}
              </Button>
            </PendingReviewGate>
            {startLocked ? (
              <Caption component="p" mt={6} ta="center">
                Unlocks after you review the {pendingDecisions[0].movementName} progression
              </Caption>
            ) : null}
          </div>
        </Panel>

        <TodayWorkoutLedger session={data.plannedSession} />
        <RecoveryCheckPanel history={historyQuery.data} />
      </div>
      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        onClose={() => setReviewOpen(false)}
        onResolved={(decisionId) => setResolvedDecisionIds((current) => new Set(current).add(decisionId))}
      />

      {/* Ad-hoc entry stays ungated by pending reviews (unlike "Start workout"). */}
      <div className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] z-30 md:right-6 md:bottom-6">
        <Tooltip label="Blank workout">
          <ActionIcon
            size={56}
            radius={9999}
            variant="filled"
            color="action"
            aria-label="Blank workout"
            disabled={adHocMutation.isPending}
            onClick={() => adHocMutation.mutate()}
            style={{ boxShadow: 'var(--vf-shadow-card)' }}
          >
            <Plus size={24} />
          </ActionIcon>
        </Tooltip>
      </div>
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


const recoveryDotColors: Record<BodyLoadTier, string> = {
  fresh: 'var(--vf-success-text)',
  low: 'var(--vf-success-text)',
  moderate: 'var(--vf-warning-text)',
  high: 'var(--vf-danger-text)',
}

function RecoveryCheckPanel({ history }: { history?: HistoryDashboard }) {
  if (!history) return null
  const regions = history.bodyLoad.topRegions
  return (
    <CollapsiblePanel
      data-testid="recovery-check"
      title="Recovery check"
      leading={
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: recoveryDotColors[worstBodyLoadTier(regions)] }}
        />
      }
      summary={recoverySummaryLine(regions)}
    >
      <div className="grid gap-3">
        {regions.length ? (
          regions.slice(0, 3).map((region) => (
            <div key={region.regionId} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <Text size="xs" fw={800} truncate>{region.label}</Text>
                  <Caption>{bodyLoadTierLabels[region.tier]}</Caption>
                </div>
                <ProgressBar value={region.impactPercent} className="mt-1" />
              </div>
              <Text size="xs" fw={900} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {region.impactPercent}%
              </Text>
            </div>
          ))
        ) : (
          <Caption>No recent muscle fatigue data.</Caption>
        )}
      </div>
      <Link to="/history" search={{ tab: 'body-load' }} className="mt-3 inline-flex items-center gap-1">
        <Text component="span" size="sm" fw={700} tone="action">Body map in Insights</Text>
        <ArrowRight size={14} color="var(--vf-action-text)" />
      </Link>
    </CollapsiblePanel>
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
