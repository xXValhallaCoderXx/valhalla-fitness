import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'
import { transitionAccountCache } from '~/shared/lib/account-cache'
import { resolveIanaTimeZone } from '~/shared/lib/calendar-date'
import { createAccountClock, type AccountClock } from '~/shared/lib/dates'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { AccountTimezoneSync } from './AccountTimezoneSync'

const AccountIdentityContext = createContext<string | null>(null)
const AccountClockContext = createContext<AccountClock>(createAccountClock())

export function AccountIdentityProvider({
  children,
  userId,
}: {
  children: ReactNode
  userId: string | null
}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const observedUser = useQuery(authUserQueryOptions()).data
  const observedUserId = observedUser?.id ?? null
  const activeUserId = observedUser === undefined ? userId : observedUserId
  const profile = useQuery({
    ...meQueryOptions(activeUserId ?? ''),
    enabled: Boolean(activeUserId),
  }).data
  const timeZone = resolveIanaTimeZone(profile?.timezone)
  const [clock, setClock] = useState(() => createAccountClock({ timeZone }))
  const previousClockKey = useRef<string | null>(null)

  useEffect(() => {
    if (activeUserId === userId) return
    let active = true
    void transitionAccountCache(queryClient, activeUserId).then(() => {
      if (active) void router.invalidate()
    })
    return () => {
      active = false
    }
  }, [activeUserId, queryClient, router, userId])

  useEffect(() => {
    const refreshClock = () => {
      const nextClock = createAccountClock({ timeZone })
      setClock((current) =>
        current.timeZone === nextClock.timeZone && current.today === nextClock.today
          ? current
          : nextClock,
      )
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshClock()
    }

    refreshClock()
    const interval = window.setInterval(refreshClock, 60_000)
    window.addEventListener('focus', refreshClock)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshClock)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [timeZone])

  useEffect(() => {
    if (!activeUserId) {
      previousClockKey.current = null
      return
    }
    const nextClockKey = `${activeUserId}:${clock.timeZone}:${clock.today}`
    const previous = previousClockKey.current
    previousClockKey.current = nextClockKey
    if (!previous || previous === nextClockKey) return

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(activeUserId) }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.programOverview(activeUserId) }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(activeUserId) }),
    ])
  }, [activeUserId, clock.timeZone, clock.today, queryClient])

  const clockValue = useMemo(
    () => clock,
    [clock],
  )

  return (
    <AccountIdentityContext.Provider value={activeUserId}>
      <AccountClockContext.Provider value={clockValue}>
        <AccountTimezoneSync userId={activeUserId} />
        {children}
      </AccountClockContext.Provider>
    </AccountIdentityContext.Provider>
  )
}

export function useAccountId(): string | null {
  return useContext(AccountIdentityContext)
}

export function useRequiredAccountId(): string {
  const userId = useAccountId()
  if (!userId) throw new Error('Account data requires an authenticated user')
  return userId
}

export function useAccountClock(): AccountClock {
  return useContext(AccountClockContext)
}
