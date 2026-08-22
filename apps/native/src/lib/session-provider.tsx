import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

export type SessionStatus = 'restoring' | 'signedIn' | 'signedOut'

export type SessionState = {
  status: SessionStatus
  session: Session | null
  user: User | null
  /** Set when the Supabase client could not be constructed (missing env). */
  initError: string | null
}

const SessionContext = createContext<SessionState>({
  status: 'restoring',
  session: null,
  user: null,
  initError: null,
})

export function useSession(): SessionState {
  return useContext(SessionContext)
}

/**
 * App-wide session restore + auth-event subscription, extracted from the
 * Gate-2 spike screen. `restoring` holds the splash; the root layout redirects
 * on `signedIn`/`signedOut`.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<SessionStatus>('restoring')
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    let client
    try {
      client = getSupabase()
    } catch (error) {
      setInitError(error instanceof Error ? error.message : String(error))
      setStatus('signedOut')
      return
    }

    client.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
        setStatus(data.session ? 'signedIn' : 'signedOut')
      })
      .catch(() => setStatus('signedOut'))

    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setStatus(next ? 'signedIn' : 'signedOut')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<SessionState>(
    () => ({ status, session, user: session?.user ?? null, initError }),
    [status, session, initError],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
