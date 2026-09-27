import { useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { deleteBodyweightEntry, getBodyweightEntries, logBodyweight } from '@sheetless/data/account/bodyweight'
import { normalizeBodyweightLog } from '@sheetless/domain/account/bodyweight'
import type { BodyweightEntry, UserProfile } from '@sheetless/domain/account/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { buildUserContext } from '@/lib/account'

export function useBodyweightSettings(user: User, profile: UserProfile) {
  const client = useQueryClient()
  const queryKey = accountQueryKeys.bodyweight(user.id)
  const entries = useQuery({ queryKey, queryFn: () => getBodyweightEntries(buildUserContext(user)), staleTime: queryStaleTimes.profile })
  const [draft, setDraft] = useState({ text: '', units: profile.units })
  const [pending, setPending] = useState<'log' | 'delete' | null>(null)
  const [logError, setLogError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<BodyweightEntry | null>(null)
  const owner = useRef<string | null>(null)
  const busy = useRef(false)
  useLayoutEffect(() => {
    owner.current = user.id
    return () => { owner.current = null }
  }, [user.id])
  const current = () => owner.current === user.id
  const dirty = draft.text.trim().length > 0
  const inputUnits = dirty ? draft.units : profile.units

  const refreshConsumers = () => {
    // A cancelled first read still needs the complete history; one save receipt cannot replace it.
    void client.invalidateQueries({ queryKey, refetchType: client.getQueryData(queryKey) ? 'none' : 'active' })
    void client.invalidateQueries({ queryKey: accountQueryKeys.history(user.id) })
  }
  const cancelOldReads = () => Promise.all([
    client.cancelQueries({ queryKey }),
    client.cancelQueries({ queryKey: accountQueryKeys.history(user.id) }),
  ])
  const log = async () => {
    if (!current() || busy.current || !dirty) return
    busy.current = true
    setPending('log')
    setLogError(null)
    setSaved(false)
    try {
      const input = { weight: Number(draft.text.replace(',', '.')), unit: inputUnits }
      const normalized = normalizeBodyweightLog(input, new Date().toISOString(), profile.timezone)
      const entry = await logBodyweight(buildUserContext(user), { ...input, recordedOn: normalized.recordedOn })
      if (!current()) return
      await cancelOldReads()
      if (!current()) return
      client.setQueryData<BodyweightEntry[]>(queryKey, existing => existing
        ? [...existing.filter(item => item.id !== entry.id && item.recordedOn !== entry.recordedOn), entry]
          .sort((left, right) => left.recordedOn.localeCompare(right.recordedOn))
        : undefined,
      )
      refreshConsumers()
      setDraft({ text: '', units: profile.units })
      setSaved(true)
    } catch (cause) {
      if (current()) setLogError(getApiErrorMessage(cause, 'Unable to save bodyweight. Try again.'))
    } finally {
      busy.current = false
      if (current()) setPending(null)
    }
  }
  const remove = async () => {
    if (!current() || busy.current || !deleteCandidate) return
    busy.current = true
    setPending('delete')
    setDeleteError(null)
    try {
      await deleteBodyweightEntry(buildUserContext(user), { id: deleteCandidate.id })
      if (!current()) return
      await cancelOldReads()
      if (!current()) return
      client.setQueryData<BodyweightEntry[]>(queryKey, existing => existing?.filter(entry => entry.id !== deleteCandidate.id))
      refreshConsumers()
      setDeleteCandidate(null)
    } catch (cause) {
      if (current()) setDeleteError(getApiErrorMessage(cause, 'Unable to delete this entry. Try again.'))
    } finally {
      busy.current = false
      if (current()) setPending(null)
    }
  }
  return {
    entries, weight: draft.text, inputUnits, dirty, pending, logError, deleteError, saved, deleteCandidate, log, remove,
    setWeight: (text: string) => {
      if (!current() || busy.current) return
      setDraft({ text, units: inputUnits })
      setLogError(null)
      setSaved(false)
    },
    discard: () => {
      if (!current() || busy.current) return
      setDraft({ text: '', units: profile.units })
      setLogError(null)
    },
    requestDelete: (entry: BodyweightEntry) => {
      if (!current() || busy.current) return
      setDeleteError(null)
      setDeleteCandidate(entry)
    },
    cancelDelete: () => {
      if (!current() || busy.current) return
      setDeleteCandidate(null)
      setDeleteError(null)
    },
  }
}
