import type { User } from '@supabase/supabase-js'
import { View } from 'react-native'
import type { ThemePreference } from '@sheetless/domain/account/types'
import { BodyStrengthSection } from './profile/BodyStrengthSection'
import { EquipmentSection } from './preferences/EquipmentSection'
import { PreferencesSection } from './preferences/PreferencesSection'
import { StrengthEstimatesSection } from './profile/StrengthEstimatesSection'
import type { useSettingsDraft } from './useSettingsDraft'
import type { SettingsCategory } from './SettingsMenu'

export function TrainingSettings({ category, user, draft, effectiveScheme, previewPreference, controlsDisabled, changeTheme }: {
  category: SettingsCategory | null
  user: User
  draft: ReturnType<typeof useSettingsDraft>
  effectiveScheme: 'light' | 'dark'
  previewPreference: ThemePreference | null
  controlsDisabled: boolean
  changeTheme: (theme: ThemePreference) => void
}) {
  return <>
    <View style={{ display: category === 'appearance' || category === 'workout' ? 'flex' : 'none' }}>
    <PreferencesSection
      section={category === 'workout' ? 'workout' : 'appearance'}
      themePreference={draft.values.themePreference}
      effectiveScheme={effectiveScheme}
      isThemePreviewing={previewPreference !== null}
      units={draft.values.units}
      rounding={draft.values.rounding}
      autoStartTimer={draft.values.autoStartTimer}
      defaultRestSeconds={draft.values.defaultRestSeconds}
      disabled={controlsDisabled}
      onThemeChange={changeTheme}
      onUnitsChange={draft.setUnits}
      onRoundingChange={draft.setRounding}
      onAutoStartTimerChange={draft.setAutoStartTimer}
      onDefaultRestSecondsChange={draft.setDefaultRestSeconds}
    />
    </View>

    <View style={{ display: category === 'body' ? 'flex' : 'none' }}>
    <BodyStrengthSection
      user={user}
      units={draft.values.units}
      sex={draft.values.sex}
      settingsDisabled={controlsDisabled}
      onSexChange={draft.setSex}
    />
    </View>

    <View style={{ display: category === 'strength' ? 'flex' : 'none' }}>
    <StrengthEstimatesSection
      programStateDefaults={draft.values.programStateDefaults}
      estimateInputs={draft.estimateInputs}
      estimateErrors={draft.estimateErrors}
      units={draft.values.units}
      rounding={draft.values.rounding}
      disabled={controlsDisabled}
      onInputChange={draft.setEstimateInput}
      onValueChange={draft.setEstimateValue}
    />
    </View>

    <View style={{ display: category === 'equipment' ? 'flex' : 'none' }}>
    <EquipmentSection
      equipmentProfile={draft.values.equipmentProfile}
      disabled={controlsDisabled}
      onToggle={draft.toggleEquipment}
    />
    </View>
  </>
}
