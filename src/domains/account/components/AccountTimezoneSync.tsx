import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { meQueryOptions } from '~/domains/account/queries'
import { updateTimezoneFn } from '~/domains/account/server/profile-functions'
import { browserIanaTimeZone } from '~/shared/lib/calendar-date'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import type { UserProfile } from '~/domains/account'

export function AccountTimezoneSync({ userId }: { userId: string | null }) {
  const queryClient = useQueryClient()
  const profileQuery = useQuery({
    ...meQueryOptions(userId ?? ''),
    enabled: Boolean(userId),
  })

  useEffect(() => {
    if (!userId || !profileQuery.data) return

    let cancelled = false
    let inFlight = false
    const profileKey = accountQueryKeys.profile(userId)

    const syncTimezone = async () => {
      if (inFlight) return
      const browserTimezone = browserIanaTimeZone()
      const profile = queryClient.getQueryData<UserProfile | null>(profileKey)
      if (!browserTimezone || profile?.timezone === browserTimezone) return

      inFlight = true
      try {
        const updatedProfile = await updateTimezoneFn({ data: { timezone: browserTimezone } })
        if (cancelled) return
        queryClient.setQueryData(profileKey, updatedProfile)
        await queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) })
      } catch (error) {
        if (import.meta.env.DEV) console.warn('Unable to synchronize browser timezone', error)
      } finally {
        inFlight = false
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncTimezone()
    }

    void syncTimezone()
    window.addEventListener('focus', syncTimezone)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      cancelled = true
      window.removeEventListener('focus', syncTimezone)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [profileQuery.data, queryClient, userId])

  return null
}
