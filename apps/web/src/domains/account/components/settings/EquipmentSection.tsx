import { Badge } from '@mantine/core'
import { Check, Dumbbell } from 'lucide-react'
import { Panel, Text } from '~/components'
import { formatEquipmentLabel } from '~/domains/account/lib/settings-form'
import { SettingsSection } from './SettingsSection'

export const equipmentOptions = [
  'barbell',
  'plates',
  'rack',
  'bench',
  'dumbbells',
  'cable',
  'machine',
  'bodyweight',
  'specialty_bars',
]

export function EquipmentSection({
  equipmentProfile,
  onToggle,
}: {
  equipmentProfile: string[]
  onToggle: (item: string) => void
}) {
  return (
    <SettingsSection
      id="equipment"
      icon={Dumbbell}
      title="Equipment Profile"
      description="Select available equipment to filter alternatives."
      actions={
        <Badge color="action" variant="light">
          {equipmentProfile.length} of {equipmentOptions.length} selected
        </Badge>
      }
    >
      <Panel p="md">
        <div className="grid grid-cols-2 gap-2 md:[grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
          {equipmentOptions.map((item) => {
            const selected = equipmentProfile.includes(item)
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => onToggle(item)}
                className="flex items-center gap-3 rounded-[var(--mantine-radius-md)] px-3 py-2.5 text-left transition-colors"
                style={{
                  border: `1px solid ${selected ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
                  backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
                }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{
                    border: `1px solid ${selected ? 'var(--vf-action-text)' : 'var(--mantine-color-default-border)'}`,
                    backgroundColor: selected ? 'var(--vf-action-text)' : 'transparent',
                    color: 'var(--mantine-color-white)',
                  }}
                >
                  {selected ? <Check size={15} strokeWidth={3} /> : null}
                </span>
                <Text
                  component="span"
                  size="sm"
                  fw={700}
                  truncate
                  c={selected ? 'var(--vf-action-text)' : undefined}
                >
                  {formatEquipmentLabel(item)}
                </Text>
              </button>
            )
          })}
        </div>
      </Panel>
    </SettingsSection>
  )
}
