import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { UserProfile } from '@sheetless/domain/account/types'
import { useSettingsDraft } from '../src/features/settings/useSettingsDraft'

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-a',
  email: 'lifter@example.test',
  units: 'kg',
  rounding: 2.5,
  equipmentProfile: ['barbell'],
  themePreference: 'system',
  timezone: 'Asia/Singapore',
  programStateDefaults: { squat_one_rep_max: 140, bench_press_one_rep_max: 100 },
  onboardingCompleted: true,
  liveOnboardingDismissed: true,
  postWorkoutFeedbackDismissed: false,
  sex: 'female',
  autoStartTimer: true,
  defaultRestSeconds: 150,
  ...overrides,
})

/**
 * `useSettingsDraft` re-adopts the server profile through an effect keyed on the
 * profile's object identity, so every test holds ONE fixture reference for the
 * lifetime of the hook — exactly what `useMe().data` gives the real screen. A
 * fresh object per render would re-fire that effect on every commit.
 */
describe('useSettingsDraft', () => {
  it('starts clean and valid', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))
    expect(result.current.dirty).toBe(false)
    expect(result.current.hasValidationErrors).toBe(false)
    expect(result.current.estimateInputs.squat_one_rep_max).toBe('140')
  })

  it('goes dirty on a real change and clean again when the value is restored', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))

    act(() => result.current.setRounding(5))
    expect(result.current.dirty).toBe(true)

    act(() => result.current.setRounding(2.5))
    expect(result.current.dirty).toBe(false)
  })

  it('converts and rounds saved estimates when the unit changes', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))

    act(() => result.current.setUnits('lb'))

    expect(result.current.values.units).toBe('lb')
    expect(result.current.values.programStateDefaults.squat_one_rep_max).toBe(307.5)
    // The visible inputs must follow the conversion, not keep the kg text.
    expect(result.current.estimateInputs.squat_one_rep_max).toBe('307.5')
    expect(result.current.dirty).toBe(true)
  })

  it('is a no-op when the unit is set to the one already selected', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))
    act(() => result.current.setUnits('kg'))
    expect(result.current.dirty).toBe(false)
  })

  it('flags a non-positive estimate and blocks saving', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))

    act(() => result.current.setEstimateInput('squat_one_rep_max', '0'))

    expect(result.current.estimateErrors.squat_one_rep_max).toBe('Enter a number greater than zero.')
    expect(result.current.hasValidationErrors).toBe(true)
  })

  it('flags an implausible estimate above the profile ceiling', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))

    act(() => result.current.setEstimateInput('squat_one_rep_max', '100001'))

    expect(result.current.estimateErrors.squat_one_rep_max).toBe('Enter a value no greater than 100,000.')
    expect(result.current.hasValidationErrors).toBe(true)
  })

  it('treats a cleared estimate as unset rather than invalid', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))

    act(() => result.current.setEstimateInput('squat_one_rep_max', ''))

    expect(result.current.estimateErrors.squat_one_rep_max).toBeNull()
    expect(result.current.hasValidationErrors).toBe(false)
    expect(result.current.values.programStateDefaults.squat_one_rep_max).toBeNull()
  })

  it('toggles equipment on and back off', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))

    act(() => result.current.toggleEquipment('dumbbells'))
    expect(result.current.values.equipmentProfile).toContain('dumbbells')

    act(() => result.current.toggleEquipment('dumbbells'))
    expect(result.current.values.equipmentProfile).not.toContain('dumbbells')
    expect(result.current.dirty).toBe(false)
  })

  it('discard restores the baseline without mutating it', () => {
    const saved = profile()
    const { result } = renderHook(() => useSettingsDraft(saved))

    act(() => result.current.setEstimateInput('squat_one_rep_max', '999'))
    act(() => result.current.toggleEquipment('cable'))
    act(() => result.current.discard())

    expect(result.current.dirty).toBe(false)
    expect(result.current.estimateInputs.squat_one_rep_max).toBe('140')
    expect(result.current.values.equipmentProfile).toEqual(['barbell'])
    // A shared array reference would let the next edit corrupt the baseline.
    expect(result.current.values.equipmentProfile).not.toBe(result.current.baseline.equipmentProfile)
  })

  it('adopts a refreshed profile while the draft is clean', () => {
    const { rerender, result } = renderHook(({ value }) => useSettingsDraft(value), {
      initialProps: { value: profile() },
    })

    rerender({ value: profile({ defaultRestSeconds: 210 }) })

    expect(result.current.values.defaultRestSeconds).toBe(210)
  })

  it('does not clobber unsaved edits when the profile refetches', () => {
    const { rerender, result } = renderHook(({ value }) => useSettingsDraft(value), {
      initialProps: { value: profile() },
    })

    act(() => result.current.setDefaultRestSeconds(90))
    rerender({ value: profile({ defaultRestSeconds: 210 }) })

    expect(result.current.values.defaultRestSeconds).toBe(90)
    expect(result.current.dirty).toBe(true)
  })
})
