import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { router } from 'expo-router'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { todayQueryOptions } from '@/features/session/queries'
import { useStartAdHocWorkout } from '@/features/session/today/useStartAdHocWorkout'

/** Recheck current workout state before repeating; cached absence is not permission to start. */
export function useFavoriteWorkoutEntry(user: User, sourceSessionId: string) {
  const client = useQueryClient()
  const start = useStartAdHocWorkout(user)
  const activeStarts = useIsMutating({ mutationKey: ['startSession', user.id] })
  const lifetime = useMemo(() => ({ userId: user.id, sourceSessionId }), [user.id, sourceSessionId])
  const current = useRef<object | null>(lifetime)
  const pending = useRef<object | null>(null)
  const [checking, setChecking] = useState<object | null>(null)
  const [readError, setReadError] = useState<{ lifetime: object; message: string } | null>(null)
  useLayoutEffect(() => {
    current.current = lifetime
    return () => { current.current = null }
  }, [lifetime])

  const startWorkout = async () => {
    if (pending.current === lifetime || activeStarts > 0) return
    pending.current = lifetime
    setChecking(lifetime)
    setReadError(null)
    start.reset()
    try {
      const today = await client.fetchQuery({ ...todayQueryOptions(user), staleTime: 0 })
      if (current.current !== lifetime) return
      const activeSession = today.activeSession
      if (activeSession) {
        Alert.alert('Workout already in progress', 'Open your current workout before starting another one.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open workout', onPress: () => {
            if (current.current !== lifetime) return
            start.confirmActiveSession(activeSession)
            router.push({ pathname: '/session/[sessionId]', params: { sessionId: activeSession.sessionId } })
          } },
        ])
      } else if (client.isMutating({ mutationKey: ['startSession', user.id] }) === 0) {
        start.mutate({ sourceSessionId }, { onSuccess: (session) => {
          if (current.current === lifetime) router.push({ pathname: '/session/[sessionId]', params: { sessionId: session.sessionId } })
        } })
      }
    } catch (error) {
      if (current.current === lifetime) setReadError({ lifetime,
        message: error instanceof Error ? error.message : 'Unable to check your current workout.' })
    } finally {
      if (pending.current === lifetime) pending.current = null
      if (current.current === lifetime) setChecking(null)
    }
  }

  return { startWorkout, busy: checking === lifetime || start.isPending, activeStarts,
    error: readError?.lifetime === lifetime ? readError.message
      : start.isError ? start.error.message : null }
}
