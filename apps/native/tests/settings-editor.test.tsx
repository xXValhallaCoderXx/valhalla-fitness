import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ save: vi.fn(), preview: vi.fn() }))
vi.mock('@sheetless/data/account/settings-sections', () => ({ updateSettingsSection: api.save }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user, supabase: {} }) }))
vi.mock('@/lib/theme-provider', () => ({ useSheetlessTheme: () => ({ setPreviewPreference: api.preview }) }))
import { useSettingsEditor } from '../src/features/settings/useSettingsEditor'

const user = { id: 'account-a' } as User
const profile: UserProfile = {
  id: user.id, email: 'settings@example.test', units: 'kg', rounding: 2.5,
  equipmentProfile: ['barbell', 'future_station'], themePreference: 'system', timezone: null,
  programStateDefaults: { squat_one_rep_max: 100, bench_press_one_rep_max: 60, future_estimate: 50 },
  onboardingCompleted: true, liveOnboardingDismissed: false, postWorkoutFeedbackDismissed: false,
  sex: null, autoStartTimer: true, defaultRestSeconds: 120, experienceMode: 'guided',
  showFormulas: true, fullModeHintDismissedAt: null,
}
let client: QueryClient
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  client.setQueryData(accountQueryKeys.profile(user.id), profile)
})

describe('scoped settings editor', () => {
  it('saves only the changed page preferences and publishes the authoritative profile', async () => {
    const saved = { ...profile, units: 'lb' as const, programStateDefaults: { squat_one_rep_max: 220 } }
    api.save.mockResolvedValue(saved)
    const todayKey = accountQueryKeys.today(user.id)
    const otherKey = accountQueryKeys.today('account-b')
    client.setQueryData(todayKey, { units: 'kg' })
    client.setQueryData(otherKey, { units: 'kg' })
    const { result } = renderHook(() => useSettingsEditor(profile, user, 'you'), { wrapper })
    act(() => result.current.draft.setUnits('lb'))
    await act(() => result.current.save())
    expect(api.save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ user }), { section: 'you', units: 'lb' })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual(saved)
    expect(client.getQueryState(todayKey)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false)
    expect(result.current.draft.values.programStateDefaults).toEqual(saved.programStateDefaults)
    expect(result.current.dirty).toBe(false)
    expect(result.current.saved).toBe(true)
  })

  it('retains failed edits for an explicit retry and clears the error after success', async () => {
    api.save.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ ...profile, defaultRestSeconds: 180 })
    const { result } = renderHook(() => useSettingsEditor(profile, user, 'workouts'), { wrapper })
    act(() => result.current.draft.setDefaultRestSeconds(180))
    await act(() => result.current.save())
    expect(result.current.error).toBe('Connection lost')
    expect(result.current.draft.values.defaultRestSeconds).toBe(180)
    expect(result.current.dirty).toBe(true)
    expect(result.current.saving).toBe(false)
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual(profile)
    await act(() => result.current.save())
    expect(api.save).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeNull()
    expect(result.current.dirty).toBe(false)
  })

  it('submits once across repeated save presses and waits for the server receipt', async () => {
    let resolve!: (value: UserProfile) => void
    api.save.mockImplementation(() => new Promise<UserProfile>(done => { resolve = done }))
    const { result } = renderHook(() => useSettingsEditor(profile, user, 'sex'), { wrapper })
    act(() => result.current.draft.setSex('female'))
    let pending!: Promise<void>
    act(() => { pending = result.current.save(); void result.current.save() })
    expect(api.save).toHaveBeenCalledTimes(1)
    expect(result.current.saving).toBe(true)
    expect(result.current.dirty).toBe(true)
    await act(async () => { resolve({ ...profile, sex: 'female' }); await pending })
    expect(result.current.saving).toBe(false)
    expect(result.current.dirty).toBe(false)
  })

  it('previews appearance and discards to the freshest saved profile', () => {
    const { result, rerender } = renderHook(({ value }) => useSettingsEditor(value, user, 'you'), {
      wrapper, initialProps: { value: profile },
    })
    act(() => result.current.changeTheme('dark'))
    expect(api.preview).toHaveBeenLastCalledWith('dark')
    const refreshed = { ...profile, themePreference: 'light' as const, units: 'lb' as const }
    rerender({ value: refreshed })
    expect(result.current.draft.values.themePreference).toBe('dark')
    act(() => result.current.discard())
    expect(result.current.draft.values.themePreference).toBe('light')
    expect(result.current.draft.values.units).toBe('lb')
    expect(result.current.dirty).toBe(false)
    expect(api.preview).toHaveBeenLastCalledWith(null)
  })

  it('does not submit a clean editor or invalid starting numbers', async () => {
    const { result } = renderHook(() => useSettingsEditor(profile, user, 'starting-numbers'), { wrapper })
    await act(() => result.current.save())
    act(() => result.current.draft.setEstimateInput('squat_one_rep_max', 'not a number'))
    expect(result.current.invalid).toBe(true)
    expect(result.current.dirty).toBe(true)
    await act(() => result.current.save())
    expect(api.save).not.toHaveBeenCalled()
  })

  it('retains the input units and only edited starting numbers across a profile refresh', async () => {
    api.save.mockResolvedValue({ ...profile, units: 'lb', programStateDefaults: { squat_one_rep_max: 242.5, bench_press_one_rep_max: 135 } })
    const { result, rerender } = renderHook(({ value }) => useSettingsEditor(value, user, 'starting-numbers'), {
      wrapper, initialProps: { value: profile },
    })
    act(() => result.current.draft.setEstimateInput('squat_one_rep_max', '110'))
    rerender({ value: { ...profile, units: 'lb', programStateDefaults: { squat_one_rep_max: 220, bench_press_one_rep_max: 135 } } })
    await act(() => result.current.save())
    expect(api.save).toHaveBeenCalledWith(expect.anything(), {
      section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: { squat_one_rep_max: 110 },
    })
  })

  it('ignores a late old-account result without clearing the new account preview or cache', async () => {
    let resolve!: (value: UserProfile) => void
    api.save.mockImplementation(() => new Promise<UserProfile>(done => { resolve = done }))
    const { result, unmount } = renderHook(() => useSettingsEditor(profile, user, 'you'), { wrapper })
    act(() => result.current.changeTheme('dark'))
    let pending!: Promise<void>
    act(() => { pending = result.current.save() })
    unmount()
    client.clear()
    const nextProfile = { ...profile, id: 'account-b' }
    client.setQueryData(accountQueryKeys.profile(nextProfile.id), nextProfile)
    const next = renderHook(() => useSettingsEditor(nextProfile, { id: nextProfile.id } as User, 'you'), { wrapper })
    act(() => next.result.current.changeTheme('light'))
    api.preview.mockClear()
    await act(async () => { resolve({ ...profile, themePreference: 'dark' }); await pending })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
    expect(client.getQueryData(accountQueryKeys.profile(nextProfile.id))).toEqual(nextProfile)
    expect(api.preview).not.toHaveBeenCalled()
    expect(next.result.current.draft.values.themePreference).toBe('light')
  })

  it.each(['cancelQueries', 'invalidateQueries'] as const)('ignores an unmounted editor after awaiting %s', async method => {
    let resume!: () => void
    const suspended = vi.spyOn(client, method).mockImplementationOnce(() => new Promise<void>(done => { resume = done }))
    api.save.mockResolvedValue({ ...profile, sex: 'female' })
    const { result, unmount } = renderHook(() => useSettingsEditor(profile, user, 'sex'), { wrapper })
    act(() => result.current.draft.setSex('female'))
    let pending!: Promise<void>
    act(() => { pending = result.current.save() })
    await waitFor(() => expect(suspended).toHaveBeenCalledTimes(1))
    unmount()
    client.clear()
    await act(async () => { resume(); await pending })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
  })

  it('cancels a stale profile read before publishing the saved result', async () => {
    let finishRead!: (value: UserProfile) => void
    const staleRead = client.fetchQuery({ queryKey: accountQueryKeys.profile(user.id),
      queryFn: () => new Promise<UserProfile>(resolve => { finishRead = resolve }),
    }).catch(() => undefined)
    const saved = { ...profile, sex: 'female' as const }
    api.save.mockResolvedValue(saved)
    const { result } = renderHook(() => useSettingsEditor(profile, user, 'sex'), { wrapper })
    act(() => result.current.draft.setSex('female'))
    await act(() => result.current.save())
    await act(async () => { finishRead(profile); await staleRead })
    expect(client.getQueryData(accountQueryKeys.profile(user.id))).toEqual(saved)
  })

  it.each(['you', 'sex'] as const)('refreshes mounted Insights after a %s save without waiting for that read', async section => {
    const key = accountQueryKeys.historyDashboard(user.id)
    client.setQueryData(key, { units: 'kg', sex: null })
    let complete!: (value: { units: string; sex: string | null }) => void
    const reload = vi.fn(() => new Promise<{ units: string; sex: string | null }>(resolve => { complete = resolve }))
    const observer = new QueryObserver(client, { queryKey: key, queryFn: reload, staleTime: Infinity })
    const unsubscribe = observer.subscribe(() => {})
    const saved = { ...profile, ...(section === 'you' ? { units: 'lb' as const } : { sex: 'female' as const }) }
    api.save.mockResolvedValue(saved)
    const { result } = renderHook(() => useSettingsEditor(profile, user, section), { wrapper })
    act(() => { if (section === 'you') result.current.draft.setUnits('lb'); else result.current.draft.setSex('female') })

    await act(() => result.current.save())

    expect(reload).toHaveBeenCalledTimes(1)
    expect(result.current.saving).toBe(false)
    expect(result.current.saved).toBe(true)
    await act(async () => { complete({ units: saved.units, sex: saved.sex ?? null }) })
    await waitFor(() => expect(client.getQueryData(key)).toEqual({ units: saved.units, sex: saved.sex ?? null }))
    unsubscribe()
  })

  it('keeps the profile receipt successful if a background consumer refresh fails', async () => {
    const key = accountQueryKeys.historyDashboard(user.id)
    client.setQueryData(key, { units: 'kg' })
    const observer = new QueryObserver(client, { queryKey: key, queryFn: () => Promise.reject(new Error('Insights unavailable')),
      staleTime: Infinity, retry: false,
    })
    const unsubscribe = observer.subscribe(() => {})
    api.save.mockResolvedValue({ ...profile, sex: 'female' })
    const { result } = renderHook(() => useSettingsEditor(profile, user, 'sex'), { wrapper })
    act(() => result.current.draft.setSex('female'))

    await act(() => result.current.save())
    await waitFor(() => expect(client.getQueryState(key)?.status).toBe('error'))

    expect(result.current.saved).toBe(true)
    expect(result.current.saving).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.dirty).toBe(false)
    unsubscribe()
  })

  it('restarts an initially pending account read that was canceled by the save', async () => {
    const key = accountQueryKeys.bodyweight(user.id)
    const reload = vi.fn().mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce([])
    const observer = new QueryObserver(client, { queryKey: key, queryFn: reload })
    const unsubscribe = observer.subscribe(() => {})
    api.save.mockResolvedValue({ ...profile, themePreference: 'dark' })
    const { result } = renderHook(() => useSettingsEditor(profile, user, 'you'), { wrapper })
    act(() => result.current.changeTheme('dark'))

    await act(() => result.current.save())
    await waitFor(() => expect(client.getQueryState(key)?.status).toBe('success'))

    expect(reload).toHaveBeenCalledTimes(2)
    expect(client.getQueryData(key)).toEqual([])
    unsubscribe()
  })
})
