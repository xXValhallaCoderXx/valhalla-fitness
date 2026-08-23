import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { isEquipmentProfileCompatible } from '@sheetless/domain/account/equipment-profile'
import type {
  ProgramEquipmentMode,
  ProgramSetupOptions,
  ProgramStartAccessoryAdditionInput,
} from '@sheetless/domain/program/types'
import { Button, Caption, Panel, SectionLabel } from '@/components'
import {
  MovementPickerSheet,
  type MovementPickerOption,
} from '@/features/session/MovementPickerSheet'
import { spacing } from '@/lib/tokens'

type SetupSession = ProgramSetupOptions['sessions'][number]
type SetupAccessoryOption = ProgramSetupOptions['accessoryCatalog'][number] & MovementPickerOption

const freeWeightModes = new Set(['barbell', 'dumbbell', 'specialty_bar', 'bodyweight'])

export function TemplateAccessorySheet({
  open,
  setup,
  session,
  equipmentMode,
  equipmentProfile,
  disabled = false,
  onClose,
  onAdd,
}: {
  open: boolean
  setup: ProgramSetupOptions
  session: SetupSession | null
  equipmentMode: ProgramEquipmentMode
  equipmentProfile: string[]
  disabled?: boolean
  onClose: () => void
  onAdd: (addition: ProgramStartAccessoryAdditionInput) => void
}) {
  const [sourceSlotId, setSourceSlotId] = useState('')
  const [movementId, setMovementId] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    setSourceSlotId(session?.accessoryPrescriptions[0]?.sourceSlotId ?? '')
    setMovementId(null)
  }, [open, session])

  const options = useMemo(
    () => setup.accessoryCatalog.filter((movement) =>
      isEquipmentProfileCompatible(movement.requiredEquipment, equipmentProfile) &&
      (equipmentMode !== 'free_weight' || (
        typeof movement.resistanceMode === 'string' && freeWeightModes.has(movement.resistanceMode)
      )),
    ) as SetupAccessoryOption[],
    [equipmentMode, equipmentProfile, setup.accessoryCatalog],
  )
  const selectedSource = session?.accessoryPrescriptions.find(
    (item) => item.sourceSlotId === sourceSlotId,
  ) ?? session?.accessoryPrescriptions[0]

  return (
    <MovementPickerSheet
      open={open && Boolean(session)}
      title="Add setup accessory"
      subtitle="Copy a planned accessory prescription across every phase."
      confirmLabel="Add accessory"
      options={options}
      selectedMovementId={movementId}
      disabled={disabled}
      onSelectMovement={setMovementId}
      onClose={onClose}
      onConfirm={(movement) => {
        if (!session || !selectedSource) return
        onAdd({
          sessionId: session.id,
          sourceSlotId: selectedSource.sourceSlotId,
          movementId: movement.movementId,
        })
        onClose()
      }}
      searchPlaceholder="Search setup accessories"
      emptyMessage="No accessories match your saved equipment and mode."
      maxListHeight={620}
      header={session ? (
        <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
          <View style={{ gap: 3 }}>
            <SectionLabel>Prescription to copy</SectionLabel>
            <Caption>Sets, reps, and effort come from this planned slot on {session.title}.</Caption>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {session.accessoryPrescriptions.map((prescription) => {
              const selected = prescription.sourceSlotId === selectedSource?.sourceSlotId
              return (
                <Button
                  key={prescription.sourceSlotId}
                  label={prescription.label}
                  variant={selected ? 'filled' : 'default'}
                  selected={selected}
                  disabled={disabled}
                  style={{ minHeight: 44, paddingHorizontal: spacing.sm }}
                  onPress={() => setSourceSlotId(prescription.sourceSlotId)}
                />
              )
            })}
          </View>
          {equipmentProfile.length ? (
            <Caption>Optional choices are filtered by your Equipment Profile.</Caption>
          ) : (
            <Caption>No Equipment Profile is selected, so all compatible choices are shown.</Caption>
          )}
        </Panel>
      ) : undefined}
    />
  )
}
