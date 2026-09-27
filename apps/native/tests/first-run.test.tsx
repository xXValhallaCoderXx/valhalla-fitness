import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ complete: vi.fn() }))
vi.mock('@sheetless/data/account/profile', () => ({ completeFirstRun: api.complete }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user, supabase: {} }) }))
import { useFirstRun } from '../src/features/onboarding/useFirstRun'

const user = { id: 'account-a' } as User
const profile: UserProfile = {
  id: user.id, email: 'first-run@example.test', units: 'lb', rounding: 5,
  equipmentProfile: ['barbell'], themePreference: 'system', timezone: null,
  programStateDefaults: { squat_one_rep_max: 200 }, onboardingCompleted: false,
  liveOnboardingDismissed: false, postWorkoutFeedbackDismissed: false,
  autoStartTimer: true, defaultRestSeconds: 120, experienceMode: 'full',
  showFormulas: false, fullModeHintDismissedAt: null,
}
let client: QueryClient
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  client.setQueryData(accountQueryKeys.profile(user.id), profile)
})

describe('first-run choices', () => {
  it('prefills existing values and saves only the chosen preferences with the authoritative profile', async () => {
    const saved = { ...profile, units: 'kg', experienceMode: 'guided', onboardingCompleted: true, programStateDefaults: { squat_one_rep_max: 90 } }
    api.complete.mockResolvedValue(saved)
    const { result } = renderHook(() => useFirstRun(profile, user), { wrapper })
    expect(result.current.units).toBe('lb')
    expect(result.current.experienceMode).toBe('full')
    act(() => { result.current.setUnits('kg'); result.current.setExperienceMode('guided') })
    await act(() => result.current.save())
    expect(api.complete).toHaveBeenCalledWith(expect.objectContaining({ user }), { units: 'kg', experienceMode: 'guided' })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual(saved)
  })

  it('keeps the gate closed and choices intact after failure, then allows an explicit retry', async () => {
    api.complete.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ ...profile, units: 'kg', onboardingCompleted: true })
    const { result } = renderHook(() => useFirstRun(profile, user), { wrapper })
    act(() => result.current.setUnits('kg'))
    await act(() => result.current.save())
    expect(result.current.error).toBe('Connection lost')
    expect(result.current.units).toBe('kg')
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual(profile)
    await act(() => result.current.save())
    expect(result.current.error).toBeNull()
    expect(client.getQueryData<UserProfile>(accountQueryKeys.profile(user.id))?.onboardingCompleted).toBe(true)
  })

  it('submits once across repeated Continue presses and does not complete before the receipt', async () => {
    let resolve!: (value: UserProfile) => void
    api.complete.mockImplementation(() => new Promise<UserProfile>((done) => { resolve = done }))
    const { result } = renderHook(() => useFirstRun(profile, user), { wrapper })
    let first!: Promise<void>
    act(() => { first = result.current.save(); void result.current.save() })
    expect(api.complete).toHaveBeenCalledTimes(1)
    expect(result.current.saving).toBe(true)
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual(profile)
    await act(async () => { resolve({ ...profile, onboardingCompleted: true }); await first })
    expect(result.current.saving).toBe(false)
  })

  it('ignores a late receipt after leaving the account, even after the account cache is cleared', async () => {
    let resolve!: (value: UserProfile) => void
    api.complete.mockImplementation(() => new Promise<UserProfile>((done) => { resolve = done }))
    const { result, unmount } = renderHook(() => useFirstRun(profile, user), { wrapper })
    let pending!: Promise<void>
    act(() => { pending = result.current.save() })
    unmount()
    client.clear()
    const next = { ...profile, id: 'account-b', units: 'kg' as const }
    client.setQueryData(accountQueryKeys.profile(next.id), next)
    await act(async () => { resolve({ ...profile, onboardingCompleted: true }); await pending })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
    expect(client.getQueryData(accountQueryKeys.profile(next.id))).toEqual(next)
  })

  it('prevents a profile read from before completion from closing the entry gate again', async () => {
    let finishRead!: (value: UserProfile) => void
    const staleRead = client.fetchQuery({
      queryKey: accountQueryKeys.profile(user.id),
      queryFn: () => new Promise<UserProfile>((resolve) => { finishRead = resolve }),
    }).catch(() => undefined)
    const saved = { ...profile, units: 'kg' as const, onboardingCompleted: true }
    api.complete.mockResolvedValue(saved)
    const { result } = renderHook(() => useFirstRun(profile, user), { wrapper })

    await act(() => result.current.save())
    await act(async () => { finishRead(profile); await staleRead })

    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual(saved)
    expect(client.getQueryState(accountQueryKeys.profile(user.id))?.isInvalidated).toBe(false)
  })

  it('invalidates existing account data without refetching protected screens before completion', async () => {
    const todayKey = accountQueryKeys.today(user.id)
    const historyKey = accountQueryKeys.todayHistorySupport(user.id)
    const otherKey = accountQueryKeys.historyDashboard('account-b')
    client.setQueryData(todayKey, { units: 'lb' })
    client.setQueryData(historyKey, { units: 'lb', weeklyVolume: 220 })
    client.setQueryData(otherKey, { units: 'kg' })
    const reload = vi.fn(async () => ({ units: 'kg' }))
    const observer = new QueryObserver(client, { queryKey: todayKey, queryFn: reload, staleTime: Infinity })
    const unsubscribe = observer.subscribe(() => {})
    api.complete.mockResolvedValue({ ...profile, units: 'kg', onboardingCompleted: true })
    const { result } = renderHook(() => useFirstRun(profile, user), { wrapper })

    await act(() => result.current.save())

    expect(reload).not.toHaveBeenCalled()
    expect(client.getQueryState(todayKey)?.isInvalidated).toBe(true)
    expect(client.getQueryState(historyKey)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false)
    expect(client.getQueryState(accountQueryKeys.profile(user.id))?.isInvalidated).toBe(false)
    await client.fetchQuery({ queryKey: todayKey, queryFn: reload, staleTime: Infinity })
    expect(client.getQueryData(todayKey)).toEqual({ units: 'kg' })
    unsubscribe()
  })

  it.each(['cancel', 'invalidate'] as const)('does not repopulate a departed account after awaiting %s', async (boundary) => {
    let resume!: () => void
    const method = boundary === 'cancel' ? 'cancelQueries' : 'invalidateQueries'
    const suspended = vi.spyOn(client, method).mockImplementationOnce(() => new Promise<void>((resolve) => { resume = resolve }))
    api.complete.mockResolvedValue({ ...profile, onboardingCompleted: true })
    const { result, unmount } = renderHook(() => useFirstRun(profile, user), { wrapper })
    let pending!: Promise<void>
    act(() => { pending = result.current.save() })
    await waitFor(() => expect(suspended).toHaveBeenCalledTimes(1))
    unmount()
    client.clear()
    const next = { ...profile, id: 'account-b' }
    client.setQueryData(accountQueryKeys.profile(next.id), next)

    await act(async () => { resume(); await pending })

    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
    expect(client.getQueryData(accountQueryKeys.profile(next.id))).toEqual(next)
  })
})
