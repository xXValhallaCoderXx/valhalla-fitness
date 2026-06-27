import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { meQueryOptions } from '~/domains/account/queries'
import { completeOnboardingFn } from '~/domains/account/server/profile-functions'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import type { UserProfile } from '~/shared/types'
import { buildOnboardingProgress } from './onboarding-progress'
import { GettingStartedCard } from './GettingStartedCard'
import { useOnboardingTour } from './useOnboardingTour'

const AUTORUN_KEY = 'sheetless.onboardingTourAutorun'

/**
 * First-run onboarding for the Today page: a getting-started checklist plus the
 * guided tour. Active for users who haven't completed onboarding, or forced via
 * `?onboarding=force` / `?tour=1` (handy for QA, replay, and e2e).
 */
export function OnboardingPanel() {
  const queryClient = useQueryClient()
  const meQuery = useQuery(meQueryOptions())
  const me = meQuery.data
  const search = useRouterState({ select: (state) => state.location.search as Record<string, unknown> })
  const forced = search.onboarding === 'force' || search.tour === '1'
  const active = Boolean(me) && (forced || me?.onboardingCompleted === false)

  const todayQuery = useQuery({ ...todayQueryOptions(), enabled: active })
  const historyQuery = useQuery({ ...historyDashboardQueryOptions(), enabled: active })
  const { start } = useOnboardingTour()

  const completeMutation = useMutation({
    mutationFn: () => completeOnboardingFn(),
    onSuccess: (profile) => queryClient.setQueryData<UserProfile | null>(['me'], profile ?? null),
  })

  // Auto-run the tour once per device for genuine new users (not when forced, so
  // tests/replay drive it explicitly).
  const autoRan = useRef(false)
  useEffect(() => {
    if (!active || forced || autoRan.current || typeof window === 'undefined') return
    if (window.localStorage.getItem(AUTORUN_KEY)) return
    autoRan.current = true
    window.localStorage.setItem(AUTORUN_KEY, '1')
    const timer = window.setTimeout(() => start(), 600)
    return () => window.clearTimeout(timer)
  }, [active, forced, start])

  if (!active) return null

  const progress = buildOnboardingProgress({
    hasActiveProgram: Boolean(todayQuery.data?.activeProgram),
    programStateDefaults: me?.programStateDefaults ?? {},
    completedSessions: historyQuery.data?.overview.completedSessions ?? 0,
  })

  return (
    <GettingStartedCard
      steps={progress.steps}
      allDone={progress.allDone}
      onStartTour={start}
      onDismiss={() => completeMutation.mutate()}
      isDismissing={completeMutation.isPending}
    />
  )
}
