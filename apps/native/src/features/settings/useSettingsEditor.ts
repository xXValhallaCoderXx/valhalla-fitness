import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { updateSettingsSection } from '@sheetless/data/account/settings-sections'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { buildUserContext } from '@/lib/account'
import { useSheetlessTheme } from '@/lib/theme-provider'
import { settingsSectionInput, type SettingsSection } from './settings-section-input'
import { useSettingsDraft } from './useSettingsDraft'

export function useSettingsEditor(profile: UserProfile, user: User, section: SettingsSection) {
  const draft = useSettingsDraft(profile, { convertEstimatesOnUnitChange: section !== 'you' })
  const client = useQueryClient()
  const { setPreviewPreference } = useSheetlessTheme()
  const owner = useRef<string | null>(null)
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const input = settingsSectionInput(section, draft)
  const dirty = input !== null
  const invalid = section === 'starting-numbers' && draft.hasValidationErrors

  useLayoutEffect(() => { owner.current = user.id; return () => { owner.current = null } }, [user.id])
  useEffect(() => () => { if (section === 'you') setPreviewPreference(null) }, [section, setPreviewPreference])

  const discard = () => {
    draft.reset(profile)
    setError(null)
    setSaved(false)
    if (section === 'you') setPreviewPreference(null)
  }
  const changeTheme = (value: UserProfile['themePreference']) => {
    draft.setThemePreference(value)
    setPreviewPreference(value === profile.themePreference ? null : value)
  }
  const save = async () => {
    if (!input || invalid || busy.current || owner.current !== user.id) return
    busy.current = true
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const result = await updateSettingsSection(buildUserContext(user), input)
      if (owner.current !== user.id) return
      const account = { queryKey: accountQueryKeys.user(user.id) }
      await client.cancelQueries(account)
      if (owner.current !== user.id) return
      await client.invalidateQueries({ ...account, refetchType: 'none' })
      if (owner.current !== user.id) return
      client.setQueryData(accountQueryKeys.profile(user.id), result)
      draft.reset(result)
      if (section === 'you') setPreviewPreference(null)
      setSaved(true)
      // Tabs stay mounted. Restart their canceled reads after publishing the receipt,
      // without making a failed consumer refresh look like a failed profile save.
      void client.refetchQueries({
        ...account,
        type: 'active',
        predicate: query => query.queryKey[2] !== 'profile',
      }).catch(() => undefined)
    } catch (cause) {
      if (owner.current === user.id) setError(getApiErrorMessage(cause, 'Unable to save. Try again.'))
    } finally {
      busy.current = false
      if (owner.current === user.id) setSaving(false)
    }
  }
  return { draft, dirty, saving, error, saved: saved && !dirty, invalid, discard, changeTheme, save }
}
