import { useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useIsFocused } from 'expo-router/react-navigation'
import type { User } from '@supabase/supabase-js'
import { dismissFullModeHint } from '@sheetless/data/account/profile'
import { shouldOfferFullMode } from '@sheetless/domain/account/experience-mode'
import type { UserProfile } from '@sheetless/domain/account/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext, useMe } from '@/lib/account'
import { experienceSignalsQueryOptions } from '../queries'

type InvitationAction = 'open' | 'dismiss'
type Answer = { userId: string; action: InvitationAction; pending: boolean; error: string | null }

export function useAdvancedInvitation(user: User) {
  const me = useMe()
  const signals = useQuery(experienceSignalsQueryOptions(user))
  const client = useQueryClient()
  const isFocused = useIsFocused()
  const owner = useRef<string | null>(null)
  const focused = useRef(false)
  const inFlight = useRef<{ userId: string } | null>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const currentAnswer = answer?.userId === user.id ? answer : null
  const profile = me.data
  const visible = !me.isError && !signals.isError && profile?.id === user.id && Boolean(signals.data) &&
    shouldOfferFullMode({ experienceMode: profile.experienceMode,
      completedSessions: signals.data!.completedSessions, fullModeHintDismissedAt: profile.fullModeHintDismissedAt })

  useLayoutEffect(() => { owner.current = user.id; return () => { owner.current = null } }, [user.id])
  useLayoutEffect(() => { focused.current = isFocused; return () => { focused.current = false } }, [isFocused])

  const respond = async (action: InvitationAction) => {
    if (!visible || owner.current !== user.id || inFlight.current?.userId === user.id) return
    const request = { userId: user.id }
    const current = () => owner.current === user.id && inFlight.current === request
    inFlight.current = request
    setAnswer({ userId: user.id, action, pending: true, error: null })
    try {
      const saved = await dismissFullModeHint(buildUserContext(user))
      if (!current()) return
      await client.cancelQueries({ queryKey: accountQueryKeys.profile(user.id) })
      if (!current()) return
      // Only the answer belongs to this write; retain any newer preference changes.
      client.setQueryData<UserProfile>(accountQueryKeys.profile(user.id), previous => previous
        ? { ...previous, fullModeHintDismissedAt: saved.fullModeHintDismissedAt }
        : saved)
      setAnswer(null)
      if (action === 'open' && focused.current) router.navigate('/you?focus=detail-level')
    } catch (cause) {
      if (current()) setAnswer({ userId: user.id, action, pending: false,
        error: getApiErrorMessage(cause, 'Unable to save your choice. Try again.') })
    } finally {
      if (inFlight.current === request) inFlight.current = null
    }
  }

  return { visible, pending: currentAnswer?.pending ?? false, error: currentAnswer?.error ?? null,
    action: currentAnswer?.action ?? null, respond,
    retry: () => currentAnswer ? respond(currentAnswer.action) : Promise.resolve() }
}
