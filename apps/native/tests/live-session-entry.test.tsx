import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({
  read: vi.fn(), replace: vi.fn(), keepAwake: vi.fn(), timer: vi.fn(), logger: vi.fn(),
  focused: true, user: { id: 'account-a' } as User | null,
}))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: api.user }) }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('expo-router', () => ({ router: { replace: api.replace }, useIsFocused: () => api.focused }))
vi.mock('expo-keep-awake', () => ({ useKeepAwake: api.keepAwake }))
vi.mock('@sheetless/data/session/reads', () => ({ getSession: api.read, getToday: vi.fn() }))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Button, Screen: Block, Panel: Block, Text: Block, PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }
})
vi.mock('@/features/session/live/FocusWorkoutView', () => ({
  FocusWorkoutView: ({ session }: { session: WorkoutSession }) => {
    api.logger(session.status)
    return <div>Live logger</div>
  },
}))
vi.mock('@/features/session/rest-timer/RestTimerProvider', () => ({
  RestTimerProvider: ({ children }: { children: ReactNode }) => {
    api.timer()
    return <div data-testid="rest-timer">{children}</div>
  },
}))

import { LiveSessionScreen } from '../src/features/session/LiveSessionScreen'

const active: WorkoutSession = {
  id: 'planned-a', sessionId: 'session-a', stateVersion: 4, status: 'in_progress',
  title: 'Workout', programTitle: '', templateId: '', weekIndex: 0, weekLabel: '',
  hardness: null, scheduledDate: '2026-09-13', estimatedMinutes: 30,
  units: 'kg', rounding: 2.5, movements: [],
}
const sessionKey = accountQueryKeys.session('account-a', active.sessionId)
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  api.focused = true
  api.user = { id: 'account-a' } as User
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
})
afterEach(() => client.clear())

function mount() {
  return render(<QueryClientProvider client={client}><LiveSessionScreen sessionId={active.sessionId} /></QueryClientProvider>)
}

function deferred() {
  let resolve!: (value: WorkoutSession) => void
  let reject!: (error: Error) => void
  const promise = new Promise<WorkoutSession>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function expectNoLiveSideEffects() {
  expect(api.logger).not.toHaveBeenCalled()
  expect(api.timer).not.toHaveBeenCalled()
  expect(api.keepAwake).not.toHaveBeenCalled()
}

describe('native live workout entry', () => {
  it('rechecks even fresh active cache and replaces a completed deep link without mounting live tools', async () => {
    client.setQueryData(sessionKey, active)
    const request = deferred()
    api.read.mockReturnValueOnce(request.promise)
    mount()
    expect(screen.getByText('Loading your workout…')).toBeTruthy()
    expectNoLiveSideEffects()
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(1))
    await act(async () => request.resolve({ ...active, stateVersion: 5, status: 'completed' }))
    await waitFor(() => expect(api.replace).toHaveBeenCalledExactlyOnceWith({
      pathname: '/session/[sessionId]/summary', params: { sessionId: active.sessionId },
    }))
    expectNoLiveSideEffects()
  })

  it.each([
    { status: 'planned', message: 'This workout has not started.' },
    { status: 'skipped', message: 'This workout was skipped.' },
  ] as const)('keeps $status workouts outside the live logger and offers Today', async ({ status, message }) => {
    api.read.mockResolvedValue({ ...active, status })
    mount()
    await screen.findByText(message)
    expectNoLiveSideEffects()
    expect(api.replace).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Today' }))
    expect(api.replace).toHaveBeenCalledWith('/(tabs)')
  })

  it('retains an entry error over stale active cache until an explicit retry confirms activity', async () => {
    client.setQueryData(sessionKey, active)
    api.read.mockRejectedValueOnce(new Error('Connection failed'))
    const retry = deferred()
    api.read.mockReturnValueOnce(retry.promise)
    mount()
    await screen.findByText('Connection failed')
    expectNoLiveSideEffects()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })))
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2))
    expectNoLiveSideEffects()
    await act(async () => retry.resolve(active))
    await screen.findByText('Live logger')
    expect(api.logger).toHaveBeenCalledWith('in_progress')
    expect(api.keepAwake).toHaveBeenCalled()
    expect(api.timer).toHaveBeenCalled()
    expect(api.replace).not.toHaveBeenCalled()
  })

  it('unmounts live tools when status changes to completed while the route is open', async () => {
    api.read.mockResolvedValue(active)
    mount()
    await screen.findByText('Live logger')
    await act(async () => { client.setQueryData(sessionKey, { ...active, status: 'completed' }) })
    await waitFor(() => expect(screen.queryByTestId('rest-timer')).toBeNull())
    expect(api.logger.mock.calls.every(([status]) => status === 'in_progress')).toBe(true)
    expect(api.replace).toHaveBeenCalledWith({ pathname: '/session/[sessionId]/summary', params: { sessionId: active.sessionId } })
  })

  it('checks status again when a retained route regains focus', async () => {
    api.read.mockResolvedValueOnce(active)
    const view = mount()
    await screen.findByText('Live logger')
    api.focused = false
    view.rerender(<QueryClientProvider client={client}><LiveSessionScreen sessionId={active.sessionId} /></QueryClientProvider>)
    expect(screen.queryByTestId('rest-timer')).toBeNull()
    api.logger.mockClear()
    api.timer.mockClear()
    api.keepAwake.mockClear()
    const request = deferred()
    api.read.mockReturnValueOnce(request.promise)
    api.focused = true
    view.rerender(<QueryClientProvider client={client}><LiveSessionScreen sessionId={active.sessionId} /></QueryClientProvider>)
    expect(screen.getByText('Loading your workout…')).toBeTruthy()
    expectNoLiveSideEffects()
    await act(async () => request.resolve({ ...active, status: 'skipped' }))
    await screen.findByText('This workout was skipped.')
    expect(api.read).toHaveBeenCalledTimes(2)
    expectNoLiveSideEffects()
  })

  it('does not query or mount workout tools without an account', () => {
    api.user = null
    mount()
    expect(screen.getByText('Sign in to view your workout.')).toBeTruthy()
    expect(api.read).not.toHaveBeenCalled()
    expectNoLiveSideEffects()
  })

  it('does not treat optimistic cache writes as a completed entry read', async () => {
    client.setQueryData(sessionKey, active)
    const request = deferred()
    api.read.mockReturnValueOnce(request.promise)
    mount()
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(1))
    await act(async () => { client.setQueryData(sessionKey, { ...active, stateVersion: 5 }) })
    expect(screen.getByText('Loading your workout…')).toBeTruthy()
    expectNoLiveSideEffects()
    await act(async () => request.resolve({ ...active, stateVersion: 6, status: 'completed' }))
    await waitFor(() => expect(api.replace).toHaveBeenCalled())
    expectNoLiveSideEffects()
  })

  it('keeps a cancelled entry read closed even when cached active data remains', async () => {
    client.setQueryData(sessionKey, active)
    api.read.mockReturnValueOnce(deferred().promise)
    mount()
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(1))
    await act(async () => { await client.cancelQueries({ queryKey: sessionKey }) })
    await screen.findByRole('button', { name: 'Retry' })
    expectNoLiveSideEffects()
  })
})
