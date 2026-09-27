import type { PropsWithChildren, ReactNode } from 'react'
import { Alert } from 'react-native'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FavoriteWorkout, TodayPayload, WorkoutSession } from '@sheetless/domain/session/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { themeProviderMock } from './support/theme'
import { FavoriteWorkoutsSection } from '../src/features/templates/favorites/FavoriteWorkoutsSection'
import { useFavoriteWorkoutEntry } from '../src/features/templates/favorites/useFavoriteWorkoutEntry'

const api = vi.hoisted(() => ({ read: vi.fn(), favorites: vi.fn(), start: vi.fn(), push: vi.fn() }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('expo-router', () => ({ router: { push: api.push } }))
vi.mock('@sheetless/data/session/reads', () => ({ getToday: api.read, getSession: vi.fn() }))
vi.mock('@sheetless/data/session/favorites', () => ({ listFavoriteWorkouts: api.favorites }))
vi.mock('@sheetless/data/session/lifecycle', () => ({ startAdHocSession: api.start }))
vi.mock('@/components', () => {
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Caption: Block, Panel: Block, SectionLabel: Block,
    Button: ({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) =>
      <button disabled={loading} onClick={onPress}>{label}</button> }
})
vi.mock('@/features/templates/favorites/FavoriteWorkoutCard', () => ({
  FavoriteWorkoutCard: ({ activeSessionCheckPending }: { activeSessionCheckPending: boolean }) =>
    <button disabled={activeSessionCheckPending}>Start favourite</button>,
}))

const userA = { id: 'favourite-account-a' } as User
const userB = { id: 'favourite-account-b' } as User
const workout = { id: 'ad-hoc', sessionId: 'active-a', status: 'in_progress', stateVersion: 1,
  isAdHoc: true, title: 'Repeated workout', units: 'kg', movements: [] } as unknown as WorkoutSession
const favorite: FavoriteWorkout = { sessionId: 'saved', title: 'My favourite', movementNames: ['Squat'],
  movementCount: 1, setCount: 3, scheduledDate: null, completedAt: null }
function today(activeSession: WorkoutSession | null = null): TodayPayload {
  return { activeProgram: null, plannedSession: null, activeSession, completedSession: null, pendingDecisions: [] }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}
beforeEach(() => vi.resetAllMocks())

describe('independent favourite read recovery', () => {
  it('retries favourites without treating a failed Today read as an empty active workout', async () => {
    const { wrapper } = harness()
    api.favorites.mockRejectedValueOnce(new Error('Catalogue favourite read failed')).mockResolvedValue([favorite])
    api.read.mockRejectedValueOnce(new Error('Today read failed')).mockResolvedValueOnce(today())
    render(<FavoriteWorkoutsSection user={userA} />, { wrapper })
    fireEvent.click(await screen.findByRole('button', { name: 'Retry favourites' }))
    const retry = await screen.findByRole('button', { name: 'Retry workout check' })
    expect((screen.getByRole('button', { name: 'Start favourite' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(retry)
    await waitFor(() => expect((screen.getByRole('button', { name: 'Start favourite' }) as HTMLButtonElement).disabled).toBe(false))
    expect(api.favorites).toHaveBeenCalledTimes(2)
  })

  it('blocks start during a background refresh even with cached absence of an active workout', async () => {
    const { client, wrapper } = harness()
    const pending = deferred<TodayPayload>()
    client.setQueryData(accountQueryKeys.today(userA.id), today())
    api.favorites.mockResolvedValue([favorite])
    api.read.mockReturnValue(pending.promise)
    render(<FavoriteWorkoutsSection user={userA} />, { wrapper })
    await screen.findByText('Checking your current workout…')
    expect((screen.getByRole('button', { name: 'Start favourite' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => pending.resolve(today()))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Start favourite' }) as HTMLButtonElement).disabled).toBe(false))
  })
})

describe('favourite entry preflight', () => {
  it('checks fresh Today and redirects to the actual active workout instead of repeating', async () => {
    const { client, wrapper } = harness()
    client.setQueryData(accountQueryKeys.today(userA.id), today())
    api.read.mockResolvedValue(today(workout))
    const alert = vi.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { result } = renderHook(() => useFavoriteWorkoutEntry(userA, favorite.sessionId), { wrapper })
    await act(async () => result.current.startWorkout())
    expect(api.read).toHaveBeenCalledOnce()
    expect(api.start).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalledOnce()
    act(() => alert.mock.calls[0][2]?.[1].onPress?.())
    expect(api.push).toHaveBeenCalledExactlyOnceWith({ pathname: '/session/[sessionId]', params: { sessionId: 'active-a' } })
  })

  it('shows read failure and retries before sending the repeat mutation', async () => {
    const { wrapper } = harness()
    api.read.mockRejectedValueOnce(new Error('Unable to check')).mockResolvedValueOnce(today())
    api.start.mockResolvedValue(workout)
    const { result } = renderHook(() => useFavoriteWorkoutEntry(userA, favorite.sessionId), { wrapper })
    await act(async () => result.current.startWorkout())
    expect(result.current.error).toBe('Unable to check')
    expect(api.start).not.toHaveBeenCalled()
    await act(async () => result.current.startWorkout())
    await waitFor(() => expect(api.push).toHaveBeenCalledOnce())
    expect(api.start.mock.calls[0][1].sourceSessionId).toBe(favorite.sessionId)
  })

  it('ignores preflight results after switching accounts and guards deferred alert navigation', async () => {
    const { wrapper } = harness()
    const pending = deferred<TodayPayload>()
    api.read.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(today(workout))
    const alert = vi.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { result, rerender } = renderHook(({ user }) => useFavoriteWorkoutEntry(user, favorite.sessionId), {
      wrapper, initialProps: { user: userA },
    })
    let check!: Promise<void>
    act(() => { check = result.current.startWorkout() })
    rerender({ user: userB })
    await act(async () => { pending.resolve(today()); await check })
    expect(api.start).not.toHaveBeenCalled()
    await act(async () => result.current.startWorkout())
    expect(alert).toHaveBeenCalledOnce()
    rerender({ user: userA })
    act(() => alert.mock.calls[0][2]?.[1].onPress?.())
    expect(api.push).not.toHaveBeenCalled()
  })

  it('settles a lost-response start when resuming so a later repeat gets a new token', async () => {
    const { wrapper } = harness()
    api.read.mockResolvedValueOnce(today()).mockResolvedValueOnce(today(workout)).mockResolvedValueOnce(today())
    api.start.mockRejectedValueOnce(new Error('Response lost after commit')).mockResolvedValueOnce({ ...workout, sessionId: 'next-workout' })
    const alert = vi.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { result } = renderHook(() => useFavoriteWorkoutEntry(userA, favorite.sessionId), { wrapper })
    await act(async () => result.current.startWorkout())
    await waitFor(() => expect(result.current.error).toBe('Response lost after commit'))
    await act(async () => result.current.startWorkout())
    act(() => alert.mock.calls[0][2]?.[1].onPress?.())
    expect(api.push).toHaveBeenCalledExactlyOnceWith({ pathname: '/session/[sessionId]', params: { sessionId: 'active-a' } })
    await act(async () => result.current.startWorkout())
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2))
    expect(api.start.mock.calls[1][1].clientMutationId).not.toBe(api.start.mock.calls[0][1].clientMutationId)
    await waitFor(() => expect(api.push).toHaveBeenLastCalledWith({ pathname: '/session/[sessionId]', params: { sessionId: 'next-workout' } }))
  })
})
