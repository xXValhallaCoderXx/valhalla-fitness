import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { authUserQueryOptions } from '~/domains/account/queries'
import { transitionAccountCache } from '~/shared/lib/account-cache'
import { AccountTimezoneSync } from './AccountTimezoneSync'

const AccountIdentityContext = createContext<string | null>(null)

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

  return (
    <AccountIdentityContext.Provider value={activeUserId}>
      <AccountTimezoneSync userId={activeUserId} />
      {children}
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
