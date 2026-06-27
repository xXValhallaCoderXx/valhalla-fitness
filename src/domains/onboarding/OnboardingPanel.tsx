import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { meQueryOptions } from '~/domains/account/queries'
import { completeOnboardingFn } from '~/domains/account/server/profile-functions'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { track } from '~/shared/lib/analytics'
import type { UserProfile } from '~/shared/types'
import { ONBOARDING_SNOOZE_MS, buildOnboardingProgress } from './onboarding-progress'
import { GettingStartedCard } from './GettingStartedCard'
import { ONBOARDING_SNOOZE_KEY, useOnboardingActive } from './useOnboardingActive'
import { useOnboardingTour } from './useOnboardingTour'

const AUTORUN_KEY = 'sheetless.onboardingTourAutorun'

/**
 * First-run onboarding for the Today page: a getting-started checklist plus the
 * guided tour. Active for users who haven't completed onboarding, or forced via
 * `?onboarding=force` / `?tour=1` (handy for QA, replay, and e2e).
 */
export function OnboardingPanel() {
  const queryClient = useQueryClient()
  const me = useQuery(meQueryOptions()).data
  const { active, forced } = useOnboardingActive()
  const [snoozedLocally, setSnoozedLocally] = useState(false)

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

  if (!active || snoozedLocally) return null

  const progress = buildOnboardingProgress({
    hasActiveProgram: Boolean(todayQuery.data?.activeProgram),
    programStateDefaults: me?.programStateDefaults ?? {},
    completedSessions: historyQuery.data?.overview.completedSessions ?? 0,
  })

  // "Skip for now": hide on this device for a week without touching the server flag.
  const handleSnooze = () => {
    if (typeof window !== 'undefined') {
      const until = Date.now() + ONBOARDING_SNOOZE_MS
      window.localStorage.setItem(ONBOARDING_SNOOZE_KEY, String(until))
      track('onboarding_snooze', { until })
    }
    setSnoozedLocally(true)
  }

  // "Don't show again" / "Done": complete onboarding permanently (syncs across devices).
  const handleDismiss = () => {
    track('onboarding_dismiss', { allDone: progress.allDone })
    completeMutation.mutate()
  }

  return (
    <GettingStartedCard
      steps={progress.steps}
      allDone={progress.allDone}
      onStartTour={start}
      onSnooze={handleSnooze}
      onDismiss={handleDismiss}
      isDismissing={completeMutation.isPending}
    />
  )
}
