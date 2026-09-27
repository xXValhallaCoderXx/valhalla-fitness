import type { User } from '@supabase/supabase-js'
import type { ThemePreference } from '@sheetless/domain/account/types'
import { View, type LayoutChangeEvent } from 'react-native'
import { BodyStrengthSection } from './profile/BodyStrengthSection'
import { EquipmentSection } from './preferences/EquipmentSection'
import { PreferencesSection } from './preferences/PreferencesSection'
import { StrengthEstimatesSection } from './profile/StrengthEstimatesSection'
import type { useSettingsDraft } from './useSettingsDraft'

export function TrainingSettings({ user, draft, effectiveScheme, previewPreference, controlsDisabled, changeTheme, onStartingNumbersLayout }: {
  user: User
  draft: ReturnType<typeof useSettingsDraft>
  effectiveScheme: 'light' | 'dark'
  previewPreference: ThemePreference | null
  controlsDisabled: boolean
  changeTheme: (theme: ThemePreference) => void
  onStartingNumbersLayout?: (event: LayoutChangeEvent) => void
}) {
  return <>
    <PreferencesSection
      experienceMode={draft.values.experienceMode}
      onExperienceModeChange={draft.setExperienceMode}
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

    <BodyStrengthSection
      user={user}
      units={draft.values.units}
      sex={draft.values.sex}
      settingsDisabled={controlsDisabled}
      onSexChange={draft.setSex}
    />

    <View onLayout={onStartingNumbersLayout}>
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

    <EquipmentSection
      equipmentProfile={draft.values.equipmentProfile}
      disabled={controlsDisabled}
      onToggle={draft.toggleEquipment}
    />
  </>
}
