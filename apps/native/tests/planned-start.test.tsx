import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { useStartPlannedWorkout } from '../src/features/session/today/useStartPlannedWorkout'

const api = vi.hoisted(() => ({ start: vi.fn(), push: vi.fn() }))
vi.mock('@sheetless/data/session/lifecycle', () => ({ startSession: api.start }))
vi.mock('expo-router', () => ({ router: { push: api.push } }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('@sheetless/domain/shared/calendar-date', () => ({ browserIanaTimeZone: () => 'Asia/Singapore' }))

const userA = { id: 'account-a' } as User
const userB = { id: 'account-b' } as User

function workout(sessionId = 'workout-a'): WorkoutSession {
  return {
    id: 'planned-1', sessionId, stateVersion: 1, status: 'in_progress', title: 'Squat day',
    programTitle: 'My plan', templateId: 'plan-1', weekIndex: 0, weekLabel: 'Week 1',
    hardness: 'Medium', scheduledDate: '2026-09-22', estimatedMinutes: 45,
    units: 'kg', rounding: 2.5, movements: [],
  }
}

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(() => vi.resetAllMocks())

describe('shared planned-workout entry', () => {
  it('pins setup success to its programme and changes retry identity when that programme changes', async () => {
    const { wrapper } = harness()
    api.start.mockRejectedValue(new Error('The active plan changed'))
    const { result, rerender } = renderHook(({ expected }) => useStartPlannedWorkout(userA, expected), {
      wrapper, initialProps: { expected: 'created-plan' },
    })
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))
    const first = api.start.mock.calls[0][1]
    expect(first.expectedProgramId).toBe('created-plan')
    expect(api.push).not.toHaveBeenCalled()
    act(() => result.current.mutate())
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2))
    expect(api.start.mock.calls[1][1]).toEqual(first)
    rerender({ expected: 'different-created-plan' })
    act(() => result.current.mutate())
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(3))
    expect(api.start.mock.calls[2][1]).toMatchObject({ expectedProgramId: 'different-created-plan' })
    expect(api.start.mock.calls[2][1].clientMutationId).not.toBe(first.clientMutationId)
    expect(api.push).not.toHaveBeenCalled()
  })

  it('retries the same request explicitly and clears its token only after confirmation', async () => {
    const { client, wrapper } = harness()
    const resultSession = workout()
    api.start.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(resultSession).mockResolvedValueOnce(workout('next-workout'))
    const { result } = renderHook(() => useStartPlannedWorkout(userA), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(api.start).toHaveBeenCalledTimes(1)
    expect(api.push).not.toHaveBeenCalled()
    expect(client.getQueryData(accountQueryKeys.session(userA.id, resultSession.sessionId))).toBeUndefined()

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.start.mock.calls[1][1]).toEqual(api.start.mock.calls[0][1])
    expect(api.start.mock.calls[1][1]).toMatchObject({ clientMutationId: expect.any(String), timeZone: 'Asia/Singapore' })
    expect(client.getQueryData(accountQueryKeys.session(userA.id, resultSession.sessionId))).toEqual(resultSession)
    expect(api.push).toHaveBeenCalledTimes(1)

    act(() => result.current.mutate())
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(3))
    expect(api.start.mock.calls[2][1].clientMutationId).not.toBe(api.start.mock.calls[1][1].clientMutationId)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('does not seed another account or navigate when an old account response arrives', async () => {
    const { client, wrapper } = harness()
    const pending = deferred<WorkoutSession>()
    const onSuccess = vi.fn()
    api.start.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(workout('workout-b'))
    const { result, rerender } = renderHook(({ user }) => useStartPlannedWorkout(user), { wrapper, initialProps: { user: userA } })
    act(() => result.current.mutate(undefined, { onSuccess }))
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(1))
    expect(api.start.mock.calls[0][0].user.id).toBe(userA.id)

    rerender({ user: userB })
    await act(async () => pending.resolve(workout()))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(client.getQueryData(accountQueryKeys.session(userA.id, 'workout-a'))).toBeUndefined()
    expect(client.getQueryData(accountQueryKeys.session(userB.id, 'workout-a'))).toBeUndefined()
    expect(api.push).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.start.mock.calls[1][0].user.id).toBe(userB.id)
    expect(api.start.mock.calls[1][1].clientMutationId).not.toBe(api.start.mock.calls[0][1].clientMutationId)
    expect(client.getQueryData(accountQueryKeys.session(userB.id, 'workout-b'))).toMatchObject({ sessionId: 'workout-b' })
    expect(api.push).toHaveBeenCalledTimes(1)
  })

  it('ignores a successful response after the entry surface unmounts', async () => {
    const { client, wrapper } = harness()
    const pending = deferred<WorkoutSession>()
    const onSuccess = vi.fn()
    api.start.mockReturnValue(pending.promise)
    const { result, unmount } = renderHook(() => useStartPlannedWorkout(userA), { wrapper })
    act(() => result.current.mutate(undefined, { onSuccess }))
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(1))
    unmount()
    await act(async () => pending.resolve(workout()))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(client.getQueryData(accountQueryKeys.session(userA.id, 'workout-a'))).toBeUndefined()
    expect(api.push).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('ignores a late start response after setup success has moved to a different receipt', async () => {
    const { client, wrapper } = harness()
    const pending = deferred<WorkoutSession>()
    const onSuccess = vi.fn()
    api.start.mockReturnValue(pending.promise)
    const { result, rerender } = renderHook(({ expected }) => useStartPlannedWorkout(userA, expected), {
      wrapper, initialProps: { expected: 'created-plan' },
    })
    act(() => result.current.mutate(undefined, { onSuccess }))
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(1))
    rerender({ expected: 'new-created-plan' })
    await act(async () => pending.resolve(workout()))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(api.push).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(client.getQueryData(accountQueryKeys.session(userA.id, 'workout-a'))).toBeUndefined()
  })

  it('recovers a committed start with a lost response through its original request', async () => {
    const { client, wrapper } = harness()
    const committed = new Map<string, WorkoutSession>()
    let createdWorkouts = 0
    api.start.mockImplementation(async (_ctx, input: { clientMutationId: string }) => {
      const existing = committed.get(input.clientMutationId)
      if (existing) return existing
      createdWorkouts += 1
      committed.set(input.clientMutationId, workout())
      throw new Error('Response lost after saving')
    })
    client.setQueryData(accountQueryKeys.programOverview(userA.id), { hasActiveSession: false })
    const { result } = renderHook(() => useStartPlannedWorkout(userA), { wrapper })
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(api.push).not.toHaveBeenCalled()
    expect(createdWorkouts).toBe(1)
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createdWorkouts).toBe(1)
    expect(api.start).toHaveBeenCalledTimes(2)
    expect(client.getQueryData(accountQueryKeys.programOverview(userA.id))).toEqual({ hasActiveSession: true })
    expect(client.getQueryData(accountQueryKeys.session(userA.id, 'workout-a'))).toEqual(workout())
    expect(api.push).toHaveBeenCalledExactlyOnceWith({ pathname: '/session/[sessionId]', params: { sessionId: 'workout-a' } })
  })
})
