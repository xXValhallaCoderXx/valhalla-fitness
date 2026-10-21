import { useState, type PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { patchSetInSession } from '@sheetless/domain/session/session-cache'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkoutLogger } from '../src/features/session/editing/useWorkoutLogger'
import { setInputLabel } from '../src/features/session/focus/workout-display'
import { RestTimerControlsContext } from '../src/features/session/rest-timer/rest-timer-context'
import { createRestTimerController } from '../src/features/session/rest-timer/rest-timer-controller'
const api = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@sheetless/data/session/sets', () => ({ upsertSetLog: api.save }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
const user = { id: 'user' } as User
const key = accountQueryKeys.session(user.id, 'workout')
function workout(): WorkoutSession {
  return { sessionId: 'workout', status: 'in_progress', units: 'kg', rounding: 2.5, stateVersion: 0,
    movements: ['bench', 'row'].map((id, orderIndex) => ({ id, movementId: id, movementName: id, role: 'main', orderIndex, targetSummary: '',
      sets: [1, 2].map(setIndex => ({ id: `${id}-${setIndex}`, setIndex, exerciseLogId: id, targetLoad: 80, targetReps: 5, targetRir: 2, completed: false })) })) } as WorkoutSession
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  client.setQueryData(key, workout())
  const schedule = vi.fn().mockResolvedValue(null)
  const timer = createRestTimerController({ schedule, cancel: vi.fn().mockResolvedValue(undefined), onChange: vi.fn() }); timer.mount()
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}><RestTimerControlsContext.Provider value={timer.controls}>{children}</RestTimerControlsContext.Provider></QueryClientProvider>
  const useHarness = () => {
    const session = useQuery({ queryKey: key, queryFn: workout, enabled: false }).data!
    const [id, select] = useState<string | null>('bench')
    return useWorkoutLogger(user, session, session.movements.find(m => m.id === id)!, select, false)
  }
  return { client, wrapper, hook: useHarness, schedule }
}
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
beforeEach(() => vi.resetAllMocks())
describe('shared workout logger', () => {
  it('keeps a failed raw row visible after saving another set, then retries its exact value', async () => {
    const { client, wrapper, hook } = setup()
    const { result } = renderHook(hook, { wrapper })
    act(() => result.current.edit({ load: '52.75', reps: '5', rir: null }))
    await waitFor(() => expect(result.current.input.load).toBe('52.75'))
    api.save.mockRejectedValueOnce(new Error('Disconnected'))
    act(() => result.current.submit())
    await waitFor(() => expect(result.current.failed).toBe(true))
    const firstAttempt = api.save.mock.calls[0][1]
    act(() => result.current.selectSet(2))
    api.save.mockImplementation(async (_ctx, attempt) => patchSetInSession(client.getQueryData<WorkoutSession>(key)!, {
      ...attempt, movementSlotId: 'bench', syncState: 'synced',
    }))
    act(() => result.current.submit())
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.saving).toBe(false))
    act(() => result.current.selectMovement('bench'))
    act(() => result.current.selectSet(2))
    expect(setInputLabel(result.current.draftForSet(1)!, 'kg')).toBe('52.75 kg × 5')
    act(() => result.current.selectSet(1))
    act(() => result.current.submit())
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(3))
    expect(api.save.mock.calls[2][1]).toMatchObject({ actualLoad: 52.75, actualReps: 5, actualRir: null,
      clientMutationId: firstAttempt.clientMutationId })
  })
  it('retains raw drafts through exercise changes, unrelated server data and a Today round trip', async () => {
    const { client, wrapper, hook } = setup()
    const first = renderHook(hook, { wrapper })
    act(() => first.result.current.edit({ load: '82.', reps: '', rir: 1 }))
    await waitFor(() => expect(first.result.current.input.load).toBe('82.'))
    act(() => first.result.current.selectMovement('row'))
    expect(first.result.current.input.rir).toBeNull()
    act(() => first.result.current.edit({ load: '25' }))
    await waitFor(() => expect(first.result.current.input.load).toBe('25'))
    act(() => { client.setQueryData(key, { ...workout(), stateVersion: 1 }); first.result.current.selectMovement('bench') })
    expect(first.result.current.input).toMatchObject({ load: '82.', reps: '', rir: 1 })
    first.unmount()
    const returned = renderHook(hook, { wrapper })
    expect(returned.result.current.input).toMatchObject({ load: '82.', reps: '', rir: 1 })
    expect(api.save).not.toHaveBeenCalled()
  })
  it('pins a failed completion then confirms an exact retry, starts rest once and advances without carrying RIR', async () => {
    const { wrapper, hook, schedule } = setup()
    const { result } = renderHook(hook, { wrapper })
    api.save.mockRejectedValueOnce(new Error('Lost response'))
    act(() => result.current.edit({ rir: 1 }))
    await waitFor(() => expect(result.current.input.rir).toBe(1))
    act(() => result.current.submit())
    await waitFor(() => expect(result.current.failed).toBe(true))
    expect(result.current.selectedSetIndex).toBe(1)
    const attempt = api.save.mock.calls[0][1]
    api.save.mockResolvedValueOnce(patchSetInSession(workout(), { ...attempt, movementSlotId: 'bench', syncState: 'synced' }))
    act(() => result.current.submit())
    await waitFor(() => expect(result.current.selectedSetIndex).toBe(2))
    expect(result.current.input.rir).toBeNull()
    expect(api.save.mock.calls[1][1].clientMutationId).toBe(attempt.clientMutationId)
    expect(schedule).toHaveBeenCalledTimes(1)
  })
  it('preserves newer input and selection when an earlier request finishes', async () => {
    const { wrapper, hook } = setup()
    const { result } = renderHook(hook, { wrapper })
    const pending = deferred<WorkoutSession>(); api.save.mockReturnValue(pending.promise)
    act(() => result.current.edit({ load: '82.5' }))
    await waitFor(() => expect(result.current.input.load).toBe('82.5'))
    act(() => result.current.submit())
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    act(() => result.current.edit({ load: '85.' }))
    await waitFor(() => expect(result.current.input.load).toBe('85.'))
    await act(async () => pending.resolve(patchSetInSession(workout(), { ...api.save.mock.calls[0][1], movementSlotId: 'bench', syncState: 'synced' })))
    await waitFor(() => expect(result.current.saving).toBe(false))
    expect(result.current.input.load).toBe('85.')
    expect(result.current.selectedSetIndex).toBe(1)
  })
  it('explicitly clears recorded effort and Undo keeps values and selection', async () => {
    const { client, wrapper, hook, schedule } = setup()
    client.setQueryData(key, patchSetInSession(workout(), { movementSlotId: 'bench', setIndex: 1, actualLoad: 0, actualReps: 8, actualRir: 2, completed: true }))
    const { result } = renderHook(hook, { wrapper })
    act(() => result.current.selectSet(1))
    act(() => result.current.edit({ rir: null }))
    await waitFor(() => expect(result.current.input.rir).toBeNull())
    api.save.mockImplementation(async (_ctx, attempt) => patchSetInSession(client.getQueryData<WorkoutSession>(key)!, { ...attempt, movementSlotId: 'bench', syncState: 'synced' }))
    act(() => result.current.submit(false))
    await waitFor(() => expect(result.current.set.completed).toBe(false))
    expect(api.save.mock.calls[0][1]).toMatchObject({ actualLoad: 0, actualReps: 8, actualRir: null, completed: false })
    expect(result.current.selectedSetIndex).toBe(1)
    expect(result.current.input).toMatchObject({ load: '0', reps: '8', rir: null })
    expect(schedule).not.toHaveBeenCalled()
  })
})

it('keeps an in-flight save and its failure on the original exercise after navigation', async () => {
  const { wrapper, hook, client } = setup()
  const { result } = renderHook(hook, { wrapper })
  const pending = deferred<WorkoutSession>(); api.save.mockReturnValue(pending.promise)
  act(() => result.current.submit())
  await waitFor(() => expect(api.save).toHaveBeenCalledOnce())
  act(() => result.current.selectMovement('row'))
  await act(async () => pending.reject(new Error('Disconnected')))
  await waitFor(() => expect(client.getQueryData<WorkoutSession>(key)?.movements[0].sets[0].syncState).toBe('syncFailed'))
  expect(client.getQueryData<WorkoutSession>(key)?.movements[1].sets[0].completed).toBe(false)
  expect(result.current.input).toMatchObject({ load: '80', reps: '5', rir: null })
  expect(api.save.mock.calls[0][1].exerciseLogId).toBe('bench')
  expect(result.current.error).toBeNull()
})
