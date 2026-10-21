import { Pressable, View } from 'react-native'
import { Check } from 'lucide-react-native'
import {
  countSelectedEquipmentProfileOptions,
  EQUIPMENT_PROFILE_OPTIONS,
  normalizeEquipmentProfile,
} from '@sheetless/domain/account/equipment-profile'
import type { RequiredEquipment } from '@sheetless/domain/movement/types'
import { formatEquipmentLabel } from '@sheetless/domain/account/settings-form'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function EquipmentSection({
  equipmentProfile,
  disabled,
  onToggle,
}: {
  equipmentProfile: string[]
  disabled: boolean
  onToggle: (item: RequiredEquipment) => void
}) {
  const { theme } = useTokens()
  const normalizedProfile = normalizeEquipmentProfile(equipmentProfile)
  const selectedCount = countSelectedEquipmentProfileOptions(normalizedProfile)
  const additionalCount = normalizedProfile.length - selectedCount

  return (
    <View style={{ gap: spacing.md }}>
      <Caption>Choose the equipment you can use. This helps filter supported movement choices and substitutes.</Caption>
      <Panel style={{ paddingHorizontal: spacing.md }}>
          {EQUIPMENT_PROFILE_OPTIONS.map((item) => {
            const selected = normalizedProfile.includes(item)
            return (
              <Pressable
                key={item}
                accessibilityRole="checkbox"
                accessibilityLabel={formatEquipmentLabel(item)}
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                style={({ pressed }) => ({ alignItems: 'center', flexDirection: 'row', gap: spacing.sm,
                  minHeight: 48, paddingVertical: spacing.sm, opacity: disabled ? 0.5 : pressed && !selected ? 0.7 : 1 })}
                onPress={() => onToggle(item)}
                testID={`settings-equipment-${item}`}
              >
                <View accessible={false} style={{ alignItems: 'center', justifyContent: 'center', width: 22,
                  height: 22, borderRadius: radii.xs, borderWidth: 1,
                  borderColor: selected ? theme.primaryFill : theme.border,
                  backgroundColor: selected ? theme.primaryFill : theme.surface }}>
                  {selected ? <Check size={16} color={theme.primaryFillText} /> : null}
                </View>
                <Text size="sm" weight={700} style={{ flex: 1 }}>{formatEquipmentLabel(item)}</Text>
              </Pressable>
            )
          })}
      </Panel>
      <Panel surface="inset" style={{ gap: spacing.xs, padding: spacing.md }}>
        <SectionLabel>{normalizedProfile.length ? `${selectedCount} of ${EQUIPMENT_PROFILE_OPTIONS.length} selected` : 'All equipment available'}</SectionLabel>
        <Caption>Leave your equipment profile empty to allow all equipment. Changes apply when you save.</Caption>
        {additionalCount ? <Caption>{additionalCount} additional saved {additionalCount === 1 ? 'item is' : 'items are'} preserved.</Caption> : null}
      </Panel>
    </View>
  )
}
