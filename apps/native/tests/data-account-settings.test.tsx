import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ export: vi.fn(), remove: vi.fn(), share: vi.fn(), getSession: vi.fn(), signOut: vi.fn(), browser: vi.fn() }))
vi.mock('@sheetless/data/account/data-rights', () => ({ exportAccountData: api.export, deleteOwnAccount: api.remove }))
vi.mock('../src/features/settings/account/account-export', () => ({ shareAccountExport: api.share }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user, supabase: {} }) }))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: { getSession: api.getSession, signOut: api.signOut } }) }))
vi.mock('expo-web-browser', () => ({ openBrowserAsync: api.browser }))
import { useDataAccount } from '../src/features/settings/account/useDataAccount'

const user = { id: 'account-a' } as User
const exported = { exportedAt: '2026-09-28T12:00:00Z', profile: { id: user.id } }
let client: QueryClient
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(accountQueryKeys.profile(user.id), { id: user.id })
  client.setQueryData(accountQueryKeys.profile('account-b'), { id: 'account-b' })
  api.getSession.mockResolvedValue({ data: { session: { user } }, error: null })
  api.signOut.mockResolvedValue({ error: null })
  api.export.mockResolvedValue(exported)
  api.remove.mockResolvedValue(undefined)
  api.share.mockResolvedValue(undefined)
})

describe('data and account actions', () => {
  it('serializes export against duplicate presses and all other account actions', async () => {
    const response = deferred<typeof exported>()
    api.export.mockReturnValue(response.promise)
    const { result } = renderHook(() => useDataAccount(user), { wrapper })
    let exporting!: Promise<void>
    act(() => {
      exporting = result.current.exportData()
      void result.current.exportData()
      void result.current.signOut()
      result.current.openDelete()
      void result.current.openLegal('/privacy')
    })
    await waitFor(() => expect(api.export).toHaveBeenCalledTimes(1))
    expect(result.current.pending).toBe('export')
    expect(result.current.deleteOpen).toBe(false)
    expect(api.signOut).not.toHaveBeenCalled()
    expect(api.browser).not.toHaveBeenCalled()
    await act(async () => { response.resolve(exported); await exporting })
    expect(api.share).toHaveBeenCalledWith(exported, expect.any(Function))
    expect(result.current.exportPrepared).toBe(true)
    expect(result.current.pending).toBeNull()
  })

  it('reports export failure without claiming success and permits an explicit retry', async () => {
    api.share.mockRejectedValueOnce(new Error('Sharing unavailable')).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useDataAccount(user), { wrapper })
    await act(() => result.current.exportData())
    expect(result.current.error).toEqual({ action: 'export', message: 'Sharing unavailable' })
    expect(result.current.exportPrepared).toBe(false)
    await act(() => result.current.exportData())
    expect(result.current.error).toBeNull()
    expect(result.current.exportPrepared).toBe(true)
  })

  it('does not share an export that resolves after its account screen unmounts', async () => {
    const response = deferred<typeof exported>()
    api.export.mockReturnValue(response.promise)
    const { result, unmount } = renderHook(() => useDataAccount(user), { wrapper })
    let exporting!: Promise<void>
    act(() => { exporting = result.current.exportData() })
    await waitFor(() => expect(api.export).toHaveBeenCalled())
    unmount()
    await act(async () => { response.resolve(exported); await exporting })
    expect(api.share).not.toHaveBeenCalled()
  })

  it('rejects an export if auth changes before sharing even before the screen rerenders', async () => {
    api.getSession.mockResolvedValueOnce({ data: { session: { user } }, error: null })
      .mockResolvedValueOnce({ data: { session: { user: { id: 'account-b' } } }, error: null })
    const { result } = renderHook(() => useDataAccount(user), { wrapper })
    await act(() => result.current.exportData())
    expect(api.share).not.toHaveBeenCalled()
    expect(result.current.error?.message).toContain('signed-in account changed')
  })

  it('passes sharing an ownership check that becomes false on unmount', async () => {
    const sharing = deferred<void>()
    api.share.mockReturnValue(sharing.promise)
    const { result, unmount } = renderHook(() => useDataAccount(user), { wrapper })
    let exporting!: Promise<void>
    act(() => { exporting = result.current.exportData() })
    await waitFor(() => expect(api.share).toHaveBeenCalled())
    const current = api.share.mock.calls[0][1] as () => boolean
    expect(current()).toBe(true)
    unmount()
    expect(current()).toBe(false)
    await act(async () => { sharing.resolve(); await exporting })
  })

  it('requires exact destructive confirmation and the same current signed-in actor', async () => {
    const { result } = renderHook(() => useDataAccount(user), { wrapper })
    act(() => result.current.openDelete())
    await act(() => result.current.deleteAccount('delete my account'))
    expect(api.remove).not.toHaveBeenCalled()
    expect(result.current.error?.action).toBe('delete')
    api.getSession.mockResolvedValue({ data: { session: { user: { id: 'account-b' } } }, error: null })
    await act(() => result.current.deleteAccount('DELETE MY ACCOUNT'))
    expect(api.remove).not.toHaveBeenCalled()
    expect(api.signOut).not.toHaveBeenCalled()
    expect(result.current.deleteOpen).toBe(true)
  })

  it('keeps failed deletion open and retries without removing account caches early', async () => {
    api.remove.mockRejectedValueOnce(new Error('Delete unavailable')).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useDataAccount(user), { wrapper })
    act(() => result.current.openDelete())
    await act(() => result.current.deleteAccount('DELETE MY ACCOUNT'))
    expect(result.current.deleteOpen).toBe(true)
    expect(result.current.error?.message).toBe('Delete unavailable')
    expect(api.signOut).not.toHaveBeenCalled()
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeDefined()
    await act(() => result.current.deleteAccount('DELETE MY ACCOUNT'))
    expect(api.remove).toHaveBeenLastCalledWith(expect.objectContaining({ user }), { confirmation: 'DELETE MY ACCOUNT' })
    expect(api.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
    expect(client.getQueryData(accountQueryKeys.profile('account-b'))).toEqual({ id: 'account-b' })
    expect(result.current.deleteOpen).toBe(false)
  })

  it('retries local cleanup without requesting account deletion twice', async () => {
    api.signOut.mockResolvedValueOnce({ error: new Error('Local cleanup failed') }).mockResolvedValueOnce({ error: null })
    const { result } = renderHook(() => useDataAccount(user), { wrapper })
    act(() => result.current.openDelete())
    await act(() => result.current.deleteAccount('DELETE MY ACCOUNT'))
    expect(result.current.error?.message).toBe('Local cleanup failed')
    expect(result.current.deleteOpen).toBe(true)
    await act(() => result.current.deleteAccount('DELETE MY ACCOUNT'))
    expect(api.remove).toHaveBeenCalledTimes(1)
    expect(api.signOut).toHaveBeenCalledTimes(2)
    expect(result.current.deleteOpen).toBe(false)
  })

  it('does not sign out another actor when a deletion response arrives late', async () => {
    const response = deferred<void>()
    api.remove.mockReturnValue(response.promise)
    const { result, unmount } = renderHook(() => useDataAccount(user), { wrapper })
    let deleting!: Promise<void>
    act(() => { deleting = result.current.deleteAccount('DELETE MY ACCOUNT') })
    await waitFor(() => expect(api.remove).toHaveBeenCalled())
    unmount()
    api.getSession.mockResolvedValue({ data: { session: { user: { id: 'account-b' } } }, error: null })
    await act(async () => { response.resolve(); await deleting })
    expect(api.signOut).not.toHaveBeenCalled()
    expect(client.getQueryData(accountQueryKeys.profile('account-b'))).toEqual({ id: 'account-b' })
  })

  it('leaves account data available after a failed sign-out and removes only its cache on retry', async () => {
    api.signOut.mockResolvedValueOnce({ error: new Error('Sign-out failed') }).mockResolvedValueOnce({ error: null })
    const { result } = renderHook(() => useDataAccount(user), { wrapper })
    await act(() => result.current.signOut())
    expect(result.current.error?.message).toBe('Sign-out failed')
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeDefined()
    await act(() => result.current.signOut())
    expect(result.current.error).toBeNull()
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
    expect(client.getQueryData(accountQueryKeys.profile('account-b'))).toEqual({ id: 'account-b' })
  })
})
