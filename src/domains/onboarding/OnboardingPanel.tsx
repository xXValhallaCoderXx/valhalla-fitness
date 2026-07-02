import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '~/components'
import { meQueryOptions } from '~/domains/account/queries'
import { completeOnboardingFn } from '~/domains/account/server/profile-functions'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { track } from '~/shared/lib/analytics'
import type { UserProfile } from '~/shared/types'
import { buildOnboardingProgress } from './onboarding-progress'
import { GettingStartedCard } from './GettingStartedCard'
import { useOnboardingActive } from './useOnboardingActive'
import { useOnboardingTour } from './useOnboardingTour'

/** User-scoped so a new account on a shared machine still gets its own auto-run. */
const autorunKey = (userId: string) => `sheetless.onboardingTourAutorun.${userId}`

/**
 * First-run onboarding for the Today page: a getting-started checklist plus the
 * guided tour. Active for users who haven't completed onboarding, or forced via
 * `?onboarding=force` / `?tour=1` (handy for QA, replay, and e2e).
 */
export function OnboardingPanel() {
  const queryClient = useQueryClient()
  const me = useQuery(meQueryOptions()).data
  const { active, forced } = useOnboardingActive()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const todayQuery = useQuery({ ...todayQueryOptions(), enabled: active })
  const historyQuery = useQuery({ ...historyDashboardQueryOptions(), enabled: active })
  const { start } = useOnboardingTour()

  const completeMutation = useMutation({
    mutationFn: () => completeOnboardingFn(),
    onSuccess: (profile) => {
      queryClient.setQueryData<UserProfile | null>(['me'], profile ?? null)
      // Under ?onboarding=force the panel stays mounted, so close the dialog explicitly.
      setConfirmOpen(false)
    },
  })

  // Auto-run the tour once per user+device for genuine new users (not when forced, so
  // tests/replay drive it explicitly).
  const autoRan = useRef(false)
  const userId = me?.id
  useEffect(() => {
    if (!active || forced || !userId || autoRan.current || typeof window === 'undefined') return
    if (window.localStorage.getItem(autorunKey(userId))) return
    autoRan.current = true
    window.localStorage.setItem(autorunKey(userId), '1')
    const timer = window.setTimeout(() => start(), 600)
    return () => window.clearTimeout(timer)
  }, [active, forced, userId, start])

  if (!active) return null

  const progress = buildOnboardingProgress({
    hasActiveProgram: Boolean(todayQuery.data?.activeProgram),
    programStateDefaults: me?.programStateDefaults ?? {},
    completedSessions: historyQuery.data?.overview.completedSessions ?? 0,
  })

  // "Don't show again" asks for confirmation; "Done" (every step complete) dismisses directly.
  const handleDismiss = () => {
    if (progress.allDone) {
      track('onboarding_dismiss', { allDone: true })
      completeMutation.mutate()
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirmExit = () => {
    track('onboarding_dismiss', { allDone: false })
    completeMutation.mutate()
  }

  return (
    <>
      <GettingStartedCard
        steps={progress.steps}
        allDone={progress.allDone}
        onStartTour={start}
        onDismiss={handleDismiss}
        isDismissing={completeMutation.isPending}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Exit onboarding?"
        confirmLabel="Exit onboarding"
        tone="warning"
        isPending={completeMutation.isPending}
        onConfirm={handleConfirmExit}
        onCancel={() => setConfirmOpen(false)}
      >
        Are you sure you want to exit onboarding? If it’s your first time around, we recommend
        completing these steps.
      </ConfirmDialog>
    </>
  )
}
