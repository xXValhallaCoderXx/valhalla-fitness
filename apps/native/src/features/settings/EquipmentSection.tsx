import { View } from 'react-native'
import {
  countSelectedEquipmentProfileOptions,
  EQUIPMENT_PROFILE_OPTIONS,
  normalizeEquipmentProfile,
} from '@sheetless/domain/account/equipment-profile'
import type { RequiredEquipment } from '@sheetless/domain/movement/types'
import { formatEquipmentLabel } from '@sheetless/domain/account/settings-form'
import { Badge, Button, Caption, Panel, SectionLabel } from '@/components'
import { spacing } from '@/lib/tokens'
import { SettingsSection } from './SettingsSection'

export function EquipmentSection({
  equipmentProfile,
  disabled,
  onToggle,
}: {
  equipmentProfile: string[]
  disabled: boolean
  onToggle: (item: RequiredEquipment) => void
}) {
  const normalizedProfile = normalizeEquipmentProfile(equipmentProfile)
  const selectedCount = countSelectedEquipmentProfileOptions(normalizedProfile)
  const additionalCount = normalizedProfile.length - selectedCount

  return (
    <SettingsSection
      title="Equipment Profile"
      description="Choose the equipment available to you for equipment-aware movement choices."
    >
      <Panel style={{ gap: spacing.md, padding: spacing.md }}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            justifyContent: 'space-between',
          }}
        >
          <SectionLabel>Available equipment</SectionLabel>
          <Badge tone="action">
            {selectedCount} of {EQUIPMENT_PROFILE_OPTIONS.length}
          </Badge>
        </View>
        <Caption>
          An empty profile allows all equipment. Changes apply when you save.
          {additionalCount
            ? ` ${additionalCount} additional saved ${additionalCount === 1 ? 'item is' : 'items are'} preserved.`
            : ''}
        </Caption>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {EQUIPMENT_PROFILE_OPTIONS.map((item) => {
            const selected = normalizedProfile.includes(item)
            return (
              <Button
                key={item}
                label={formatEquipmentLabel(item)}
                selected={selected}
                variant={selected ? 'filled' : 'default'}
                disabled={disabled}
                style={{ flexBasis: '47%', flexGrow: 1, paddingHorizontal: spacing.xs }}
                onPress={() => onToggle(item)}
                testID={`settings-equipment-${item}`}
              />
            )
          })}
        </View>
      </Panel>
    </SettingsSection>
  )
}
