import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import type { WorkoutSession } from '~/domains/session'
import { SessionPage } from '~/domains/session/components/SessionPage'
import { accountQueryKeys } from '~/shared/lib/query-keys'

const boundary = vi.hoisted(() => ({ read: vi.fn(), logger: vi.fn(), navigate: vi.fn() }))
vi.mock('~/domains/session/server/session-functions', () => ({
  getSessionFn: boundary.read, getTodayFn: vi.fn(), listMovementSwapOptionsFn: vi.fn(),
}))
vi.mock('~/domains/movement/server/movement-functions', () => ({
  listAccessoryMovementOptionsFn: vi.fn(), listMovementOptionsFn: vi.fn(),
}))
vi.mock('~/domains/session/server/favorite-functions', () => ({ listFavoriteWorkoutsFn: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => ({}), Link: 'a',
  Navigate: (props: unknown) => { boundary.navigate(props); return <div>Opening summary</div> },
}))
vi.mock('@mantine/core', () => ({ Button: ({ children }: { children: ReactNode }) => <button>{children}</button> }))
vi.mock('~/components', () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  PageSkeleton: () => <div>Checking workout</div>,
  EmptyState: ({ title, children }: { title: string; children: ReactNode }) => <div>{title}{children}</div>,
}))
vi.mock('~/domains/session/components/SessionLoadError', () => ({
  SessionLoadError: ({ onRetry }: { onRetry: () => void }) => <button onClick={onRetry}>Retry workout</button>,
}))
vi.mock('~/domains/session/lib/useFinishSession', () => ({ useFinishSession: () => ({ isPending: false }) }))
vi.mock('~/domains/onboarding/useOnboardingTour', () => ({ useOnboardingTour: () => ({ start: vi.fn() }) }))
vi.mock('~/domains/session/components/LiveFocusView', () => ({
  LiveFocusView: () => { boundary.logger(); return <input aria-label="Unsaved draft" defaultValue="40" /> },
}))
vi.mock('~/domains/session/components/LiveSession', () => ({ LiveSessionFrame: () => null }))
vi.mock('~/domains/session/components/FinishSessionModal', () => ({ FinishSessionModal: () => null }))
vi.mock('~/domains/session/components/DiscardWorkoutDialog', () => ({ DiscardWorkoutDialog: () => null }))
vi.mock('~/domains/session/components/RestTimerProvider', () => ({
  RestTimerProvider: ({ children }: { children: ReactNode }) => children,
}))

const user = { id: 'entry-account' } as AuthUser
const sessionId = 'entry-session'
const sessionKey = accountQueryKeys.session(user.id, sessionId)
const active: WorkoutSession = {
  id: 'planned-1', sessionId, stateVersion: 1, status: 'in_progress',
  title: 'Workout', programTitle: 'Programme', templateId: 'template-1',
  weekIndex: 0, weekLabel: 'Week 1', hardness: 'Medium', scheduledDate: '2026-09-13',
  estimatedMinutes: 30, units: 'kg', rounding: 2.5,
  movements: [{
    id: 'exercise-1', movementId: 'squat', movementName: 'Squat', role: 'main',
    orderIndex: 0, targetSummary: 'One set', sets: [{ id: 'set-1', setIndex: 1, completed: false }],
  }],
}
function deferred() {
  let resolve!: (value: WorkoutSession) => void
  let reject!: (error: Error) => void
  const promise = new Promise<WorkoutSession>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
let client: QueryClient
let root: Root
let host: HTMLDivElement
async function settle(action: () => void | Promise<unknown>) {
  await act(async () => { await action() })
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
}
async function render(id = sessionId) {
  await settle(() => root.render(
    <QueryClientProvider client={client}><SessionPage sessionId={id} user={user} /></QueryClientProvider>,
  ))
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.unstubAllGlobals()
})

describe('web workout route entry', () => {
  it('rechecks even fresh cached active data and replaces a completed live URL without mounting loggers', async () => {
    client.setQueryData(sessionKey, active)
    const read = deferred()
    boundary.read.mockReturnValue(read.promise)
    await render()
    expect(host.textContent).toContain('Checking workout')
    expect(boundary.read).toHaveBeenCalledExactlyOnceWith({ data: { sessionId } })
    expect(boundary.logger).not.toHaveBeenCalled()
    await settle(() => { client.setQueryData(sessionKey, { ...active, notes: 'Cached edit' }) })
    expect(host.textContent).toContain('Checking workout')
    expect(boundary.logger).not.toHaveBeenCalled()

    await settle(() => read.resolve({ ...active, status: 'completed' }))
    expect(boundary.logger).not.toHaveBeenCalled()
    expect(boundary.navigate).toHaveBeenCalledWith({
      to: '/sessions/$sessionId/summary', params: { sessionId }, replace: true,
    })
  })

  it.each(['planned', 'skipped'] as const)('keeps a %s workout terminal without logging controls', async (status) => {
    boundary.read.mockResolvedValue({ ...active, status })
    await render()
    expect(host.textContent).toContain('Workout is not active')
    expect(boundary.logger).not.toHaveBeenCalled()
    expect(boundary.navigate).not.toHaveBeenCalled()
  })

  it('offers Retry after a failed entry read instead of trusting cached active data', async () => {
    client.setQueryData(sessionKey, active)
    boundary.read.mockRejectedValueOnce(new Error('Network failed')).mockResolvedValue(active)
    await render()
    expect(host.textContent).toContain('Retry workout')
    expect(boundary.logger).not.toHaveBeenCalled()
    await settle(() => host.querySelector('button')!.click())
    expect(host.querySelector('input')).not.toBeNull()
    expect(boundary.read).toHaveBeenCalledTimes(2)
  })

  it('does not treat a cancelled entry read and optimistic cache write as verification', async () => {
    client.setQueryData(sessionKey, active)
    boundary.read.mockReturnValue(deferred().promise)
    await render()
    await settle(async () => {
      await client.cancelQueries({ queryKey: sessionKey })
      client.setQueryData(sessionKey, { ...active, notes: 'Optimistic cached edit' })
    })
    expect(boundary.logger).not.toHaveBeenCalled()
    expect(host.textContent).toContain('Retry workout')
  })

  it('preserves the mounted draft during a background refetch and its failure', async () => {
    boundary.read.mockResolvedValueOnce(active)
    await render()
    const input = host.querySelector('input')!
    input.value = '82.5'
    const background = deferred()
    boundary.read.mockReturnValue(background.promise)
    let refetch!: Promise<unknown>
    await settle(() => { refetch = client.refetchQueries({ queryKey: sessionKey }) })
    expect(host.querySelector('input')).toBe(input)
    expect(input.value).toBe('82.5')
    await settle(async () => { background.reject(new Error('Offline')); await refetch })
    expect(host.querySelector('input')).toBe(input)
    expect(input.value).toBe('82.5')
    expect(host.textContent).not.toContain('Retry workout')
  })

  it('verifies a new session identity before mounting its cached logger', async () => {
    boundary.read.mockResolvedValueOnce(active)
    await render()
    client.setQueryData(accountQueryKeys.session(user.id, 'another-session'), { ...active, sessionId: 'another-session' })
    const read = deferred()
    boundary.read.mockReturnValue(read.promise)
    boundary.logger.mockClear()
    await render('another-session')
    expect(host.textContent).toContain('Checking workout')
    expect(boundary.logger).not.toHaveBeenCalled()
    await settle(() => read.resolve({ ...active, sessionId: 'another-session', status: 'completed' }))
    expect(boundary.logger).not.toHaveBeenCalled()
    expect(boundary.navigate).toHaveBeenCalledWith({
      to: '/sessions/$sessionId/summary', params: { sessionId: 'another-session' }, replace: true,
    })
  })
})
