import { Pressable, View } from 'react-native'
import type { ProgramEquipmentMode } from '@sheetless/domain/program/types'
import { Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

const options = [
  { value: 'free_weight', title: 'Free weights only',
    detail: 'Cable and machine movements are replaced with a barbell, dumbbell or bodyweight equivalent before they reach you.' },
  { value: 'standard', title: 'All equipment',
    detail: 'Movements arrive as the plan’s author wrote them, cables and machines included.' },
] as const

/** These stacked, descriptive radio cards follow the equipment reference board. */
export function EquipmentModeOptions({ value, disabled, onChange }: {
  value: ProgramEquipmentMode
  disabled: boolean
  onChange: (mode: ProgramEquipmentMode) => void
}) {
  const { theme } = useTokens()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="This plan’s equipment" style={{ gap: spacing.sm }}>
      {options.map((option) => {
        const selected = value === option.value
        return <Pressable key={option.value} accessibilityRole="radio"
          accessibilityLabel={`${option.title}. ${option.detail}`}
          accessibilityState={{ checked: selected, disabled }} disabled={disabled}
          onPress={() => onChange(option.value)} testID={`plan-equipment-${option.value}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start',
            gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg,
            borderWidth: selected ? 2 : 1, borderColor: selected ? theme.primaryFill : theme.border,
            backgroundColor: theme.surface, opacity: disabled ? 0.55 : pressed ? 0.8 : 1 })}>
          <View accessible={false} style={{ width: 20, height: 20, borderRadius: 10, marginTop: 2,
            borderWidth: 1, borderColor: selected ? theme.primaryFill : theme.textMuted,
            alignItems: 'center', justifyContent: 'center' }}>
            {selected ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.primaryFill }} /> : null}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text size="lg" weight={800}>{option.title}</Text>
            <Text size="sm" tone="dimmed">{option.detail}</Text>
          </View>
        </Pressable>
      })}
    </View>
  )
}
