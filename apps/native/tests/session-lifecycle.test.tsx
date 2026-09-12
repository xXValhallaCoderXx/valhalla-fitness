import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import type { SessionSummary } from '@sheetless/domain/session/types/read-models'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { patchSetInSession } from '@sheetless/domain/session/session-cache'

const api = vi.hoisted(() => ({ save: vi.fn(), finish: vi.fn(), replace: vi.fn(), prime: vi.fn(), start: vi.fn() }))
vi.mock('@sheetless/data/session/sets', () => ({ upsertSetLog: api.save }))
vi.mock('@sheetless/data/session/completion', () => ({ finishSession: api.finish }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('expo-router', () => ({ router: { replace: api.replace } }))
vi.mock('../src/features/session/rest-timer/rest-timer-context', () => ({
  useRestTimerControls: () => ({ prime: api.prime, startForSlot: api.start }),
}))
import { useSetLogMutation } from '../src/features/session/focus/useSetLogMutation'
import { useFinishSession } from '../src/features/session/lifecycle/useFinishSession'

const user = { id: 'user-1' } as User
const sessionKey = accountQueryKeys.session(user.id, 'session-1')
const reflection = { sessionRpe: 7, reflectionWin: 'Good form', reflectionImprove: null }

function workout(): WorkoutSession {
  return {
    id: 'planned-1', sessionId: 'session-1', stateVersion: 4, status: 'in_progress',
    title: 'Workout', programTitle: '', templateId: '', weekIndex: 0, weekLabel: '',
    hardness: null, scheduledDate: '2026-09-12', estimatedMinutes: 30, units: 'kg', rounding: 2.5,
    movements: [{
      id: 'exercise-1', movementId: 'barbell-bench-press', movementName: 'Bench press',
      role: 'main', orderIndex: 0, targetSummary: '2 × 5',
      sets: [1, 2].map(setIndex => ({ id: `set-${setIndex}`, setIndex, completed: false, syncState: 'synced' })),
    }],
  }
}

function harness(session = workout()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  client.setQueryData(sessionKey, session)
  client.setQueryData(accountQueryKeys.today(user.id), { activeSession: session })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper, cached: () => client.getQueryData<WorkoutSession>(sessionKey)! }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(() => vi.resetAllMocks())

describe('native set saving', () => {
  it('preserves failed input and its token until an explicit retry is confirmed', async () => {
    const session = workout()
    const { wrapper, cached } = harness(session)
    const first = deferred<WorkoutSession>()
    const retry = deferred<WorkoutSession>()
    api.save.mockReturnValueOnce(first.promise).mockReturnValueOnce(retry.promise)
    const { result, rerender } = renderHook(({ current }) =>
      useSetLogMutation(user, current, current.movements[0], 1), { wrapper, initialProps: { current: session } })
    const patch = { setIndex: 1, actualLoad: 82.5, actualReps: 5, actualRir: 2, completed: true, clientMutationId: 'save-1' }
    act(() => result.current.mutate(patch))
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    expect(cached().movements[0].sets[0]).toMatchObject({ ...patch, syncState: 'saving' })
    await act(async () => first.reject(new Error('Offline')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cached().movements[0].sets[0]).toMatchObject({ ...patch, syncState: 'syncFailed' })
    expect(api.save).toHaveBeenCalledTimes(1)
    rerender({ current: cached() })
    act(() => result.current.mutate(patch))
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2))
    expect(api.save.mock.calls[1][1]).toEqual(api.save.mock.calls[0][1])
    expect(cached().movements[0].sets[0].syncState).toBe('saving')
    const saved = patchSetInSession({ ...session, stateVersion: 5 }, { ...patch, movementSlotId: 'exercise-1', syncState: 'synced' })
    await act(async () => retry.resolve(saved))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cached()).toEqual(saved)
    expect(api.start).not.toHaveBeenCalled()
  })

  it('keeps another failed set when a different set saves successfully', async () => {
    const server = workout()
    const failed = patchSetInSession(server, {
      movementSlotId: 'exercise-1', setIndex: 1, actualLoad: 82.5,
      actualReps: 5, completed: true, clientMutationId: 'failed-1', syncState: 'syncFailed',
    })
    const { wrapper, cached } = harness(failed)
    const saved = patchSetInSession({ ...server, stateVersion: 5 }, {
      movementSlotId: 'exercise-1', setIndex: 2, actualLoad: 80,
      actualReps: 5, completed: true, clientMutationId: 'save-2', syncState: 'synced',
    })
    api.save.mockResolvedValue(saved)
    const { result } = renderHook(() => useSetLogMutation(user, failed, failed.movements[0], 2), { wrapper })
    await act(async () => { await result.current.mutateAsync({ setIndex: 2, actualLoad: 80, actualReps: 5, completed: true, clientMutationId: 'save-2' }) })
    expect(cached().stateVersion).toBe(5)
    expect(cached().movements[0].sets[0]).toEqual(failed.movements[0].sets[0])
    expect(cached().movements[0].sets[1]).toEqual(saved.movements[0].sets[1])
  })
})

describe('native finish recovery', () => {
  it.each(['saving', 'syncFailed'] as const)('blocks finish while a cached set is %s', async (syncState) => {
    const session = workout()
    const { client, wrapper } = harness(session)
    const { result } = renderHook(() => useFinishSession(user, session), { wrapper })
    client.setQueryData(sessionKey, patchSetInSession(session, { movementSlotId: 'exercise-1', setIndex: 1, syncState }))
    await act(async () => {
      await expect(result.current.mutateAsync(reflection)).rejects.toThrow('Save or retry all sets')
    })
    expect(api.finish).not.toHaveBeenCalled()
    expect(api.replace).not.toHaveBeenCalled()
  })

  it('retries a lost response with the same intent and reaches the persisted recap', async () => {
    const session = workout()
    const { client, wrapper } = harness(session)
    const summary: SessionSummary = { session: { ...session, status: 'completed' }, completedSets: 0, totalSets: 2, topSets: [], accessoryOutcomes: [], decisions: [] }
    api.finish.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(summary)
    const { result } = renderHook(() => useFinishSession(user, session, '  Kept notes  '), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync(reflection)).rejects.toThrow('Connection lost') })
    await waitFor(() => expect(result.current.errorMessage).toBe('Connection lost'))
    expect(api.replace).not.toHaveBeenCalled()
    await act(async () => { await result.current.mutateAsync(reflection) })
    expect(api.finish.mock.calls[1][1]).toEqual(api.finish.mock.calls[0][1])
    expect(api.finish.mock.calls[1][1]).toMatchObject({ ...reflection, notes: 'Kept notes', requestId: expect.any(String) })
    expect(client.getQueryData(accountQueryKeys.summary(user.id, session.sessionId))).toEqual(summary)
    expect(client.getQueryData(sessionKey)).toEqual(summary.session)
    expect(api.replace).toHaveBeenCalledWith({ pathname: '/session/[sessionId]/summary', params: { sessionId: session.sessionId } })
  })

  it('still opens recap when a post-finish cache refresh fails', async () => {
    const session = workout()
    const { client, wrapper } = harness(session)
    api.finish.mockResolvedValue({ session: { ...session, status: 'completed' } })
    vi.spyOn(client, 'invalidateQueries').mockRejectedValueOnce(new Error('Offline'))
    const { result } = renderHook(() => useFinishSession(user, session), { wrapper })
    await act(async () => { await result.current.mutateAsync(reflection) })
    expect(api.replace).toHaveBeenCalledTimes(1)
  })
})
