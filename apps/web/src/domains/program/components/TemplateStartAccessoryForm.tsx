import { Button } from '@mantine/core'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Caption, SectionLabel, Text } from '~/components'
import type { ProgramSetupOptions, ProgramStartAccessoryAdditionInput } from '~/domains/program'
import type { ProgramEquipmentMode } from '~/domains/program'

export function TemplateStartAccessoryForm({
  setupSession,
  setupOptions,
  equipmentMode,
  onAddAccessory,
}: {
  setupSession: ProgramSetupOptions['sessions'][number]
  setupOptions: ProgramSetupOptions
  equipmentMode: ProgramEquipmentMode
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
}) {
  const [open, setOpen] = useState(false)
  const [sourceSlotId, setSourceSlotId] = useState(setupSession.accessoryPrescriptions[0]?.sourceSlotId ?? '')
  const availableMovements =
    equipmentMode === 'free_weight'
      ? setupOptions.accessoryCatalog.filter((movement) =>
          ['barbell', 'dumbbell', 'specialty_bar', 'bodyweight'].includes(
            movement.resistanceMode ?? '',
          ),
        )
      : setupOptions.accessoryCatalog
  const [movementId, setMovementId] = useState(
    availableMovements[0]?.movementId ?? '',
  )
  const effectiveMovementId = availableMovements.some(
    (movement) => movement.movementId === movementId,
  )
    ? movementId
    : availableMovements[0]?.movementId ?? ''
  const effectiveSourceSlotId = setupSession.accessoryPrescriptions.some((item) => item.sourceSlotId === sourceSlotId)
    ? sourceSlotId
    : setupSession.accessoryPrescriptions[0]?.sourceSlotId ?? ''
  const canAdd = Boolean(effectiveSourceSlotId && effectiveMovementId)

  return (
    <div
      className="rounded-md border border-dashed p-2.5"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default)',
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Text size="xs" fw={800}>Optional accessory</Text>
          <Caption mt={2}>Copy one of this day&apos;s accessory prescriptions.</Caption>
        </div>
        <Button variant="default" size="xs" onClick={() => setOpen((current) => !current)}>
          <Plus size={14} />
          Add accessory
        </Button>
      </div>

      {open ? (
        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-1">
            <SectionLabel component="span">Prescription</SectionLabel>
            <select
              className="min-h-9 rounded-md border px-2.5"
              style={{
                borderColor: 'var(--mantine-color-default-border)',
                backgroundColor: 'var(--vf-surface-2)',
                fontSize: 'var(--mantine-font-size-sm)',
              }}
              value={effectiveSourceSlotId}
              onChange={(event) => setSourceSlotId(event.target.value)}
            >
              {setupSession.accessoryPrescriptions.map((option) => (
                <option key={option.sourceSlotId} value={option.sourceSlotId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <SectionLabel component="span">Movement</SectionLabel>
            <select
              className="min-h-9 rounded-md border px-2.5"
              style={{
                borderColor: 'var(--mantine-color-default-border)',
                backgroundColor: 'var(--vf-surface-2)',
                fontSize: 'var(--mantine-font-size-sm)',
              }}
              value={effectiveMovementId}
              onChange={(event) => setMovementId(event.target.value)}
            >
              {availableMovements.map((movement) => (
                <option key={movement.movementId} value={movement.movementId}>
                  {movement.movementName}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="xs"
            disabled={!canAdd}
            onClick={() => {
              onAddAccessory({
                sessionId: setupSession.id,
                sourceSlotId: effectiveSourceSlotId,
                movementId: effectiveMovementId,
              })
              setOpen(false)
            }}
          >
            <Plus size={14} />
            Add
          </Button>
        </div>
      ) : null}
    </div>
  )
}
