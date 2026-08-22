import { useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { meQueryOptions } from '~/domains/account/queries'
import { todayHistorySupportQueryOptions } from '~/domains/history/queries'

/**
 * Single source of truth for whether first-run onboarding should show — shared by the
 * Today page (to hide the redundant empty state) and the panel itself. Active while the
 * server flag `onboarding_completed` is false AND the account has no completed sessions
 * (an account that already trained is treated as onboarded), or when forced via
 * `?onboarding=force` / `?tour=1` (QA / replay / e2e — these always win).
 * `pending` covers the history-load window so consumers don't flash alternate UI.
 */
export function useOnboardingActive(): { active: boolean; forced: boolean; pending: boolean } {
  const userId = useRequiredAccountId()
  const me = useQuery(meQueryOptions(userId)).data
  const search = useRouterState({ select: (state) => state.location.search as Record<string, unknown> })
  // `String(...)` guards against TanStack coercing `?tour=1` to the number 1.
  const forced = search.onboarding === 'force' || String(search.tour) === '1'
  const notCompleted = me?.onboardingCompleted === false
  // Enabled by the flag, not by `active` (circular) — users who completed onboarding never fetch.
  const historyQuery = useQuery({
    ...todayHistorySupportQueryOptions(userId),
    enabled: Boolean(me) && notCompleted,
  })

  const neverTrained = historyQuery.isSuccess
    ? !historyQuery.data.hasCompletedSessions
    : // If history can't load, fall back to the flag alone so onboarding can't vanish for new users.
      historyQuery.isError

  const active = Boolean(me) && (forced || (notCompleted && neverTrained))
  const pending = Boolean(me) && !forced && notCompleted && historyQuery.isPending
  return { active, forced, pending }
}
