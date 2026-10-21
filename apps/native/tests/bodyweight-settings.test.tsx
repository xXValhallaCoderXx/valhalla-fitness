import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { BodyweightEntry, UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), log: vi.fn(), remove: vi.fn() }))
vi.mock('@sheetless/data/account/bodyweight', () => ({
  getBodyweightEntries: api.get, logBodyweight: api.log, deleteBodyweightEntry: api.remove,
}))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user, supabase: {} }) }))
import { useBodyweightSettings } from '../src/features/settings/profile/useBodyweightSettings'

const user = { id: 'account-a' } as User
const profile = { id: user.id, units: 'kg', timezone: 'UTC' } as UserProfile
const first: BodyweightEntry = { id: 'first', recordedOn: '2026-09-26', weightKg: 80 }
const recent: BodyweightEntry = { id: 'recent', recordedOn: '2026-09-27', weightKg: 81 }
let client: QueryClient
const key = accountQueryKeys.bodyweight(user.id)
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  client.setQueryData(key, [first, recent])
  api.get.mockResolvedValue([first, recent])
})

describe('bodyweight settings state', () => {
  it('retains the entered unit across profile refreshes and replaces the same day only after save succeeds', async () => {
    const saved = { ...recent, id: 'replacement', weightKg: 82 }
    api.log.mockResolvedValue(saved)
    client.setQueryData(accountQueryKeys.history(user.id), { retained: true })
    const { result, rerender } = renderHook(({ currentProfile }) => useBodyweightSettings(user, currentProfile), {
      wrapper, initialProps: { currentProfile: profile },
    })
    act(() => result.current.setWeight('82,0'))
    rerender({ currentProfile: { ...profile, units: 'lb' } })
    expect(result.current.inputUnits).toBe('kg')
    expect(result.current.dirty).toBe(true)
    await act(() => result.current.log())
    expect(api.log).toHaveBeenCalledWith(expect.objectContaining({ user }), expect.objectContaining({ weight: 82, unit: 'kg' }))
    expect(client.getQueryData(key)).toEqual([first, saved])
    expect(client.getQueryState(accountQueryKeys.history(user.id))?.isInvalidated).toBe(true)
    expect(result.current.weight).toBe('')
    expect(result.current.inputUnits).toBe('lb')
    expect(result.current.dirty).toBe(false)
    expect(result.current.saved).toBe(true)
  })

  it('keeps a failed input for explicit retry and rejects implausible weights before a request', async () => {
    const { result } = renderHook(() => useBodyweightSettings(user, profile), { wrapper })
    act(() => result.current.setWeight('10'))
    await act(() => result.current.log())
    expect(api.log).not.toHaveBeenCalled()
    expect(result.current.logError).toContain('between 20 and 500 kg')
    api.log.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ ...recent, weightKg: 82 })
    act(() => result.current.setWeight('82'))
    await act(() => result.current.log())
    expect(result.current.weight).toBe('82')
    expect(result.current.logError).toBe('Connection lost')
    expect(client.getQueryData(key)).toEqual([first, recent])
    await act(() => result.current.log())
    expect(result.current.logError).toBeNull()
    expect(result.current.weight).toBe('')
  })

  it('blocks repeated actions and edits until the save receipt arrives', async () => {
    const request = deferred<BodyweightEntry>()
    api.log.mockReturnValue(request.promise)
    const { result } = renderHook(() => useBodyweightSettings(user, profile), { wrapper })
    act(() => result.current.setWeight('82'))
    let saving!: Promise<void>
    act(() => { saving = result.current.log(); void result.current.log(); result.current.requestDelete(first); result.current.setWeight('90') })
    expect(api.log).toHaveBeenCalledTimes(1)
    expect(result.current.pending).toBe('log')
    expect(result.current.deleteCandidate).toBeNull()
    expect(result.current.weight).toBe('82')
    await act(async () => { request.resolve({ ...recent, weightKg: 82 }); await saving })
    expect(result.current.pending).toBeNull()
  })

  it('keeps delete confirmation and unrelated typed input after failure, then removes only the confirmed entry', async () => {
    api.remove.mockRejectedValueOnce(new Error('Try again')).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useBodyweightSettings(user, profile), { wrapper })
    act(() => { result.current.setWeight('82'); result.current.requestDelete(first) })
    await act(() => result.current.remove())
    expect(result.current.deleteCandidate).toEqual(first)
    expect(result.current.deleteError).toBe('Try again')
    expect(client.getQueryData(key)).toEqual([first, recent])
    await act(() => result.current.remove())
    expect(api.remove).toHaveBeenLastCalledWith(expect.objectContaining({ user }), { id: first.id })
    expect(client.getQueryData(key)).toEqual([recent])
    expect(result.current.deleteCandidate).toBeNull()
    expect(result.current.weight).toBe('82')
  })

  it('keeps a failed history read distinct from an empty account, even if a new measurement saves', async () => {
    client.removeQueries({ queryKey: key })
    api.get.mockRejectedValue(new Error('History unavailable'))
    api.log.mockResolvedValue(recent)
    const { result } = renderHook(() => useBodyweightSettings(user, profile), { wrapper })
    await waitFor(() => expect(result.current.entries.isError).toBe(true))
    expect(result.current.entries.data).toBeUndefined()
    act(() => result.current.setWeight('81'))
    await act(() => result.current.log())
    await waitFor(() => expect(result.current.entries.isError).toBe(true))
    expect(result.current.entries.data).toBeUndefined()
    expect(result.current.saved).toBe(true)
    api.get.mockResolvedValue([])
    await act(() => result.current.entries.refetch())
    await waitFor(() => expect(result.current.entries.isSuccess).toBe(true))
    expect(result.current.entries.data).toEqual([])
  })

  it('reloads complete history after saving while its first read is still pending', async () => {
    client.removeQueries({ queryKey: key })
    const initial = deferred<BodyweightEntry[]>()
    const saved = { ...recent, weightKg: 82 }
    api.get.mockReturnValueOnce(initial.promise).mockResolvedValueOnce([first, saved])
    api.log.mockResolvedValue(saved)
    const { result } = renderHook(() => useBodyweightSettings(user, profile), { wrapper })
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1))
    expect(result.current.entries.isPending).toBe(true)
    act(() => result.current.setWeight('82'))
    await act(() => result.current.log())
    await waitFor(() => expect(result.current.entries.data).toEqual([first, saved]))
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(result.current.entries.isPending).toBe(false)
    await act(async () => { initial.resolve([first, recent]); await initial.promise })
    expect(result.current.entries.data).toEqual([first, saved])
  })

  it('cancels a stale read before merging a saved measurement', async () => {
    const stale = deferred<BodyweightEntry[]>()
    const read = client.fetchQuery({ queryKey: key, queryFn: () => stale.promise }).catch(() => undefined)
    api.log.mockResolvedValue({ ...recent, weightKg: 82 })
    const { result } = renderHook(() => useBodyweightSettings(user, profile), { wrapper })
    act(() => result.current.setWeight('82'))
    await act(() => result.current.log())
    await act(async () => { stale.resolve([first, recent]); await read })
    expect(client.getQueryData(key)).toEqual([first, { ...recent, weightKg: 82 }])
  })

  it('refreshes an already mounted Insights observer after cancelling its stale read', async () => {
    const historyKey = accountQueryKeys.historyDashboard(user.id)
    client.setQueryData(historyKey, { weightKg: 81 })
    const stale = deferred<{ weightKg: number }>()
    const read = client.fetchQuery({ queryKey: historyKey, queryFn: () => stale.promise }).catch(() => undefined)
    const refresh = vi.fn(async () => ({ weightKg: 82 }))
    const observer = new QueryObserver(client, { queryKey: historyKey, queryFn: refresh, staleTime: Infinity })
    const unsubscribe = observer.subscribe(() => {})
    api.log.mockResolvedValue({ ...recent, weightKg: 82 })
    const { result } = renderHook(() => useBodyweightSettings(user, profile), { wrapper })
    act(() => result.current.setWeight('82'))
    await act(() => result.current.log())
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    await act(async () => { stale.resolve({ weightKg: 81 }); await read })
    expect(client.getQueryData(historyKey)).toEqual({ weightKg: 82 })
    unsubscribe()
  })

  it.each(['receipt', 'cache cancellation'] as const)('ignores a late %s after the account leaves', async boundary => {
    const receipt = deferred<BodyweightEntry>()
    const cancellation = deferred<void>()
    api.log.mockReturnValue(boundary === 'receipt' ? receipt.promise : Promise.resolve(recent))
    const cancel = boundary === 'cache cancellation'
      ? vi.spyOn(client, 'cancelQueries').mockReturnValueOnce(cancellation.promise) : null
    const { result, unmount } = renderHook(() => useBodyweightSettings(user, profile), { wrapper })
    act(() => result.current.setWeight('81'))
    let saving!: Promise<void>
    act(() => { saving = result.current.log() })
    if (cancel) await waitFor(() => expect(cancel).toHaveBeenCalled())
    unmount()
    client.clear()
    const nextKey = accountQueryKeys.bodyweight('account-b')
    client.setQueryData(nextKey, [{ ...first, id: 'other' }])
    await act(async () => { receipt.resolve(recent); cancellation.resolve(); await saving })
    expect(client.getQueryData(key)).toBeUndefined()
    expect(client.getQueryData(nextKey)).toEqual([{ ...first, id: 'other' }])
  })
})
