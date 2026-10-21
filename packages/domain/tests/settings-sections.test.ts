import { describe, expect, it } from 'vitest'
import { updateSettingsSectionInputSchema } from '@sheetless/domain/account/schemas'

describe('scoped settings inputs', () => {
  it.each([
    { section: 'you', units: 'lb' },
    { section: 'you', themePreference: 'system', experienceMode: 'full' },
    { section: 'sex', sex: null },
    { section: 'equipment', equipmentProfile: [] },
    { section: 'equipment', equipmentProfile: ['barbell', 'box'] },
    { section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: { squat_one_rep_max: 100, bench_press_one_rep_max: null } },
    { section: 'starting-numbers', inputUnits: 'lb', programStateDefaults: {}, rounding: 5 },
    { section: 'workouts', autoStartTimer: false },
    { section: 'workouts', defaultRestSeconds: 600 },
  ])('accepts an explicit $section patch', input => {
    expect(updateSettingsSectionInputSchema.parse(input)).toEqual(input)
  })

  it.each([
    { section: 'you' },
    { section: 'you', units: undefined },
    { section: 'you', units: 'kg', showFormulas: true },
    { section: 'you', units: 'kg', userId: 'other' },
    { section: 'you', rounding: 5 },
    { section: 'you', experienceMode: 'Advanced' },
    { section: 'sex' },
    { section: 'sex', sex: 'other' },
    { section: 'equipment', equipmentProfile: ['barbell', 'barbell'] },
    { section: 'equipment', equipmentProfile: ['specialty_bars'] },
    { section: 'equipment', equipmentProfile: ['future_station'] },
    { section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: {} },
    { section: 'starting-numbers', programStateDefaults: { squat_one_rep_max: 100 } },
    { section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: { future_estimate: 100 } },
    { section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: { squat_one_rep_max: 0 } },
    { section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: { squat_one_rep_max: 100_001 } },
    { section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: {}, rounding: 0 },
    { section: 'workouts' },
    { section: 'workouts', autoStartTimer: undefined },
    { section: 'workouts', defaultRestSeconds: 29 },
    { section: 'workouts', defaultRestSeconds: 601 },
    { section: 'workouts', autoStartTimer: false, scheduledReminder: true },
  ])('rejects empty, unsupported or over-posted values: %j', input => {
    expect(updateSettingsSectionInputSchema.safeParse(input).success).toBe(false)
  })
})
