import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ dismiss: vi.fn(), signals: vi.fn(), navigate: vi.fn(), userId: 'account-a', focused: true }))
vi.mock('@sheetless/data/account/profile', () => ({ dismissFullModeHint: api.dismiss }))
vi.mock('@sheetless/data/account/experience', () => ({ getExperienceSignals: api.signals }))
vi.mock('expo-router', () => ({ router: { navigate: api.navigate } }))
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => api.focused }))
vi.mock('@/lib/account', async () => {
  const { useQuery } = await import('@tanstack/react-query')
  const { accountQueryKeys: keys } = await import('@sheetless/domain/shared/query-keys')
  return { buildUserContext: (user: User) => ({ user, supabase: {} }),
    useMe: () => useQuery<UserProfile>({ queryKey: keys.profile(api.userId),
      queryFn: () => Promise.reject(new Error('Unexpected profile read')), staleTime: Infinity }) }
})
import { useAdvancedInvitation } from '../src/features/settings/preferences/useAdvancedInvitation'

const user = { id: 'account-a' } as User
const profile: UserProfile = {
  id: user.id, email: 'invite@example.test', units: 'kg', rounding: 2.5,
  equipmentProfile: [], themePreference: 'system', timezone: null,
  programStateDefaults: {}, onboardingCompleted: true, liveOnboardingDismissed: false,
  postWorkoutFeedbackDismissed: false, autoStartTimer: true, defaultRestSeconds: 120,
  experienceMode: 'guided', showFormulas: false, fullModeHintDismissedAt: null,
}
const saved = { ...profile, fullModeHintDismissedAt: '2026-09-28T12:00:00.000Z' }
let client: QueryClient
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
beforeEach(() => {
  vi.resetAllMocks()
  api.userId = user.id
  api.focused = true
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  client.setQueryData(accountQueryKeys.profile(user.id), profile)
  client.setQueryData(accountQueryKeys.experienceSignals(user.id), { completedSessions: 8 })
  api.dismiss.mockResolvedValue(saved)
})

describe('native optional Advanced invitation', () => {
  it.each([
    [7, 'guided', null, false],
    [8, 'guided', null, true],
    [12, 'full', null, false],
    [12, 'guided', saved.fullModeHintDismissedAt, false],
  ] as const)('uses completed count %s, mode %s and dismissal %s', (count, mode, stamp, visible) => {
    client.setQueryData(accountQueryKeys.profile(user.id), { ...profile, experienceMode: mode, fullModeHintDismissedAt: stamp })
    client.setQueryData(accountQueryKeys.experienceSignals(user.id), { completedSessions: count })
    const { result } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    expect(result.current.visible).toBe(visible)
    expect(api.dismiss).not.toHaveBeenCalled()
  })

  it('hides a failed count without blocking the rest of Today', async () => {
    client.removeQueries({ queryKey: accountQueryKeys.experienceSignals(user.id) })
    api.signals.mockRejectedValue(new Error('Offline'))
    const { result } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    await waitFor(() => expect(client.getQueryState(accountQueryKeys.experienceSignals(user.id))?.status).toBe('error'))
    expect(result.current.visible).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('waits for a durable answer before opening You and does not change the mode', async () => {
    let complete!: (value: UserProfile) => void
    api.dismiss.mockImplementation(() => new Promise<UserProfile>(resolve => { complete = resolve }))
    const { result } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    let pending!: Promise<void>
    act(() => { pending = result.current.respond('open'); void result.current.respond('dismiss') })
    expect(api.dismiss).toHaveBeenCalledTimes(1)
    expect(result.current.pending).toBe(true)
    expect(api.navigate).not.toHaveBeenCalled()
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual(profile)
    await act(async () => { complete(saved); await pending })
    expect(api.navigate).toHaveBeenCalledWith('/you?focus=detail-level')
    expect(client.getQueryData<UserProfile>(accountQueryKeys.profile(user.id))?.experienceMode).toBe('guided')
    await waitFor(() => expect(result.current.visible).toBe(false))
  })

  it('persists Not now, hides the card and never navigates', async () => {
    const { result } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    await act(() => result.current.respond('dismiss'))
    await waitFor(() => expect(result.current.visible).toBe(false))
    expect(client.getQueryData<UserProfile>(accountQueryKeys.profile(user.id))?.fullModeHintDismissedAt).toBe(saved.fullModeHintDismissedAt)
    expect(api.navigate).not.toHaveBeenCalled()
  })

  it.each([false, true])('persists a slow Open answer without navigating after leaving Today (retry: %s)', async retry => {
    let complete!: (value: UserProfile) => void
    if (retry) api.dismiss.mockRejectedValueOnce(new Error('Connection lost'))
    api.dismiss.mockImplementationOnce(() => new Promise<UserProfile>(resolve => { complete = resolve }))
    const { result, rerender } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    if (retry) await act(() => result.current.respond('open'))
    let pending!: Promise<void>
    act(() => { pending = retry ? result.current.retry() : result.current.respond('open') })
    api.focused = false
    rerender()
    await act(async () => { complete(saved); await pending })
    expect(client.getQueryData<UserProfile>(accountQueryKeys.profile(user.id))?.fullModeHintDismissedAt).toBe(saved.fullModeHintDismissedAt)
    expect(api.navigate).not.toHaveBeenCalled()
  })

  it('retains a failed Open action and retries it explicitly', async () => {
    api.dismiss.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(saved)
    const { result } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    await act(() => result.current.respond('open'))
    expect(result.current.error).toBe('Connection lost')
    expect(result.current.action).toBe('open')
    expect(result.current.visible).toBe(true)
    expect(api.navigate).not.toHaveBeenCalled()
    await act(() => result.current.retry())
    expect(api.navigate).toHaveBeenCalledTimes(1)
    expect(api.dismiss).toHaveBeenCalledTimes(2)
  })

  it('ignores a late response after leaving the account', async () => {
    let complete!: (value: UserProfile) => void
    api.dismiss.mockImplementation(() => new Promise<UserProfile>(resolve => { complete = resolve }))
    const { result, unmount } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    let pending!: Promise<void>
    act(() => { pending = result.current.respond('open') })
    unmount()
    client.clear()
    const other = { ...profile, id: 'account-b' }
    client.setQueryData(accountQueryKeys.profile(other.id), other)
    await act(async () => { complete(saved); await pending })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
    expect(client.getQueryData(accountQueryKeys.profile(other.id))).toEqual(other)
    expect(api.navigate).not.toHaveBeenCalled()
  })

  it('cancels an older profile read and preserves newer unrelated preferences', async () => {
    const { result } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    const newer = { ...profile, units: 'lb' as const, themePreference: 'dark' as const }
    let completeRead!: (value: UserProfile) => void
    const read = client.fetchQuery({ queryKey: accountQueryKeys.profile(user.id), staleTime: 0,
      queryFn: () => new Promise<UserProfile>(resolve => { completeRead = resolve }) }).catch(() => undefined)
    act(() => client.setQueryData(accountQueryKeys.profile(user.id), newer))
    await act(() => result.current.respond('dismiss'))
    await act(async () => { completeRead(profile); await read })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual({ ...newer,
      fullModeHintDismissedAt: saved.fullModeHintDismissedAt })
  })

  it('does not republish or navigate when unmounted while cancelling an old read', async () => {
    let resume!: () => void
    const cancellation = vi.spyOn(client, 'cancelQueries').mockImplementationOnce(() => new Promise<void>(resolve => { resume = resolve }))
    const { result, unmount } = renderHook(() => useAdvancedInvitation(user), { wrapper })
    let pending!: Promise<void>
    act(() => { pending = result.current.respond('open') })
    await waitFor(() => expect(cancellation).toHaveBeenCalledTimes(1))
    unmount()
    client.clear()
    await act(async () => { resume(); await pending })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
    expect(api.navigate).not.toHaveBeenCalled()
  })
})
