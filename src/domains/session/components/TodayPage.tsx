import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { OnboardingPanel } from '~/domains/onboarding/OnboardingPanel'
import { useOnboardingActive } from '~/domains/onboarding/useOnboardingActive'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { startAdHocSessionFn, startSessionFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { TodayActiveSession } from './today/TodayActiveSession'
import { TodayPlannedSession } from './today/TodayPlannedSession'

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
  const reviewProps = {
    pendingDecisions,
    reviewOpen,
    onReviewOpen: () => setReviewOpen(true),
    onReviewClose: () => setReviewOpen(false),
    onDecisionResolved: (decisionId: string) =>
      setResolvedDecisionIds((current) => new Set(current).add(decisionId)),
  }

  // Active session first: an ad-hoc workout can be live with no programme at all, and it
  // must surface here rather than falling into the "No active program" empty state.
  if (data.activeSession) {
    return (
      <TodayActiveSession
        data={data}
        session={data.activeSession}
        overview={overviewQuery.data}
        history={historyQuery.data}
        {...reviewProps}
      />
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

  return (
    <TodayPlannedSession
      data={data}
      plannedSession={data.plannedSession}
      history={historyQuery.data}
      onStart={() => startMutation.mutate()}
      startPending={startMutation.isPending}
      onStartAdHoc={() => adHocMutation.mutate()}
      adHocPending={adHocMutation.isPending}
      {...reviewProps}
    />
  )
}
