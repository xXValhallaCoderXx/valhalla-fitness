import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { useMe } from '../src/lib/account'
import { useExperienceMode } from '../src/lib/experience-mode'
import { useSettingsDraft } from '../src/features/settings/useSettingsDraft'
import { useExperienceSettings } from '../src/features/settings/preferences/useExperienceSettings'

const api = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), restore: vi.fn(), user: { id: 'account-a' } }))
vi.mock('@sheetless/data/account/profile', () => ({
  getMe: api.read, updateSettings: api.update, restoreFullModeHint: api.restore,
}))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: api.user }) }))

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'account-a', email: 'member@example.test', units: 'kg', rounding: 2.5,
    equipmentProfile: ['barbell'], themePreference: 'system', timezone: 'Asia/Singapore',
    programStateDefaults: { squat_one_rep_max: 140 }, onboardingCompleted: true,
    liveOnboardingDismissed: true, postWorkoutFeedbackDismissed: false, sex: null,
    autoStartTimer: true, defaultRestSeconds: 120, experienceMode: 'guided',
    showFormulas: false, fullModeHintDismissedAt: null, ...overrides,
  }
}

let client: QueryClient
let saved: UserProfile
const user = { id: 'account-a' } as User
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

beforeEach(() => {
  vi.resetAllMocks()
  api.user = { id: 'account-a' }
  saved = profile()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  client.setQueryData(accountQueryKeys.profile(saved.id), saved)
  api.read.mockResolvedValue(saved)
})
afterEach(() => client.clear())

function useSettings() {
  const me = useMe()
  const current = me.data ?? saved
  return {
    mode: useExperienceMode(), draft: useSettingsDraft(current),
    experience: useExperienceSettings(user, current),
  }
}

it('changes reading mode only after confirmation and preserves an unrelated dirty draft', async () => {
  let finish!: (value: UserProfile) => void
  api.update.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  const { result } = renderHook(useSettings, { wrapper })
  act(() => {
    result.current.draft.setUnits('lb')
    result.current.draft.setDefaultRestSeconds(240)
  })
  act(() => result.current.experience.setMode('full'))
  await waitFor(() => expect(api.update).toHaveBeenCalledOnce())
  expect(result.current.mode.mode).toBe('guided')
  expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ user }), {
    units: 'kg', rounding: 2.5, equipmentProfile: ['barbell'], themePreference: 'system',
    programStateDefaults: { squat_one_rep_max: 140 }, experienceMode: 'full',
  })

  await act(async () => finish(profile({ experienceMode: 'full' })))
  await waitFor(() => expect(result.current.mode.isFull).toBe(true))
  expect(result.current.draft.values.units).toBe('lb')
  expect(result.current.draft.values.defaultRestSeconds).toBe(240)
  expect(result.current.draft.dirty).toBe(true)
  // Profile Save never writes back an old reading preference.
  expect(result.current.draft.values).not.toHaveProperty('experienceMode')
})

it('retains the saved mode on failure and retries the intended change with current saved defaults', async () => {
  api.update.mockRejectedValueOnce(new Error('Connection failed'))
  const { result } = renderHook(useSettings, { wrapper })
  act(() => result.current.experience.setMode('full'))
  await waitFor(() => expect(result.current.experience.isError).toBe(true))
  expect(result.current.mode.mode).toBe('guided')
  const refreshed = profile({ rounding: 5, autoStartTimer: false })
  act(() => client.setQueryData(accountQueryKeys.profile(user.id), refreshed))
  api.update.mockResolvedValueOnce({ ...refreshed, experienceMode: 'full' })
  act(() => result.current.experience.retry())
  await waitFor(() => expect(result.current.mode.isFull).toBe(true))
  expect(api.update.mock.calls[1][1]).toEqual(expect.objectContaining({ rounding: 5, experienceMode: 'full' }))
  expect(result.current.experience.isError).toBe(false)
})

it('keeps the formula preference while Guided only changes its effective display', async () => {
  client.setQueryData(accountQueryKeys.profile(user.id), profile({ experienceMode: 'full', showFormulas: true }))
  const { result } = renderHook(useSettings, { wrapper })
  expect(result.current.mode.showFormulas).toBe(true)
  api.update.mockResolvedValueOnce(profile({ showFormulas: true }))
  act(() => result.current.experience.setMode('guided'))
  await waitFor(() => expect(result.current.mode.isFull).toBe(false))
  expect(result.current.mode.showFormulas).toBe(false)
  expect(client.getQueryData<UserProfile>(accountQueryKeys.profile(user.id))?.showFormulas).toBe(true)
  expect(api.update.mock.calls[0][1]).not.toHaveProperty('showFormulas')
})

it('saves formula display and restores the invitation through their existing profile APIs', async () => {
  const full = profile({ experienceMode: 'full', fullModeHintDismissedAt: '2026-09-18T08:00:00Z' })
  client.setQueryData(accountQueryKeys.profile(user.id), full)
  api.update.mockResolvedValueOnce({ ...full, showFormulas: true })
  const { result } = renderHook(useSettings, { wrapper })
  act(() => result.current.experience.setFormulas(true))
  await waitFor(() => expect(result.current.mode.showFormulas).toBe(true))
  api.restore.mockResolvedValueOnce({ ...full, showFormulas: true, fullModeHintDismissedAt: null })
  act(() => result.current.experience.restoreHints())
  await waitFor(() => expect(client.getQueryData<UserProfile>(accountQueryKeys.profile(user.id))?.fullModeHintDismissedAt).toBeNull())
  expect(api.restore).toHaveBeenCalledWith(expect.objectContaining({ user }))
})

it('does not expose another account mode or recreate its cache after a pending save signs out', async () => {
  let finish!: (value: UserProfile) => void
  api.update.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  const { result, rerender } = renderHook(useSettings, { wrapper })
  act(() => result.current.experience.setMode('full'))
  await waitFor(() => expect(api.update).toHaveBeenCalledOnce())
  const second = profile({ id: 'account-b' })
  api.read.mockResolvedValue(second)
  act(() => {
    client.removeQueries({ queryKey: accountQueryKeys.profile(user.id) })
    client.setQueryData(accountQueryKeys.profile(second.id), second)
    api.user = { id: second.id }
    rerender()
  })
  expect(result.current.mode.mode).toBe('guided')
  await act(async () => finish(profile({ experienceMode: 'full', showFormulas: true })))
  expect(result.current.mode).toEqual({ mode: 'guided', isFull: false, showFormulas: false })
  expect(client.getQueryData(accountQueryKeys.profile(user.id))).toBeUndefined()
  expect(client.getQueryData<UserProfile>(accountQueryKeys.profile(second.id))?.experienceMode).toBe('guided')
})
