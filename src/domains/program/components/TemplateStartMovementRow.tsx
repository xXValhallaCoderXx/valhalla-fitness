import { Badge, Button } from '@mantine/core'
import { ArrowLeftRight, ArrowUp, Lock, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Caption, Panel, Text } from '~/components'
import {
  getMovementName,
  isFreeWeightMovement,
  movementCatalog,
} from '~/domains/movement/lib/movements'
import { isSetupConfigurableRole } from '~/domains/program/lib/template-start-utils'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
  ProgramSetupPreviewMovement,
  ProgramStartMovementOverrideInput,
} from '~/domains/program'

export function TemplateStartMovementRow({
  movement,
  movementOverrides,
  equipmentMode,
  freeWeightChoices,
  editable = false,
  phaseChanged = false,
  onMovementOverrideChange,
}: {
  movement: ProgramSetupPreviewMovement
  movementOverrides: ProgramStartMovementOverrideInput[]
  equipmentMode: ProgramEquipmentMode
  freeWeightChoices: FreeWeightChoiceDraft[]
  editable?: boolean
  phaseChanged?: boolean
  onMovementOverrideChange: (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => void
}) {
  const override = movementOverrides.find(
    (item) => item.slotId === movement.slotId && item.phaseKey === movement.setupPhaseKey && item.role === movement.role,
  )
  const sourceMovementId =
    override?.replacementMovementId ?? movement.defaultMovementId
  const modeChoice =
    equipmentMode === 'free_weight'
      ? freeWeightChoices.find(
          (choice) =>
            choice.slotId === movement.slotId &&
            choice.phaseKey === movement.phaseKey &&
            choice.role === movement.role &&
            choice.sourceMovementId === sourceMovementId,
        )
      : undefined
  const selectedMovementId =
    modeChoice?.replacementMovementId ?? sourceMovementId
  const selectedMovementName = selectedMovementId === movement.defaultMovementId
    ? movement.defaultMovementName
    : getMovementName(selectedMovementId)
  const replacementOptions =
    equipmentMode === 'free_weight'
      ? movement.replacementOptions.filter(
          (option) => option.freeWeightCompatible,
        )
      : movement.replacementOptions
  const canSwap =
    isSetupConfigurableRole(movement.role) && replacementOptions.length > 0
  const changed = Boolean(override)
  const [swapOpen, setSwapOpen] = useState(false)

  return (
    <Panel
      surface="inset"
      px="xs"
      py={8}
      style={{
        borderColor: changed ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)',
        backgroundColor: changed ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={movement.role === 'main' ? 'neutral' : movement.role === 'variation' ? 'action' : 'success'} size="xs">
              {movement.roleLabel}
            </Badge>
            {phaseChanged ? (
              <Badge color="action" size="xs" leftSection={<ArrowUp size={10} />}>Updated</Badge>
            ) : null}
            {changed ? <Badge color="warning" size="xs">Changed</Badge> : null}
            {modeChoice ? (
              <Badge color="action" size="xs">
                Free-weight swap
              </Badge>
            ) : null}
          </div>
          <Text mt={2} size="sm" fw={800} truncate>{selectedMovementName}</Text>
          {changed ? (
            <Caption size="0.625rem" truncate>Default: {movement.defaultMovementName}</Caption>
          ) : null}
          <Caption size="0.6875rem" truncate>{movement.targetSummary}</Caption>
        </div>

        {editable && canSwap ? (
          <button
            type="button"
            onClick={() => setSwapOpen((current) => !current)}
            aria-label={`Swap ${selectedMovementName}`}
            aria-expanded={swapOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition active:scale-95"
            style={{
              borderColor: swapOpen || changed ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)',
              backgroundColor: swapOpen || changed ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
            }}
          >
            <ArrowLeftRight size={16} color="var(--vf-action-text)" />
          </button>
        ) : canSwap ? (
          <Caption fw={700}>Customizable</Caption>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <Lock size={13} />
            <Caption fw={700}>Locked</Caption>
          </div>
        )}
      </div>

      {editable && canSwap && swapOpen ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="min-h-9 flex-1 rounded-md border px-2.5"
            style={{
              borderColor: 'var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-default)',
              fontSize: 'var(--mantine-font-size-sm)',
              fontWeight: 600,
            }}
            value={selectedMovementId}
            aria-label={`Choose a replacement for ${movement.defaultMovementName}`}
            onChange={(event) => onMovementOverrideChange(movement, event.target.value)}
          >
            {equipmentMode !== 'free_weight' ||
            (movement.defaultFreeWeightCompatible ??
              isFreeWeightMovement(
                movementCatalog[movement.defaultMovementId],
              )) ? (
              <option value={movement.defaultMovementId}>Default: {movement.defaultMovementName}</option>
            ) : null}
            {replacementOptions.map((option) => (
              <option key={option.movementId} value={option.movementId}>
                {option.movementName}
              </option>
            ))}
          </select>
          {changed ? (
            <Button
              variant="default"
              size="xs"
              className="shrink-0"
              onClick={() => onMovementOverrideChange(movement, movement.defaultMovementId)}
            >
              <RotateCcw size={14} />
              Reset
            </Button>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}
