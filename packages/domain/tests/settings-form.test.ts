import { describe, expect, it } from 'vitest'
import { convertProgramStateDefaults } from '@sheetless/domain/account/settings-form'
import { updateSettingsInputSchema } from '@sheetless/domain/account/schemas'

describe('convertProgramStateDefaults', () => {
  it('converts every positive load key and rounds in the destination unit', () => {
    const defaults = {
      squat_one_rep_max: 100,
      custom_manual_load: 10,
      bench_press_one_rep_max: null,
    }

    expect(convertProgramStateDefaults(defaults, 'kg', 'lb', 5)).toEqual({
      squat_one_rep_max: 220,
      custom_manual_load: 20,
      bench_press_one_rep_max: null,
    })
    expect(defaults).toEqual({
      squat_one_rep_max: 100,
      custom_manual_load: 10,
      bench_press_one_rep_max: null,
    })
  })

  it('converts pounds back to kilograms using the target rounding increment', () => {
    expect(
      convertProgramStateDefaults({ deadlift_one_rep_max: 220 }, 'lb', 'kg', 2.5),
    ).toEqual({ deadlift_one_rep_max: 100 })
  })

  it('returns an unmodified copy when the unit does not change', () => {
    const defaults = { arbitrary_state_key: 101, unset_key: null }
    const converted = convertProgramStateDefaults(defaults, 'kg', 'kg', 5)

    expect(converted).toEqual(defaults)
    expect(converted).not.toBe(defaults)
  })

  it('keeps a converted positive load at least one target increment', () => {
    const converted = convertProgramStateDefaults({ small_manual_load: 1 }, 'kg', 'lb', 5)

    expect(converted).toEqual({ small_manual_load: 5 })
    expect(updateSettingsInputSchema.safeParse({
      units: 'lb',
      rounding: 5,
      equipmentProfile: [],
      themePreference: 'system',
      programStateDefaults: converted,
    }).success).toBe(true)
  })

  it('converts the current draft on each unit toggle instead of reinterpreting stale values', () => {
    const pounds = convertProgramStateDefaults({ squat_one_rep_max: 100 }, 'kg', 'lb', 5)
    const kilograms = convertProgramStateDefaults(pounds, 'lb', 'kg', 2.5)

    expect(pounds).toEqual({ squat_one_rep_max: 220 })
    expect(kilograms.squat_one_rep_max).toBeCloseTo(100)
  })
})
