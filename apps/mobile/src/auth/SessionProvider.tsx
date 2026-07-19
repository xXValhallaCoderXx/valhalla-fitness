import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { AppState } from 'react-native'
import { queryClient } from '@/query/query-client'
import { supabase } from './supabase'

type SessionContextValue = {
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const userId = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return
        userId.current = data.session?.user.id ?? null
        setSession(data.session)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        queryClient.clear()
        userId.current = null
        setSession(null)
        setIsLoading(false)
      })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null
      if (userId.current && userId.current !== nextUserId) queryClient.clear()
      userId.current = nextUserId
      setSession(nextSession)
      setIsLoading(false)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const syncRefresh = (state: string) => {
      if (state === 'active') supabase.auth.startAutoRefresh()
      else supabase.auth.stopAutoRefresh()
    }
    syncRefresh(AppState.currentState)
    const listener = AppState.addEventListener('change', syncRefresh)
    return () => {
      listener.remove()
      supabase.auth.stopAutoRefresh()
    }
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      signOut: async () => {
        await supabase.auth.signOut({ scope: 'local' })
        queryClient.clear()
      },
    }),
    [isLoading, session],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}
