import { Switch, View } from 'react-native'
import type { ThemePreference } from '@sheetless/domain/account/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, Panel, SectionLabel, SegmentedControl, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { SettingsSection } from './SettingsSection'

const MIN_REST_SECONDS = 30
const MAX_REST_SECONDS = 600
const REST_STEP_SECONDS = 30

export function PreferencesSection({
  themePreference,
  effectiveScheme,
  isThemePreviewing,
  units,
  rounding,
  autoStartTimer,
  defaultRestSeconds,
  disabled,
  onThemeChange,
  onUnitsChange,
  onRoundingChange,
  onAutoStartTimerChange,
  onDefaultRestSecondsChange,
}: {
  themePreference: ThemePreference
  effectiveScheme: 'light' | 'dark'
  isThemePreviewing: boolean
  units: Unit
  rounding: number
  autoStartTimer: boolean
  defaultRestSeconds: number
  disabled: boolean
  onThemeChange: (value: ThemePreference) => void
  onUnitsChange: (value: Unit) => void
  onRoundingChange: (value: number) => void
  onAutoStartTimerChange: (value: boolean) => void
  onDefaultRestSecondsChange: (value: number) => void
}) {
  const { theme } = useTokens()
  const changeRest = (delta: number) => {
    onDefaultRestSecondsChange(
      Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, defaultRestSeconds + delta)),
    )
  }

  return (
    <SettingsSection
      title="Preferences"
      description="Appearance, training units, rounding, and your default rest timer."
    >
      <Panel style={{ gap: spacing.lg, padding: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <SectionLabel>Theme</SectionLabel>
          <ChoiceRow
            values={[
              { value: 'system', label: 'System' },
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
            selected={themePreference}
            disabled={disabled}
            onChange={(value) => onThemeChange(value as ThemePreference)}
            accessibilityLabel="Theme"
          />
          <Caption>
            {isThemePreviewing
              ? `Previewing the ${themePreference === 'system' ? effectiveScheme : themePreference} appearance until you save.`
              : themePreference === 'system'
              ? `Following this device · ${effectiveScheme} right now`
              : `Using the ${themePreference} appearance.`}
          </Caption>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <SectionLabel>Units</SectionLabel>
            <ChoiceRow
              values={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
              selected={units}
              disabled={disabled}
              onChange={(value) => onUnitsChange(value as Unit)}
              accessibilityLabel="Training units"
            />
          </View>
          <View style={{ flex: 1.6, gap: spacing.xs }}>
            <SectionLabel>Round to</SectionLabel>
            <ChoiceRow
              values={[
                { value: '1.25', label: '1.25' },
                { value: '2.5', label: '2.5' },
                { value: '5', label: '5' },
              ]}
              selected={String(rounding)}
              disabled={disabled}
              onChange={(value) => onRoundingChange(Number(value))}
              accessibilityLabel="Round loads to"
            />
          </View>
        </View>
        <Caption>
          Changing units converts and rounds saved programme estimates. Active programme loads stay unchanged.
        </Caption>

        <View
          style={{
            borderTopColor: theme.border,
            borderTopWidth: 1,
            gap: spacing.md,
            paddingTop: spacing.md,
          }}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: 2 }}>
              <SectionLabel>Rest timer</SectionLabel>
              <Text size="sm" weight={800}>Start automatically</Text>
              <Caption>Begin the countdown after each completed set.</Caption>
            </View>
            <Switch
              value={autoStartTimer}
              onValueChange={onAutoStartTimerChange}
              disabled={disabled}
              trackColor={{ false: theme.surfaceInset, true: theme.tones.action.border }}
              thumbColor={autoStartTimer ? theme.primaryFill : theme.textMuted}
              testID="settings-auto-rest"
            />
          </View>

          <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text size="sm" weight={800}>Default rest</Text>
                <Caption>30-second steps · 30 seconds to 10 minutes</Caption>
              </View>
              <Text weight={900}>{formatDuration(defaultRestSeconds)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="− 30 sec"
                variant="default"
                style={{ flex: 1 }}
                disabled={disabled || !autoStartTimer || defaultRestSeconds <= MIN_REST_SECONDS}
                onPress={() => changeRest(-REST_STEP_SECONDS)}
              />
              <Button
                label="+ 30 sec"
                variant="default"
                style={{ flex: 1 }}
                disabled={disabled || !autoStartTimer || defaultRestSeconds >= MAX_REST_SECONDS}
                onPress={() => changeRest(REST_STEP_SECONDS)}
              />
            </View>
          </Panel>
        </View>
      </Panel>
    </SettingsSection>
  )
}

function ChoiceRow({
  values,
  selected,
  disabled,
  onChange,
  accessibilityLabel,
}: {
  values: Array<{ value: string; label: string }>
  selected: string
  disabled: boolean
  onChange: (value: string) => void
  accessibilityLabel: string
}) {
  return (
    <SegmentedControl
      variant="segments"
      options={values.map((item) => ({
        value: item.value,
        label: item.label,
        testID: `settings-choice-${item.value}`,
      }))}
      value={selected}
      onChange={onChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    />
  )
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} sec`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes}m ${remaining}s` : `${minutes} min`
}
