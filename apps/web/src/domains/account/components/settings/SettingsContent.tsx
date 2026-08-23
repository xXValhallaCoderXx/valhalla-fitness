import { Badge, Button, Select } from '@mantine/core'
import { Scale } from 'lucide-react'
import type { RequiredEquipment } from '@sheetless/domain/movement/types'
import { Caption, PageHeader, Panel, SectionLabel, Text } from '~/components'
import type { Sex, ThemePreference } from '~/domains/account'
import type { ProgramStateDefaults, Unit } from '~/shared/types'
import { AccountSection } from './AccountSection'
import { BodyweightLogger } from './BodyweightLogger'
import { DataSyncSection } from './DataSyncSection'
import { EquipmentSection } from './EquipmentSection'
import { PreferencesSection } from './PreferencesSection'
import { SettingsSection } from './SettingsSection'
import { SettingsSidebar } from './SettingsSidebar'
import { StrengthEstimatesSection } from './StrengthEstimatesSection'

export type SettingsValues = {
  units: Unit
  rounding: number
  equipmentProfile: string[]
  sex: Sex | null
  themePreference: ThemePreference
  programStateDefaults: ProgramStateDefaults
  autoStartTimer: boolean
  defaultRestSeconds: number
}

export type SettingsActions = {
  onThemeChange: (theme: ThemePreference) => void
  onUnitsChange: (units: Unit) => void
  onRoundingChange: (rounding: number) => void
  onAutoStartTimerChange: (autoStart: boolean) => void
  onDefaultRestSecondsChange: (seconds: number) => void
  onSexChange: (sex: Sex | null) => void
  onUpdateDefault: (key: string, value: number | null) => void
  onOpenCalculator: () => void
  onToggleEquipment: (item: RequiredEquipment) => void
  onDiscard: () => void
  onSave: () => void
}

export function SettingsContent({
  values,
  actions,
  activeSection,
  activeSessionId,
  email,
  hasPendingChanges,
  isSaving,
}: {
  values: SettingsValues
  actions: SettingsActions
  activeSection: string
  activeSessionId: string | null
  email: string
  hasPendingChanges: boolean
  isSaving: boolean
}) {
  return (
    <>
      <PageHeader title="Settings" eyebrow="Account" actions={<Badge color="action">Online only</Badge>}>
        Programme defaults, equipment profile, and sync preferences.
      </PageHeader>

      {hasPendingChanges ? (
        <Panel
          className="sticky top-0 z-30 mb-4"
          p="sm"
          style={{
            borderColor: 'var(--vf-warning-border)',
            backgroundImage: 'linear-gradient(var(--vf-warning-soft), var(--vf-warning-soft))',
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text size="sm" fw={900}>Unsaved changes</Text>
              <Caption mt={2}>Your preferences are previewing locally. Save them to keep this setup.</Caption>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Button variant="default" disabled={isSaving} onClick={actions.onDiscard}>
                Discard
              </Button>
              <Button disabled={isSaving} onClick={actions.onSave}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
        <SettingsSidebar active={activeSection} />

        <div className="space-y-8">
          <PreferencesSection
            themePreference={values.themePreference}
            units={values.units}
            rounding={values.rounding}
            autoStartTimer={values.autoStartTimer}
            defaultRestSeconds={values.defaultRestSeconds}
            onThemeChange={actions.onThemeChange}
            onUnitsChange={actions.onUnitsChange}
            onRoundingChange={actions.onRoundingChange}
            onAutoStartTimerChange={actions.onAutoStartTimerChange}
            onDefaultRestSecondsChange={actions.onDefaultRestSecondsChange}
          />

          <SettingsSection
            id="body-strength"
            icon={Scale}
            title="Body & Strength Score"
            description="Bodyweight and sex feed the DOTS relative-strength score on the Insights page."
          >
            <Panel p="md">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-1.5">
                  <SectionLabel>Sex</SectionLabel>
                  <Select
                    aria-label="Sex"
                    placeholder="Prefer not to say"
                    data={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                    ]}
                    value={values.sex}
                    onChange={(value) => actions.onSexChange((value as Sex | null) ?? null)}
                    clearable
                  />
                  <Caption mt={1} lh={1.4}>
                    Only used for DOTS relative-strength scoring on the Insights page.
                  </Caption>
                </div>
                <BodyweightLogger units={values.units} />
              </div>
            </Panel>
          </SettingsSection>

          <StrengthEstimatesSection
            programStateDefaults={values.programStateDefaults}
            units={values.units}
            onUpdateDefault={actions.onUpdateDefault}
            onOpenCalculator={actions.onOpenCalculator}
          />
          <EquipmentSection equipmentProfile={values.equipmentProfile} onToggle={actions.onToggleEquipment} />
          <DataSyncSection activeSessionId={activeSessionId} />
          <AccountSection email={email} />
        </div>
      </div>
    </>
  )
}
