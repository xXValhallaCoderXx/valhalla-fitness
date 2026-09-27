import { act, renderHook } from '@testing-library/react'
import type { UserProfile } from '@sheetless/domain/account/types'
import { describe, expect, it } from 'vitest'
import { settingsSectionInput } from '../src/features/settings/settings-section-input'
import { useSettingsDraft } from '../src/features/settings/useSettingsDraft'

const profile: UserProfile = {
  id: 'account-a', email: null, units: 'kg', rounding: 2.5,
  equipmentProfile: ['barbell', 'future_station'], themePreference: 'system', timezone: null,
  programStateDefaults: { squat_one_rep_max: 100, bench_press_one_rep_max: 60, future_estimate: 50 },
  onboardingCompleted: true, liveOnboardingDismissed: false, postWorkoutFeedbackDismissed: false,
  sex: null, autoStartTimer: true, defaultRestSeconds: 120, experienceMode: 'guided',
  showFormulas: true, fullModeHintDismissedAt: null,
}

describe('settings page patches', () => {
  it('keeps unchanged pages clean and excludes other page edits', () => {
    const { result } = renderHook(() => useSettingsDraft(profile))
    for (const section of ['you', 'sex', 'equipment', 'starting-numbers', 'workouts'] as const) {
      expect(settingsSectionInput(section, result.current)).toBeNull()
    }
    act(() => { result.current.setThemePreference('dark'); result.current.setSex('female'); result.current.setDefaultRestSeconds(180) })
    expect(settingsSectionInput('you', result.current)).toEqual({ section: 'you', themePreference: 'dark' })
    expect(settingsSectionInput('sex', result.current)).toEqual({ section: 'sex', sex: 'female' })
    expect(settingsSectionInput('workouts', result.current)).toEqual({ section: 'workouts', defaultRestSeconds: 180 })
  })

  it('sends only known equipment selections and leaves unknown preservation to the data layer', () => {
    const { result } = renderHook(() => useSettingsDraft(profile))
    act(() => { result.current.toggleEquipment('barbell'); result.current.toggleEquipment('box') })
    expect(settingsSectionInput('equipment', result.current)).toEqual({ section: 'equipment', equipmentProfile: ['box'] })
  })

  it('includes only edited estimate keys, explicit clears, and changed rounding', () => {
    const { result } = renderHook(() => useSettingsDraft(profile))
    act(() => { result.current.setEstimateInput('squat_one_rep_max', ''); result.current.setRounding(5) })
    expect(settingsSectionInput('starting-numbers', result.current)).toEqual({
      section: 'starting-numbers', inputUnits: 'kg', rounding: 5, programStateDefaults: { squat_one_rep_max: null },
    })
  })

  it('does not send converted draft estimates when only You units changed', () => {
    const { result } = renderHook(() => useSettingsDraft(profile))
    act(() => result.current.setUnits('lb'))
    expect(settingsSectionInput('you', result.current)).toEqual({ section: 'you', units: 'lb' })
  })
})
