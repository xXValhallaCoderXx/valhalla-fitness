import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { useStartAdHocWorkout } from '../src/features/session/today/useStartAdHocWorkout'

const api = vi.hoisted(() => ({ start: vi.fn() }))
vi.mock('@sheetless/data/session/lifecycle', () => ({ startAdHocSession: api.start }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('@sheetless/domain/shared/calendar-date', () => ({ browserIanaTimeZone: () => 'Asia/Singapore' }))

const userA = { id: 'account-a' } as User
const userB = { id: 'account-b' } as User
const workout = { id: 'ad-hoc', sessionId: 'session-a', status: 'in_progress', stateVersion: 1,
  isAdHoc: true, title: 'Repeated workout', units: 'kg', movements: [] } as unknown as WorkoutSession

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
beforeEach(() => vi.resetAllMocks())

describe('ad-hoc start recovery and account isolation', () => {
  it('retries a committed write with its original token and preserves public intent callbacks', async () => {
    const { client, wrapper } = harness()
    const committed = new Map<string, WorkoutSession>()
    api.start.mockImplementation(async (_ctx, input: { clientMutationId: string }) => {
      const saved = committed.get(input.clientMutationId)
      if (saved) return saved
      committed.set(input.clientMutationId, workout)
      throw new Error('Response lost')
    })
    const success = vi.fn()
    const { result } = renderHook(() => useStartAdHocWorkout(userA), { wrapper })
    act(() => result.current.mutate({ sourceSessionId: 'source' }, { onSuccess: success }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(success).not.toHaveBeenCalled()
    act(() => result.current.mutate({ sourceSessionId: 'source' }, { onSuccess: success }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(committed.size).toBe(1)
    expect(api.start.mock.calls[1][1]).toEqual(api.start.mock.calls[0][1])
    expect(success.mock.calls[0][1]).toEqual({ sourceSessionId: 'source' })
    expect(result.current.variables).toEqual({ sourceSessionId: 'source' })
    expect(client.getQueryData(accountQueryKeys.session(userA.id, workout.sessionId))).toEqual(workout)
  })

  it('captures the original actor and suppresses late callbacks/cache writes after account changes', async () => {
    const { client, wrapper } = harness()
    const pending = deferred<WorkoutSession>()
    api.start.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(workout)
    const success = vi.fn()
    const { result, rerender } = renderHook(({ user }) => useStartAdHocWorkout(user), { wrapper, initialProps: { user: userA } })
    act(() => result.current.mutate({}, { onSuccess: success }))
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    rerender({ user: userB })
    await act(async () => pending.resolve(workout))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(api.start.mock.calls[0][0].user.id).toBe(userA.id)
    expect(success).not.toHaveBeenCalled()
    expect(client.getQueryData(accountQueryKeys.session(userA.id, workout.sessionId))).toBeUndefined()
    expect(client.getQueryData(accountQueryKeys.session(userB.id, workout.sessionId))).toBeUndefined()
    act(() => result.current.mutate({}, { onSuccess: success }))
    await waitFor(() => expect(success).toHaveBeenCalledOnce())
    expect(api.start.mock.calls[1][0].user.id).toBe(userB.id)
    expect(api.start.mock.calls[1][1].clientMutationId).not.toBe(api.start.mock.calls[0][1].clientMutationId)
  })

  it('ignores late results after leaving and returning to the same account', async () => {
    const { client, wrapper } = harness()
    const pending = deferred<WorkoutSession>()
    api.start.mockReturnValueOnce(pending.promise)
    const success = vi.fn()
    const { result, rerender } = renderHook(({ user }) => useStartAdHocWorkout(user), { wrapper, initialProps: { user: userA } })
    act(() => result.current.mutate({}, { onSuccess: success }))
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    rerender({ user: userB })
    rerender({ user: userA })
    await act(async () => pending.resolve(workout))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(success).not.toHaveBeenCalled()
    expect(client.getQueryData(accountQueryKeys.session(userA.id, workout.sessionId))).toBeUndefined()
  })

  it('retains mutateAsync for blank-workout callers and blocks callbacks after unmount', async () => {
    const { client, wrapper } = harness()
    const pending = deferred<WorkoutSession>()
    api.start.mockReturnValueOnce(pending.promise)
    const success = vi.fn()
    const { result, unmount } = renderHook(() => useStartAdHocWorkout(userA), { wrapper })
    let promise!: Promise<WorkoutSession>
    act(() => { promise = result.current.mutateAsync({}, { onSuccess: success }) })
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    unmount()
    await act(async () => pending.resolve(workout))
    expect(await promise).toEqual(workout)
    expect(success).not.toHaveBeenCalled()
    expect(client.getQueryData(accountQueryKeys.session(userA.id, workout.sessionId))).toBeUndefined()
  })
})
