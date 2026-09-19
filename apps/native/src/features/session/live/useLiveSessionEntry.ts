import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { sessionQueryOptions } from '../queries'
import { workoutMemoryKey } from '../focus/workout-drafts'

type EntryRead = { status: 'checking' | 'verified' } | { status: 'failed'; error: unknown }

/** Only a completed server read may unlock this route entry, not a cache write. */
export function useLiveSessionEntry(user: User, sessionId: string) {
  const client = useQueryClient()
  const [entry, setEntry] = useState<EntryRead>({ status: 'checking' })
  const session = useQuery({
    ...sessionQueryOptions(user, sessionId),
    refetchOnMount: 'always',
  })
  const { refetch } = session

  useEffect(() => {
    let mounted = true
    // Join the on-mount request; throw on cancellation as well as read failure so
    // optimistic updates cannot turn an interrupted read into entry approval.
    void refetch({ cancelRefetch: false, throwOnError: true }).then(
      ({ data }) => {
        if (!mounted) return
        if (data && data.status !== 'in_progress') client.removeQueries({ queryKey: workoutMemoryKey(user.id, sessionId) })
        setEntry({ status: 'verified' })
      },
      (error: unknown) => { if (mounted) setEntry({ status: 'failed', error }) },
    )
    return () => { mounted = false }
  }, [refetch, client, user.id, sessionId])

  const retry = async () => {
    setEntry({ status: 'checking' })
    try {
      const { data } = await refetch({ cancelRefetch: false, throwOnError: true })
      if (data && data.status !== 'in_progress') client.removeQueries({ queryKey: workoutMemoryKey(user.id, sessionId) })
      setEntry({ status: 'verified' })
    } catch (error) {
      setEntry({ status: 'failed', error })
    }
  }

  return { session, entry, retry }
}
