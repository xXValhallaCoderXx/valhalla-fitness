import { Badge } from '@mantine/core'
import { Check, Dumbbell } from 'lucide-react'
import {
  countSelectedEquipmentProfileOptions,
  EQUIPMENT_PROFILE_OPTIONS,
  normalizeEquipmentProfile,
} from '@sheetless/domain/account/equipment-profile'
import type { RequiredEquipment } from '@sheetless/domain/movement/types'
import { Panel, Text } from '~/components'
import { formatEquipmentLabel } from '~/domains/account/lib/settings-form'
import { SettingsSection } from './SettingsSection'

export function EquipmentSection({
  equipmentProfile,
  onToggle,
}: {
  equipmentProfile: string[]
  onToggle: (item: RequiredEquipment) => void
}) {
  const normalizedProfile = normalizeEquipmentProfile(equipmentProfile)
  const selectedCount = countSelectedEquipmentProfileOptions(normalizedProfile)
  const additionalCount = normalizedProfile.length - selectedCount
  return (
    <SettingsSection
      id="equipment"
      icon={Dumbbell}
      title="Equipment Profile"
      description="Choose the equipment available to you for equipment-aware movement choices."
      actions={
        <Badge color="action" variant="light">
          {selectedCount} of {EQUIPMENT_PROFILE_OPTIONS.length} selected
        </Badge>
      }
    >
      <Panel p="md">
        <Text size="xs" tone="dimmed" mb="sm">
          An empty profile allows all equipment.
          {additionalCount
            ? ` ${additionalCount} additional saved ${additionalCount === 1 ? 'item is' : 'items are'} preserved.`
            : ''}
        </Text>
        <div className="grid grid-cols-2 gap-2 md:[grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
          {EQUIPMENT_PROFILE_OPTIONS.map((item) => {
            const selected = normalizedProfile.includes(item)
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
