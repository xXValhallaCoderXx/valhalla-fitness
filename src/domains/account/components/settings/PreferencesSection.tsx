import { SegmentedControl } from '@mantine/core'
import { Monitor, Moon, SlidersHorizontal, Sun } from 'lucide-react'
import { Caption, Panel, SectionLabel } from '~/components'
import type { ThemePreference, Unit } from '~/shared/types'
import { SettingsSection } from './SettingsSection'

const themeOptions: Array<{
  value: ThemePreference
  label: string
  description: string
  icon: typeof Monitor
}> = [
  { value: 'system', label: 'System', description: 'Follow your OS preference.', icon: Monitor },
  { value: 'dark', label: 'Dark', description: 'Keep the gym-friendly dark UI.', icon: Moon },
  { value: 'light', label: 'Light', description: 'Use the brighter desktop-style UI.', icon: Sun },
]

const roundingOptions = [
  { value: '1.25', label: '1.25' },
  { value: '2.5', label: '2.5' },
  { value: '5', label: '5' },
]

export function PreferencesSection({
  themePreference,
  units,
  rounding,
  onThemeChange,
  onUnitsChange,
  onRoundingChange,
}: {
  themePreference: ThemePreference
  units: Unit
  rounding: number
  onThemeChange: (theme: ThemePreference) => void
  onUnitsChange: (units: Unit) => void
  onRoundingChange: (rounding: number) => void
}) {
  return (
    <SettingsSection
      id="preferences"
      icon={SlidersHorizontal}
      title="Preferences"
      description="Units and rounding are reused when you start a new programme."
    >
      <Panel p="md">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-1.5">
            <SectionLabel>Theme</SectionLabel>
            <SegmentedControl
              fullWidth
              value={themePreference}
              onChange={(value) => onThemeChange(value as ThemePreference)}
              data={themeOptions.map((option) => {
                const Icon = option.icon
                return {
                  value: option.value,
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={14} />
                      {option.label}
                    </span>
                  ),
                }
              })}
            />
            <Caption mt={1}>{themeOptions.find((option) => option.value === themePreference)?.description}</Caption>
          </div>
          <div className="grid grid-cols-2 content-start gap-3">
            <div className="grid content-start gap-1.5">
              <SectionLabel>Units</SectionLabel>
              <SegmentedControl
                fullWidth
                value={units}
                onChange={(value) => onUnitsChange(value as Unit)}
                data={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
              />
            </div>
            <div className="grid content-start gap-1.5">
              <SectionLabel>Round</SectionLabel>
              <SegmentedControl
                fullWidth
                value={String(rounding)}
                onChange={(value) => onRoundingChange(Number(value))}
                data={roundingOptions}
              />
            </div>
          </div>
        </div>
      </Panel>
    </SettingsSection>
  )
}
