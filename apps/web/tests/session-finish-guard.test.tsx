import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionSummary, WorkoutSession } from '~/domains/session'
import { patchSetInSession } from '~/domains/session/lib/session-cache'
import { useFinishSession } from '~/domains/session/lib/useFinishSession'
import { accountQueryKeys } from '~/shared/lib/query-keys'

const boundary = vi.hoisted(() => ({ finish: vi.fn(), today: vi.fn(), navigate: vi.fn(), notify: vi.fn() }))
vi.mock('~/domains/session/server/session-functions', () => ({
  finishSessionFn: boundary.finish, getTodayFn: boundary.today,
  getSessionFn: vi.fn(), listMovementSwapOptionsFn: vi.fn(),
}))
vi.mock('~/domains/movement/server/movement-functions', () => ({
  listAccessoryMovementOptionsFn: vi.fn(), listMovementOptionsFn: vi.fn(),
}))
vi.mock('~/domains/session/server/favorite-functions', () => ({ listFavoriteWorkoutsFn: vi.fn() }))
vi.mock('~/domains/account/components/AccountIdentityProvider', () => ({ useRequiredAccountId: () => 'account-a' }))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ options: { context: { queryClient: client } }, navigate: boundary.navigate }),
}))
vi.mock('@mantine/notifications', () => ({ notifications: { show: boundary.notify } }))

const userId = 'account-a'
const sessionKey = accountQueryKeys.session(userId, 'session-1')
const reflection = { sessionRpe: 7, reflectionWin: 'Good form', reflectionImprove: null }
const notes = '  Kept notes  '
const renderedSession: WorkoutSession = {
  id: 'planned-1', sessionId: 'session-1', stateVersion: 1, status: 'in_progress',
  title: 'Workout', programTitle: 'Programme', templateId: 'template-1',
  weekIndex: 0, weekLabel: 'Week 1', hardness: 'Medium', scheduledDate: '2026-09-13',
  estimatedMinutes: 30, units: 'kg', rounding: 2.5,
  movements: [{
    id: 'exercise-1', movementId: 'squat', movementName: 'Squat', role: 'main',
    orderIndex: 0, targetSummary: 'One set',
    sets: [{ id: 'set-1', setIndex: 1, completed: false, syncState: 'synced' }],
  }],
}
const summary: SessionSummary = {
  session: { ...renderedSession, status: 'completed' }, completedSets: 0, totalSets: 1,
  topSets: [], accessoryOutcomes: [], decisions: [],
}

let client: QueryClient
let root: Root
let host: HTMLDivElement
let finish: ReturnType<typeof useFinishSession>
function Harness() {
  // Deliberately keep a clean rendered prop while the cache changes independently.
  const mutation = useFinishSession(renderedSession, notes)
  useEffect(() => { finish = mutation }, [mutation])
  return null
}
async function settle(action: () => void | Promise<unknown>) {
  await act(async () => {
    await action()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
function finishInput() {
  return { reflection, requestId: finish.requestIdFor({ notes: notes.trim() || null, ...reflection }) }
}

beforeEach(async () => {
  vi.resetAllMocks()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  client.setQueryData(sessionKey, renderedSession)
  boundary.finish.mockResolvedValue(summary)
  boundary.today.mockResolvedValue({ activeSession: null })
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

describe('web finish invocation guard', () => {
  it.each(['saving', 'syncFailed'] as const)('blocks the latest cached %s set and allows finish after recovery', async (syncState) => {
    client.setQueryData(sessionKey, patchSetInSession(renderedSession, {
      movementSlotId: 'exercise-1', setIndex: 1, actualLoad: 82.5, completed: true, syncState,
    }))
    const input = finishInput()
    await settle(async () => {
      await expect(finish.mutateAsync(input)).rejects.toThrow('Save or retry all sets before finishing.')
    })
    expect(boundary.finish).not.toHaveBeenCalled()
    expect(boundary.navigate).not.toHaveBeenCalled()
    expect(finish.errorMessage).toBe('Save or retry all sets before finishing.')

    client.setQueryData(sessionKey, renderedSession)
    expect(finishInput()).toEqual(input)
    await settle(() => finish.mutateAsync(finishInput()))
    expect(boundary.finish).toHaveBeenCalledExactlyOnceWith({
      data: { sessionId: renderedSession.sessionId, requestId: input.requestId, notes, ...reflection },
    })
    expect(finish.errorMessage).toBeNull()
    expect(client.getQueryData(accountQueryKeys.summary(userId, renderedSession.sessionId))).toEqual(summary)
    expect(client.getQueryData(sessionKey)).toEqual(summary.session)
    expect(boundary.navigate).toHaveBeenCalledExactlyOnceWith({
      to: '/sessions/$sessionId/summary', params: { sessionId: renderedSession.sessionId },
    })
  })

  it('still navigates to the saved summary if refreshing Today fails', async () => {
    boundary.today.mockRejectedValue(new Error('Offline'))
    await settle(() => finish.mutateAsync(finishInput()))
    expect(finish.isSuccess).toBe(true)
    expect(boundary.navigate).toHaveBeenCalledExactlyOnceWith({
      to: '/sessions/$sessionId/summary', params: { sessionId: renderedSession.sessionId },
    })
    expect(boundary.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Session finished' }))
  })
})
