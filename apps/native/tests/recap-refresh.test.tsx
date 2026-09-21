import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { expect, it, vi } from 'vitest'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
const api = vi.hoisted(() => ({ favorite: vi.fn(), rename: vi.fn(), getSession: vi.fn() }))
vi.mock('@sheetless/data/session/favorites', () => ({ setSessionFavorite: api.favorite }))
vi.mock('@sheetless/data/session/lifecycle', () => ({ renameSession: api.rename }))
vi.mock('@sheetless/data/session/reads', () => ({ getSession: api.getSession }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
import { useSessionFavorite } from '../src/features/session/summary/useSessionFavorite'
import { useRenameWorkoutMutation } from '../src/features/session/editing/useWorkoutIdentityMutations'

it.each([false, true])('refreshes the authoritative receipt after favourite writes (response lost: %s)', async (lost) => {
  const user = { id: 'account' } as User
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  const key = accountQueryKeys.sessionReceipt(user.id, 'workout')
  const other = accountQueryKeys.sessionReceipt('other-account', 'other-workout')
  client.setQueryData(key, { session: { sessionId: 'workout', isFavorite: false } })
  client.setQueryData(other, { session: { sessionId: 'other-workout', isFavorite: false } })
  const read = vi.fn(async () => ({ session: { sessionId: 'workout', isFavorite: true } }))
  api.favorite.mockImplementation(async () => {
    if (lost) throw new Error('Response lost')
    return { sessionId: 'workout', isFavorite: true }
  })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(() => {
    const receipt = useQuery({ queryKey: key, queryFn: read })
    return { receipt, favorite: useSessionFavorite(user) }
  }, { wrapper })
  await act(async () => { hook.result.current.favorite.mutate({ sessionId: 'workout', favorite: true, title: 'Favourite workout' }) })
  await waitFor(() => expect(hook.result.current.receipt.data?.session.isFavorite).toBe(true))
  expect(read).toHaveBeenCalledOnce()
  expect(client.getQueryState(other)?.isInvalidated).toBe(false)
  hook.unmount()
  client.clear()
})

it.each(['saved', 'response-lost', 'reconciliation-unavailable'])('refreshes receipt titles after rename: %s', async outcome => {
  const user = { id: 'account' } as User
  const session = { sessionId: 'workout', title: 'Before', stateVersion: 1, movements: [], status: 'completed' } as unknown as WorkoutSession
  const saved = { ...session, title: 'After', stateVersion: 2 }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  const key = accountQueryKeys.sessionReceipt(user.id, session.sessionId)
  const other = accountQueryKeys.sessionReceipt('other-account', session.sessionId)
  client.setQueryData(key, { session })
  client.setQueryData(other, { session })
  const read = vi.fn(async () => ({ session: saved }))
  api.rename.mockImplementation(async () => {
    if (outcome !== 'saved') throw new Error('Response lost')
    return saved
  })
  api.getSession.mockImplementation(async () => {
    if (outcome === 'reconciliation-unavailable') throw new Error('Read unavailable')
    return saved
  })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(() => ({
    receipt: useQuery({ queryKey: key, queryFn: read }),
    rename: useRenameWorkoutMutation({ user, session }),
  }), { wrapper })
  await act(async () => { hook.result.current.rename.mutate('After') })
  await waitFor(() => expect(hook.result.current.receipt.data?.session.title).toBe('After'))
  expect(read).toHaveBeenCalledOnce()
  expect(client.getQueryState(other)?.isInvalidated).toBe(false)
  hook.unmount()
  client.clear()
})
