import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TodayPayload, WorkoutSession } from '~/domains/session'
import type { SetPatch } from '~/domains/session/lib/session-cache'
import { sessionQueryOptions } from '~/domains/session/queries'
import { updateSessionManagementCaches } from '~/domains/session/lib/session-management-cache'
import { useSetLogMutation } from '~/domains/session/lib/useSetLogMutation'
import { accountQueryKeys } from '~/shared/lib/query-keys'

const boundary = vi.hoisted(() => ({ save: vi.fn(), read: vi.fn(), prime: vi.fn(), start: vi.fn() }))
vi.mock('~/domains/session/server/session-functions', () => ({
  upsertSetLogFn: boundary.save, getSessionFn: boundary.read,
  getTodayFn: vi.fn(), listMovementSwapOptionsFn: vi.fn(),
}))
vi.mock('~/domains/movement/server/movement-functions', () => ({
  listAccessoryMovementOptionsFn: vi.fn(), listMovementOptionsFn: vi.fn(),
}))
vi.mock('~/domains/session/server/favorite-functions', () => ({ listFavoriteWorkoutsFn: vi.fn() }))
vi.mock('~/domains/account/components/AccountIdentityProvider', () => ({ useRequiredAccountId: () => 'account-a' }))
vi.mock('~/domains/session/lib/rest-timer-context', () => ({
  useRestTimerControls: () => ({ prime: boundary.prime, startForSlot: boundary.start }),
}))
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }))

const userId = 'account-a'
const sessionKey = accountQueryKeys.session(userId, 'session-1')
const todayKey = accountQueryKeys.today(userId)
const editA: SetPatch = {
  setIndex: 1, actualLoad: 123.5, actualReps: 5, actualRir: 1.5,
  completed: true, note: 'Keep these exact values', clientMutationId: 'attempt-a',
}
const editB: SetPatch = {
  setIndex: 2, actualLoad: 65, actualReps: 8, actualRir: 2,
  completed: true, note: 'Second set', clientMutationId: 'attempt-b',
}
function serverSession(...saved: SetPatch[]): WorkoutSession {
  return {
    id: 'planned-1', sessionId: 'session-1', stateVersion: saved.length + 1,
    status: 'in_progress', title: 'Workout', programTitle: 'Programme', templateId: 'template-1',
    weekIndex: 0, weekLabel: 'Week 1', hardness: 'Medium', scheduledDate: '2026-09-13',
    estimatedMinutes: 30, units: 'kg', rounding: 2.5,
    movements: [{
      id: 'exercise-1', movementId: 'squat', movementName: 'Squat', role: 'main',
      orderIndex: 0, targetSummary: 'Two sets',
      sets: [1, 2].map((setIndex) => ({
        id: `set-${setIndex}`, setIndex, targetLoad: 60, targetReps: 5,
        completed: false, ...saved.find((patch) => patch.setIndex === setIndex), syncState: 'synced',
      })),
    }],
  }
}
function today(activeSession: WorkoutSession): TodayPayload {
  return { activeProgram: null, plannedSession: null, activeSession, completedSession: null, pendingDecisions: [] }
}
function deferred() {
  let resolve!: (session: WorkoutSession) => void
  let reject!: (error: Error) => void
  const promise = new Promise<WorkoutSession>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

let client: QueryClient
let root: Root
let host: HTMLDivElement
let mutations: [ReturnType<typeof useSetLogMutation>, ReturnType<typeof useSetLogMutation>]
function Harness() {
  const { data } = useQuery(sessionQueryOptions(userId, 'session-1'))
  const session = data!
  const first = useSetLogMutation(session, session.movements[0], 1)
  const second = useSetLogMutation(session, session.movements[0], 2)
  useEffect(() => { mutations = [first, second] }, [first, second])
  return null
}
async function settle(action: () => void | Promise<unknown>) {
  await act(async () => {
    await action()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
function current() { return client.getQueryData<WorkoutSession>(sessionKey)! }
function set(index: number) { return current().movements[0].sets[index - 1] }
function expectTodayMirror() {
  expect(client.getQueryData<TodayPayload>(todayKey)?.activeSession).toEqual(current())
}

beforeEach(async () => {
  vi.resetAllMocks()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  client.setQueryData(sessionKey, serverSession())
  client.setQueryData(todayKey, today(serverSession()))
  boundary.read.mockResolvedValue(serverSession())
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await settle(() => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>))
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.unstubAllGlobals()
})

describe('web session save recovery', () => {
  it('retains failed A through B, refetch and unrelated management changes until A has an exact receipt', async () => {
    const otherKey = accountQueryKeys.session('account-b', 'session-1')
    const otherTodayKey = accountQueryKeys.today('account-b')
    const otherSession = { ...serverSession(), title: 'Other account workout' }
    client.setQueryData(otherKey, otherSession)
    client.setQueryData(otherTodayKey, today(otherSession))
    boundary.save.mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValueOnce(serverSession(editB))

    await settle(() => mutations[0].mutateAsync(editA).catch(() => undefined))
    expect(set(1)).toMatchObject({ ...editA, syncState: 'syncFailed' })
    await settle(() => mutations[1].mutateAsync(editB))
    expect(set(1)).toMatchObject({ ...editA, syncState: 'syncFailed' })
    expect(set(2)).toMatchObject({ ...editB, syncState: 'synced' })
    expectTodayMirror()

    boundary.read.mockResolvedValue({ ...serverSession(editB), stateVersion: 3 })
    await settle(() => client.fetchQuery({ ...sessionQueryOptions(userId, 'session-1'), staleTime: 0 }))
    expect(current().stateVersion).toBe(3)
    expect(set(1)).toMatchObject({ ...editA, syncState: 'syncFailed' })
    const extra = { ...serverSession().movements[0], id: 'accessory-1', movementName: 'Row', sets: [] }
    for (const [index, movements] of [[extra], [{ ...extra, movementName: 'Cable row' }], []].entries()) {
      await settle(() => updateSessionManagementCaches(client, userId, {
        ...serverSession(editB), stateVersion: 4 + index,
        movements: [...serverSession(editB).movements, ...movements],
      }))
      expect(current().movements.slice(1)).toEqual(movements)
      expect(set(1)).toMatchObject({ ...editA, syncState: 'syncFailed' })
      expect(set(2)).toMatchObject({ ...editB, syncState: 'synced' })
      expectTodayMirror()
    }

    const receipt = { ...serverSession(editA, editB), stateVersion: 7 }
    boundary.read.mockResolvedValue(receipt)
    await settle(() => client.fetchQuery({ ...sessionQueryOptions(userId, 'session-1'), staleTime: 0 }))
    expect(set(1)).toMatchObject({ ...editA, syncState: 'synced' })
    await settle(() => updateSessionManagementCaches(client, userId, receipt))
    expectTodayMirror()
    expect(client.getQueryData(otherKey)).toEqual(otherSession)
    expect(client.getQueryData(otherTodayKey)).toEqual(today(otherSession))
  })

  it.each(['fails', 'succeeds'] as const)('keeps queued B in the current cache when pending A %s', async (outcome) => {
    const first = deferred()
    const second = deferred()
    boundary.save.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    let firstResult!: Promise<unknown>
    let secondResult!: Promise<unknown>
    await settle(() => { firstResult = mutations[0].mutateAsync(editA).catch(() => undefined) })
    await settle(() => { secondResult = mutations[1].mutateAsync(editB) })
    expect(boundary.save).toHaveBeenCalledTimes(1)
    expect(set(1)).toMatchObject({ ...editA, syncState: 'saving' })
    expect(set(2)).toMatchObject({ ...editB, syncState: 'saving' })

    await settle(async () => {
      if (outcome === 'fails') first.reject(new Error('First request failed'))
      else first.resolve(serverSession(editA))
      await firstResult
    })
    expect(boundary.save).toHaveBeenCalledTimes(2)
    expect(boundary.save.mock.calls[1][0].data).toMatchObject(editB)
    expect(set(1)).toMatchObject({ ...editA, syncState: outcome === 'fails' ? 'syncFailed' : 'synced' })
    expect(set(2)).toMatchObject({ ...editB, syncState: 'saving' })

    await settle(async () => {
      second.resolve(outcome === 'fails' ? serverSession(editB) : serverSession(editA, editB))
      await secondResult
    })
    expect(set(1)).toMatchObject({ ...editA, syncState: outcome === 'fails' ? 'syncFailed' : 'synced' })
    expect(set(2)).toMatchObject({ ...editB, syncState: 'synced' })
    expectTodayMirror()
  })

  it('does not replace a different Today active session when an old save or management result arrives', async () => {
    const pending = deferred()
    boundary.save.mockReturnValueOnce(pending.promise)
    let result!: Promise<unknown>
    await settle(() => { result = mutations[0].mutateAsync(editA) })
    const different = { ...serverSession(), sessionId: 'session-new', title: 'Current workout' }
    client.setQueryData(todayKey, today(different))
    await settle(async () => { pending.resolve(serverSession(editA)); await result })
    expect(set(1)).toMatchObject({ ...editA, syncState: 'synced' })
    expect(client.getQueryData(todayKey)).toEqual(today(different))
    await settle(() => updateSessionManagementCaches(client, userId, serverSession(editA, editB)))
    expect(client.getQueryData(todayKey)).toEqual(today(different))
  })
})
