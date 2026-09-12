import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, Page, PageLoadError } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { todayHistorySupportQueryOptions } from '~/domains/history/queries'
import { OnboardingPanel } from '~/domains/onboarding/OnboardingPanel'
import { useOnboardingActive } from '~/domains/onboarding/useOnboardingActive'
import { todayQueryOptions } from '~/domains/session/queries'
import { startAdHocSessionFn, startSessionFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { browserIanaTimeZone } from '~/shared/lib/calendar-date'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { TodayActiveSession } from './today/TodayActiveSession'
import { TodayPageSkeleton } from './today/TodayPageSkeleton'
import { TodayPlannedSession } from './today/TodayPlannedSession'

export function TodayPage({ user }: { user: AuthUser | null }) {
  const router = useRouter()

  if (!user) {
    return (
      <Page>
        <EmptyState
          title="Sign in to see today's workout"
          action={<Button onClick={() => router.navigate({ to: '/auth' })}>Sign in</Button>}
        >
          Your active programme and live workout drafts are tied to your Supabase account.
        </EmptyState>
      </Page>
    )
  }

  return <AuthedToday />
}

function AuthedToday() {
  const router = useRouter()
  const userId = useRequiredAccountId()
  const { active: onboardingActive, pending: onboardingPending } = useOnboardingActive()
  const todayQuery = useQuery(todayQueryOptions(userId))
  const historyQuery = useQuery({
    ...todayHistorySupportQueryOptions(userId),
    enabled: Boolean(todayQuery.data?.activeSession || todayQuery.data?.plannedSession),
  })
  const [reviewOpen, setReviewOpen] = useState(false)
  const [resolvedDecisionIds, setResolvedDecisionIds] = useState<Set<string>>(() => new Set())
  const pendingDecisions = (todayQuery.data?.pendingDecisions ?? []).filter((decision) => !resolvedDecisionIds.has(decision.id))
  const startMutation = useMutation({
    mutationFn: (clientMutationId: string) =>
      startSessionFn({
        data: { clientMutationId, timeZone: browserIanaTimeZone() ?? undefined },
      }),
    onSuccess: async (session) => {
      router.options.context.queryClient.setQueryData(
        accountQueryKeys.session(userId, session.sessionId),
        session,
      )
      await router.options.context.queryClient.invalidateQueries({
        queryKey: accountQueryKeys.today(userId),
      })
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
    mutationFn: (clientMutationId: string) =>
      startAdHocSessionFn({
        data: { clientMutationId, timeZone: browserIanaTimeZone() ?? undefined },
      }),
    onSuccess: async (session) => {
      router.options.context.queryClient.setQueryData(
        accountQueryKeys.session(userId, session.sessionId),
        session,
      )
      await router.options.context.queryClient.invalidateQueries({
        queryKey: accountQueryKeys.today(userId),
      })
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

  if (todayQuery.isPending) return <TodayPageSkeleton />
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
  // must surface here rather than falling into the "No active programme" empty state.
  if (data.activeSession) {
    return (
      <TodayActiveSession
        data={data}
        session={data.activeSession}
        history={historyQuery.data}
        historyPending={historyQuery.isPending}
        historyError={historyQuery.isError}
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
            title="No active programme"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/templates">
                  <Button>Browse plans</Button>
                </Link>
                <Button
                  variant="default"
                  disabled={adHocMutation.isPending}
                  onClick={() => adHocMutation.mutate(crypto.randomUUID())}
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
      historyPending={historyQuery.isPending}
      historyError={historyQuery.isError}
      onStart={() => startMutation.mutate(crypto.randomUUID())}
      startPending={startMutation.isPending}
      onStartAdHoc={() => adHocMutation.mutate(crypto.randomUUID())}
      adHocPending={adHocMutation.isPending}
      {...reviewProps}
    />
  )
}
