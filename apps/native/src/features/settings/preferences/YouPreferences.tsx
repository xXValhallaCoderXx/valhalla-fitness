import { View } from 'react-native'
import { Caption, Panel, SectionLabel, SegmentedControl } from '@/components'
import { spacing } from '@/lib/tokens'
import { useSheetlessTheme } from '@/lib/theme-provider'
import type { useSettingsEditor } from '../useSettingsEditor'

export function YouPreferences({ editor }: { editor: ReturnType<typeof useSettingsEditor> }) {
  const { draft, saving, changeTheme } = editor
  const { effectiveScheme, previewPreference } = useSheetlessTheme()
  return <Panel style={{ padding: spacing.md, gap: spacing.lg }}>
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Detail level</SectionLabel>
      <SegmentedControl variant="segments" accessibilityRole="radiogroup" accessibilityLabel="Detail level" value={draft.values.experienceMode}
        options={[{ value: 'guided', label: 'Simple' }, { value: 'full', label: 'Advanced' }]}
        onChange={draft.setExperienceMode} disabled={saving} />
      <Caption>Simple keeps your next action in focus. Advanced shows more training detail. Both use the same workouts and calculations.</Caption>
    </View>
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Units</SectionLabel>
      <SegmentedControl variant="segments" accessibilityRole="radiogroup" accessibilityLabel="Units" value={draft.values.units}
        options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
        onChange={draft.setUnits} disabled={saving} />
      <Caption>Saving converts your starting numbers. Your current plan keeps its own units and loads.</Caption>
    </View>
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Appearance</SectionLabel>
      <SegmentedControl variant="segments" accessibilityRole="radiogroup" accessibilityLabel="Appearance" value={draft.values.themePreference}
        options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
        onChange={changeTheme} disabled={saving} />
      <Caption>{previewPreference ? 'Previewing until you save.' : draft.values.themePreference === 'system'
        ? `Following this device · ${effectiveScheme} right now` : 'Using your saved appearance.'}</Caption>
    </View>
  </Panel>
}
