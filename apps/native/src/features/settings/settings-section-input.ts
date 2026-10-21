import type { SettingsSectionInput } from '@sheetless/domain/account/schemas'
import { EQUIPMENT_PROFILE_OPTIONS } from '@sheetless/domain/account/equipment-profile'
import { oneRepMaxKeys, sameStringSet } from '@sheetless/domain/account/settings-form'
import type { useSettingsDraft } from './useSettingsDraft'

export type SettingsSection = SettingsSectionInput['section']

/** Only edits belonging to this page are sent; other profile fields are never snapshots. */
export function settingsSectionInput(section: SettingsSection, draft: ReturnType<typeof useSettingsDraft>): SettingsSectionInput | null {
  const { values: v, baseline: b } = draft
  if (section === 'you') {
    const changes = {
      ...(v.units !== b.units ? { units: v.units } : {}),
      ...(v.themePreference !== b.themePreference ? { themePreference: v.themePreference } : {}),
      ...(v.experienceMode !== b.experienceMode ? { experienceMode: v.experienceMode } : {}),
    }
    return Object.keys(changes).length ? { section, ...changes } : null
  }
  if (section === 'sex') return v.sex !== b.sex ? { section, sex: v.sex } : null
  if (section === 'equipment') return !sameStringSet(v.equipmentProfile, b.equipmentProfile)
    ? { section, equipmentProfile: EQUIPMENT_PROFILE_OPTIONS.filter(item => v.equipmentProfile.includes(item)) } : null
  if (section === 'workouts') {
    const changes = {
      ...(v.autoStartTimer !== b.autoStartTimer ? { autoStartTimer: v.autoStartTimer } : {}),
      ...(v.defaultRestSeconds !== b.defaultRestSeconds ? { defaultRestSeconds: v.defaultRestSeconds } : {}),
    }
    return Object.keys(changes).length ? { section, ...changes } : null
  }
  const changed = oneRepMaxKeys.filter(key => (draft.estimateInputs[key] ?? '') !== (b.programStateDefaults[key] == null ? '' : String(b.programStateDefaults[key])))
  if (!changed.length && v.rounding === b.rounding) return null
  return { section, inputUnits: v.units,
    programStateDefaults: Object.fromEntries(changed.map(key => [key, v.programStateDefaults[key] ?? null])),
    ...(v.rounding !== b.rounding ? { rounding: v.rounding } : {}),
  }
}
