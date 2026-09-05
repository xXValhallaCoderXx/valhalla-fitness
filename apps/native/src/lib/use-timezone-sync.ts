import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { updateTimezone } from '@sheetless/data/account/profile'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext, useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'

/**
 * Keeps profiles.timezone aligned with the device — the native mirror of the
 * web's AccountTimezoneSync. The stored IANA zone drives every calendar-day
 * computation (getToday's scheduled date, history bucketing), so drift here
 * silently shifts workout days.
 */
export function useTimezoneSync() {
  const { user } = useSession()
  const me = useMe()
  const queryClient = useQueryClient()
  const syncing = useRef(false)

  const profileTimezone = me.data?.timezone ?? null

  useEffect(() => {
    if (!user || !me.data) return

    const sync = async () => {
      const deviceTimezone = browserIanaTimeZone()
      if (!deviceTimezone || deviceTimezone === profileTimezone || syncing.current) return
      syncing.current = true
      try {
        const updated = await updateTimezone(buildUserContext(user), { timezone: deviceTimezone })
        queryClient.setQueryData(accountQueryKeys.profile(user.id), updated)
        await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) })
      } catch {
        // Non-fatal: retried on the next foreground.
      } finally {
        syncing.current = false
      }
    }

    sync()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync()
    })
    return () => subscription.remove()
  }, [user, me.data, profileTimezone, queryClient])
}
