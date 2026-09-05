import { describe, expect, it } from 'vitest'
import {
  countSelectedEquipmentProfileOptions,
  EQUIPMENT_PROFILE_OPTIONS,
  isEquipmentProfileCompatible,
  normalizeEquipmentProfile,
  toggleEquipmentProfileItem,
} from '@sheetless/domain/account/equipment-profile'

describe('equipment profile', () => {
  it('exposes every canonical required-equipment identifier once', () => {
    expect(EQUIPMENT_PROFILE_OPTIONS).toEqual([
      'barbell',
      'dumbbells',
      'specialty_bar',
      'rack',
      'bench',
      'plates',
      'pull_up_bar',
      'dip_bars',
      'cable',
      'machine',
      'smith_machine',
      'landmine',
      'box',
      'ab_wheel',
      'sliders',
      'bodyweight',
    ])
    expect(new Set(EQUIPMENT_PROFILE_OPTIONS).size).toBe(16)
  })

  it('canonicalizes legacy aliases, deduplicates them, and preserves unknown values', () => {
    expect(
      normalizeEquipmentProfile([
        ' specialty_bars ',
        'future_station',
        'specialty_bar',
        'blocks',
        'box',
      ]),
    ).toEqual(['specialty_bar', 'future_station', 'box'])
  })

  it('treats an empty profile as all equipment and otherwise requires every item', () => {
    expect(isEquipmentProfileCompatible(['barbell', 'plates'], [])).toBe(true)
    expect(
      isEquipmentProfileCompatible(
        ['specialty_bar', 'box'],
        ['specialty_bars', 'blocks', 'future_station'],
      ),
    ).toBe(true)
    expect(
      isEquipmentProfileCompatible(
        ['barbell', 'plates'],
        ['barbell', 'future_station'],
      ),
    ).toBe(false)
  })

  it('toggles canonical items without dropping unknown profile entries', () => {
    expect(
      toggleEquipmentProfileItem(
        ['specialty_bars', 'future_station'],
        'specialty_bar',
      ),
    ).toEqual(['future_station'])
    expect(
      toggleEquipmentProfileItem(['future_station'], 'box'),
    ).toEqual(['future_station', 'box'])
  })

  it('counts only canonical UI selections after alias normalization', () => {
    expect(
      countSelectedEquipmentProfileOptions([
        'specialty_bars',
        'blocks',
        'future_station',
      ]),
    ).toBe(2)
  })
})
