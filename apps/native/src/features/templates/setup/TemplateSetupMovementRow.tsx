import { View } from 'react-native'
import { getMovementName } from '@sheetless/domain/movement/movements'
import type { MovementSwapOption } from '@sheetless/domain/movement/types'
import { isEquipmentProfileCompatible } from '@sheetless/domain/account/equipment-profile'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
  ProgramSetupPreviewMovement,
  ProgramStartMovementOverrideInput,
} from '@sheetless/domain/program/types'
import { Badge, Button, Caption, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TemplateSetupMovementRow({
  movement,
  movementOverrides,
  equipmentMode,
  freeWeightChoices,
  equipmentProfile,
  disabled = false,
  onSwap,
  onReset,
}: {
  movement: ProgramSetupPreviewMovement
  movementOverrides: ProgramStartMovementOverrideInput[]
  equipmentMode: ProgramEquipmentMode
  freeWeightChoices: FreeWeightChoiceDraft[]
  equipmentProfile: string[]
  disabled?: boolean
  onSwap: (
    movement: ProgramSetupPreviewMovement,
    options: MovementSwapOption[],
    selectedMovementId: string | null,
  ) => void
  onReset: (movement: ProgramSetupPreviewMovement) => void
}) {
  const { theme } = useTokens()
  const override = movementOverrides.find((item) =>
    item.slotId === movement.slotId &&
    item.phaseKey === movement.setupPhaseKey &&
    item.role === movement.role,
  )
  const sourceMovementId = override?.replacementMovementId ?? movement.defaultMovementId
  const modeChoice = equipmentMode === 'free_weight'
    ? freeWeightChoices.find((choice) =>
        choice.slotId === movement.slotId &&
        choice.phaseKey === movement.phaseKey &&
        choice.role === movement.role &&
        choice.sourceMovementId === sourceMovementId,
      )
    : undefined
  const selectedMovementId = modeChoice?.replacementMovementId ?? sourceMovementId
  const selectedMovementName = selectedMovementId === movement.defaultMovementId
    ? movement.defaultMovementName
    : getMovementName(selectedMovementId)
  const options = movement.replacementOptions.filter((option) =>
    (equipmentMode !== 'free_weight' || option.freeWeightCompatible) &&
    isEquipmentProfileCompatible(option.requiredEquipment, equipmentProfile),
  )
  const configurable = movement.role === 'variation' || movement.role === 'accessory'
  const canSwap = configurable && options.length > 0

  return (
    <Panel
      surface="inset"
      style={{
        borderColor: override ? theme.tones.action.border : theme.border,
        gap: spacing.sm,
        padding: spacing.sm,
      }}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <Badge tone={movement.role === 'main' ? 'accent' : 'neutral'}>{movement.roleLabel}</Badge>
            {override ? <Badge tone="warning">Changed</Badge> : null}
            {modeChoice ? <Badge tone="action">Free-weight swap</Badge> : null}
          </View>
          <Text size="sm" weight={800} numberOfLines={1}>{selectedMovementName}</Text>
          {override ? <Caption>Default: {movement.defaultMovementName}</Caption> : null}
          <Caption>{movement.targetSummary}</Caption>
        </View>
        {canSwap ? (
          <Button
            label={override ? 'Change' : 'Swap'}
            variant="default"
            disabled={disabled}
            style={{ minHeight: 44, paddingHorizontal: spacing.sm }}
            accessibilityLabel={`Choose a setup replacement for ${movement.defaultMovementName}`}
            onPress={() => onSwap(movement, options, override?.replacementMovementId ?? null)}
          />
        ) : (
          <Caption style={{ color: theme.textMuted }}>
            {configurable ? 'No matching alternatives' : 'Locked'}
          </Caption>
        )}
      </View>
      {override ? (
        <Button
          label="Reset to default"
          variant="subtle"
          disabled={disabled}
          style={{ minHeight: 44 }}
          accessibilityLabel={`Reset ${movement.defaultMovementName} to its programme default`}
          onPress={() => onReset(movement)}
        />
      ) : null}
    </Panel>
  )
}
