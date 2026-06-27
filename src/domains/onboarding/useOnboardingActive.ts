import { useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { meQueryOptions } from '~/domains/account/queries'
import { isOnboardingSnoozed } from './onboarding-progress'

/** localStorage key holding the epoch-ms until which "Skip for now" hides the checklist. */
export const ONBOARDING_SNOOZE_KEY = 'sheetless.onboardingSnoozeUntil'

function readSnoozeUntil(): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(ONBOARDING_SNOOZE_KEY)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function subscribeToStorage(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

/**
 * Read the snooze flag SSR-safely. The server snapshot is always `false`, so SSR and the
 * first client render agree (no hydration mismatch); React re-renders to the real value
 * after hydration. A snoozed user therefore sees the card hide on the next tick.
 */
function useOnboardingSnoozed(): boolean {
  return useSyncExternalStore(
    subscribeToStorage,
    () => isOnboardingSnoozed(readSnoozeUntil(), Date.now()),
    () => false,
  )
}

/**
 * Single source of truth for whether first-run onboarding should show — shared by the
 * Today page (to hide the redundant empty state) and the panel itself. Active for users
 * who haven't completed (and haven't snoozed) onboarding, or when forced via
 * `?onboarding=force` / `?tour=1` (QA / replay / e2e — these always win).
 */
export function useOnboardingActive(): { active: boolean; forced: boolean } {
  const me = useQuery(meQueryOptions()).data
  const search = useRouterState({ select: (state) => state.location.search as Record<string, unknown> })
  // `String(...)` guards against TanStack coercing `?tour=1` to the number 1.
  const forced = search.onboarding === 'force' || String(search.tour) === '1'
  const snoozed = useOnboardingSnoozed()

  const active = Boolean(me) && (forced || (me?.onboardingCompleted === false && !snoozed))
  return { active, forced }
}
