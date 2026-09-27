import { useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import { deleteOwnAccount, exportAccountData } from '@sheetless/data/account/data-rights'
import { deleteAccountInputSchema } from '@sheetless/domain/account/data-rights'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { getSupabase } from '@/lib/supabase'
import { shareAccountExport } from './account-export'

type AccountAction = 'export' | 'signOut' | 'delete' | 'legal'
type ActionError = { action: AccountAction; message: string } | null

export function useDataAccount(user: User) {
  const client = useQueryClient()
  const [pending, setPending] = useState<AccountAction | null>(null)
  const [error, setError] = useState<ActionError>(null)
  const [exportPrepared, setExportPrepared] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const owner = useRef<string | null>(null)
  const busy = useRef(false)
  const deletionCommitted = useRef(false)
  useLayoutEffect(() => {
    owner.current = user.id
    return () => { owner.current = null }
  }, [user.id])
  const current = () => owner.current === user.id
  const currentSession = async () => {
    const { data, error: failure } = await getSupabase().auth.getSession()
    if (!current()) return false
    if (failure) throw failure
    if (data.session?.user.id !== user.id) throw new Error('Your signed-in account changed. Reopen this screen before continuing.')
    return true
  }
  const run = async (action: AccountAction, perform: () => Promise<void>) => {
    if (!current() || busy.current) return
    busy.current = true
    setPending(action)
    setError(null)
    try {
      await perform()
    } catch (cause) {
      if (current()) setError({ action, message: getApiErrorMessage(cause, 'That action could not finish. Try again.') })
    } finally {
      busy.current = false
      if (current()) setPending(null)
    }
  }
  const signOut = () => run('signOut', async () => {
    if (!await currentSession()) return
    const { error: failure } = await getSupabase().auth.signOut()
    if (!current()) return
    if (failure) throw failure
    client.removeQueries({ queryKey: accountQueryKeys.user(user.id) })
  })
  const exportData = () => run('export', async () => {
    setExportPrepared(false)
    if (!await currentSession()) return
    const value = await exportAccountData(buildUserContext(user))
    if (!current() || !await currentSession()) return
    await shareAccountExport(value, current)
    if (current()) setExportPrepared(true)
  })
  const deleteAccount = (confirmation: string) => run('delete', async () => {
    const input = deleteAccountInputSchema.parse({ confirmation })
    if (!await currentSession()) return
    if (!deletionCommitted.current) {
      await deleteOwnAccount(buildUserContext(user), input)
      if (!current()) return
      deletionCommitted.current = true
    }
    if (!await currentSession()) return
    // The server has removed the account. Clear only this actor's local session and cache.
    const { error: failure } = await getSupabase().auth.signOut({ scope: 'local' })
    if (!current()) return
    if (failure) throw failure
    client.removeQueries({ queryKey: accountQueryKeys.user(user.id) })
    setDeleteOpen(false)
  })
  return {
    pending, error, exportPrepared, deleteOpen, signOut, exportData, deleteAccount,
    openDelete: () => {
      if (!current() || busy.current) return
      setError(null)
      setDeleteOpen(true)
    },
    closeDelete: () => {
      if (!current() || busy.current) return
      setDeleteOpen(false)
      setError(null)
    },
    openLegal: (path: '/privacy' | '/terms' | '/account-deletion') => run('legal', async () => {
      await WebBrowser.openBrowserAsync(`https://www.sheetless.fitness${path}`)
    }),
  }
}
