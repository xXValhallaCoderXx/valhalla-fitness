import { View } from 'react-native'
import { getMovementName } from '@sheetless/domain/movement/movements'
import type { MovementSwapOption } from '@sheetless/domain/movement/types'
import { programAccessoryAdditionSlotId } from '@sheetless/domain/program/program-accessory-slots'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramStartMovementOverrideInput,
} from '@sheetless/domain/program/types'
import type { AccessoryAdditionDraft } from '@sheetless/domain/program/template-start-utils'
import { Badge, Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { TemplateSetupMovementRow } from './TemplateSetupMovementRow'

export function TemplateSetupPreview({
  week,
  setup,
  movementOverrides,
  accessoryAdditions,
  equipmentMode,
  freeWeightChoices,
  equipmentProfile,
  disabled = false,
  onSwap,
  onReset,
  onAddAccessory,
  onRemoveAccessory,
}: {
  week: ProgramSetupOptions['previewWeeks'][number]
  setup: ProgramSetupOptions
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
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
  onAddAccessory: (session: ProgramSetupOptions['sessions'][number]) => void
  onRemoveAccessory: (clientId: string) => void
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ gap: 3 }}>
        <Heading order={2}>{week.label} · {week.phaseLabel}</Heading>
        <Caption>{week.subtitle}</Caption>
        <Text size="sm" tone="dimmed">{week.summary}</Text>
      </View>
      {week.sessions.map((session) => {
        const setupSession = setup.sessions.find((candidate) => candidate.id === session.id)
        const additions = accessoryAdditions.filter((addition) => addition.sessionId === session.id)
        return (
          <Panel key={session.id} style={{ gap: spacing.sm, padding: spacing.md }}>
            <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  <Badge>{session.label}</Badge>
                  <Text size="sm" weight={800}>{session.title}</Text>
                </View>
                <Caption>{session.movementSummary}</Caption>
              </View>
              <Caption>{session.estimatedMinutes} min</Caption>
            </View>

            {session.movements.map((movement) => (
              <TemplateSetupMovementRow
                key={`${movement.slotId}-${movement.phaseKey}`}
                movement={movement}
                movementOverrides={movementOverrides}
                equipmentMode={equipmentMode}
                freeWeightChoices={freeWeightChoices}
                equipmentProfile={equipmentProfile}
                disabled={disabled}
                onSwap={onSwap}
                onReset={onReset}
              />
            ))}

            {additions.map((addition, index) => {
              const slotId = programAccessoryAdditionSlotId(
                session.id,
                index + 1,
                addition.movementId,
              )
              const modeChoice = equipmentMode === 'free_weight'
                ? freeWeightChoices.find((choice) =>
                    choice.templateSessionId === session.id &&
                    choice.slotId === slotId &&
                    choice.phaseKey === week.phaseKey &&
                    choice.role === 'accessory' &&
                    choice.sourceMovementId === addition.movementId,
                  )
                : undefined
              const movementName = getMovementName(
                modeChoice?.replacementMovementId ?? addition.movementId,
              )
              const prescription = setupSession?.accessoryPrescriptions.find(
                (item) => item.sourceSlotId === addition.sourceSlotId,
              )
              return (
                <Panel key={addition.clientId} surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
                  <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
                    <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                        <Badge tone="success">Added</Badge>
                        {modeChoice ? <Badge tone="action">Free-weight swap</Badge> : null}
                      </View>
                      <Text size="sm" weight={800}>{movementName}</Text>
                      <Caption>{prescription?.targetSummary ?? 'Copied accessory prescription'}</Caption>
                    </View>
                    <Button
                      label="Remove"
                      variant="subtle"
                      tone="danger"
                      disabled={disabled}
                      style={{ minHeight: 44, paddingHorizontal: spacing.sm }}
                      accessibilityLabel={`Remove added ${movementName} from ${session.title}`}
                      onPress={() => onRemoveAccessory(addition.clientId)}
                    />
                  </View>
                </Panel>
              )
            })}

            {setupSession?.accessoryPrescriptions.length ? (
              <View style={{ gap: 3 }}>
                <Button
                  label="Add setup accessory"
                  variant="default"
                  disabled={disabled}
                  fullWidth
                  style={{ minHeight: 44 }}
                  accessibilityLabel={`Add a setup accessory to ${session.title}`}
                  onPress={() => onAddAccessory(setupSession)}
                />
                <Caption>Copies one of this day’s accessory prescriptions across every phase.</Caption>
              </View>
            ) : null}
          </Panel>
        )
      })}
      <Panel surface="inset" style={{ gap: 3, padding: spacing.sm }}>
        <SectionLabel>Setup behavior</SectionLabel>
        <Caption>Manual changes affect this programme only. Completed history is never rewritten.</Caption>
      </Panel>
    </View>
  )
}
