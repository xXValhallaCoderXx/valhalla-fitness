import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ProgramCycleBoundary } from '@sheetless/domain/program/cycle-boundary'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
const api = vi.hoisted(() => ({ read: vi.fn(), repeat: vi.fn() }))
vi.mock('@sheetless/data/program/cycle-boundary', () => ({ getCycleReview: api.read, repeatProgramCycle: api.repeat }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
import { useCycleChoice } from '../src/features/program/cycle/useCycleChoice'

const user = { id: 'account-a' } as User
const boundary = { id: 'boundary-a', programId: 'program-a' } as ProgramCycleBoundary
const state = { program: { id: 'program-a', stateVersion: 8 }, boundary, pendingDecisions: [], activeSessionId: null }
const done = vi.fn()
let client: QueryClient
function mount() {
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(({ account }) => useCycleChoice(account, boundary, done), { wrapper, initialProps: { account: user } })
}
beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  api.read.mockResolvedValue(state)
  api.repeat.mockResolvedValue({ programId: 'program-a', boundaryId: boundary.id })
})

describe('native cycle choice recovery', () => {
  it('waits for the fresh read and blocks pending progression or an active workout', async () => {
    for (const blockers of [{ pendingDecisions: [{ id: 'pending' }] }, { activeSessionId: 'active' }]) {
      api.read.mockResolvedValue({ ...state, ...blockers })
      const hook = mount()
      act(() => hook.result.current.submit())
      await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
      act(() => hook.result.current.submit())
      expect(api.repeat).not.toHaveBeenCalled()
      hook.unmount(); client.clear()
    }
  })
  it('retries the exact lost-response intent even after a new read no longer sees the boundary', async () => {
    api.repeat.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({})
    const hook = mount()
    await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
    act(() => hook.result.current.submit())
    await waitFor(() => expect(hook.result.current.retry).toBe(true))
    const intent = api.repeat.mock.calls[0][1]
    api.read.mockResolvedValue(null)
    await act(async () => { await hook.result.current.query.refetch() })
    act(() => hook.result.current.submit())
    await waitFor(() => expect(done).toHaveBeenCalledOnce())
    expect(api.repeat.mock.calls[1][1]).toEqual(intent)
    expect(intent).toMatchObject({ expectedUserId: 'account-a', expectedVersion: 8 })
    hook.unmount(); client.clear()
  })
  it('requires a new review after a conflict and uses its fresh version', async () => {
    api.repeat.mockRejectedValueOnce(new Error('CYCLE_VERSION_CONFLICT')).mockResolvedValueOnce({})
    const hook = mount()
    await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
    act(() => hook.result.current.submit())
    await waitFor(() => expect(hook.result.current.conflict).toBe(true))
    expect(hook.result.current.retry).toBe(false)
    api.read.mockResolvedValue({ ...state, program: { ...state.program, stateVersion: 12 } })
    await act(async () => { await hook.result.current.reload() })
    await waitFor(() => expect(hook.result.current.query.data?.program.stateVersion).toBe(12))
    act(() => hook.result.current.submit())
    await waitFor(() => expect(done).toHaveBeenCalledOnce())
    expect(api.repeat.mock.calls[1][1].expectedVersion).toBe(12)
    expect(api.repeat.mock.calls[1][1].requestId).not.toBe(api.repeat.mock.calls[0][1].requestId)
    hook.unmount(); client.clear()
  })
  it('ignores a late successful response after account switching', async () => {
    let resolve!: (value: unknown) => void
    api.repeat.mockReturnValue(new Promise(done => { resolve = done }))
    const hook = mount()
    await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
    client.setQueryData(accountQueryKeys.today('account-b'), { untouched: true })
    act(() => hook.result.current.submit())
    await waitFor(() => expect(api.repeat).toHaveBeenCalledOnce())
    hook.rerender({ account: { id: 'account-b' } as User })
    await act(async () => { resolve({}) })
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(done).not.toHaveBeenCalled()
    expect(client.getQueryState(accountQueryKeys.today('account-b'))?.isInvalidated).toBe(false)
    hook.unmount(); client.clear()
  })
  it('Decide later/unmount performs no writes', async () => {
    const hook = mount()
    await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
    hook.unmount()
    expect(api.repeat).not.toHaveBeenCalled()
    expect(done).not.toHaveBeenCalled()
    client.clear()
  })
})
