import { useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { completeFirstRun } from '@sheetless/data/account/profile'
import type { UserProfile } from '@sheetless/domain/account/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'

/** Mounted per account; only an authoritative save unlocks the entry gate. */
export function useFirstRun(profile: UserProfile, user: User) {
  const client = useQueryClient()
  const [units, setUnits] = useState(profile.units)
  const [experienceMode, setExperienceMode] = useState(profile.experienceMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef(false)
  const owner = useRef<string | null>(null)

  useLayoutEffect(() => {
    owner.current = user.id
    return () => { owner.current = null }
  }, [user.id])

  const save = async () => {
    if (request.current || owner.current !== user.id) return
    request.current = true
    setSaving(true)
    setError(null)
    try {
      const result = await completeFirstRun(buildUserContext(user), { units, experienceMode })
      if (owner.current !== user.id) return
      // A read started before completion must not restore the old profile or unit-based data.
      const account = { queryKey: accountQueryKeys.user(user.id) }
      await client.cancelQueries(account)
      if (owner.current !== user.id) return
      await client.invalidateQueries({ ...account, refetchType: 'none' })
      if (owner.current !== user.id) return
      // Publish last: the gate can now open with stale dependent queries ready to refresh.
      client.setQueryData(accountQueryKeys.profile(user.id), result)
    } catch (cause) {
      if (owner.current === user.id) setError(getApiErrorMessage(cause, 'Unable to save your choices. Try again.'))
    } finally {
      request.current = false
      if (owner.current === user.id) setSaving(false)
    }
  }

  return { units, setUnits, experienceMode, setExperienceMode, saving, error, save }
}
