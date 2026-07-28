import { Badge, Button } from '@mantine/core'
import { Trash2 } from 'lucide-react'
import { Caption, Panel, Text } from '~/components'
import { getMovementName } from '~/domains/movement/lib/movements'
import type { AccessoryAdditionDraft } from '~/domains/program/lib/template-start-utils'
import type {
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramSetupPreviewSession,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
} from '~/domains/program'
import type { Unit } from '~/shared/types'
import { TemplateStartAccessoryForm } from './TemplateStartAccessoryForm'
import { TemplateStartMovementRow } from './TemplateStartMovementRow'

export function TemplateStartDayCard({
  session,
  units,
  setupOptions,
  movementOverrides,
  accessoryAdditions,
  changedSlots,
  onMovementOverrideChange,
  onAddAccessory,
  onRemoveAccessory,
}: {
  session: ProgramSetupPreviewSession
  units: Unit
  setupOptions: ProgramSetupOptions
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  changedSlots: Set<string>
  onMovementOverrideChange: (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => void
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
  onRemoveAccessory: (clientId: string) => void
}) {
  const setupSession = setupOptions.sessions.find((item) => item.id === session.id)
  const sessionAdditions = accessoryAdditions.filter((addition) => addition.sessionId === session.id)

  return (
    <Panel p={0}>
      <div className="border-b p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="neutral">{session.label}</Badge>
              <Text size="sm" fw={800}>{session.title}</Text>
            </div>
            <Caption mt={4}>{session.movementSummary}</Caption>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Caption fw={700}>{session.estimatedMinutes} min</Caption>
          </div>
        </div>
      </div>

      <div className="grid gap-1.5 p-2 sm:p-3">
        {session.movements.map((movement) => (
          <TemplateStartMovementRow
            key={`${movement.slotId}-${movement.phaseKey}`}
            movement={movement}
            movementOverrides={movementOverrides}
            editable
            phaseChanged={changedSlots.has(movement.slotId)}
            onMovementOverrideChange={onMovementOverrideChange}
          />
        ))}

        {sessionAdditions.map((addition) => {
          const source = setupSession?.accessoryPrescriptions.find((item) => item.sourceSlotId === addition.sourceSlotId)
          return (
            <Panel
              key={addition.clientId}
              surface="inset"
              p="xs"
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              style={{
                borderColor: 'var(--vf-action-border)',
                backgroundColor: 'var(--vf-action-soft)',
              }}
            >
              <div className="min-w-0">
                <Badge color="action" size="xs">Added accessory</Badge>
                <Text mt={4} size="sm" fw={800} truncate>{getMovementName(addition.movementId)}</Text>
                <Caption truncate>
                  {source?.targetSummary ?? 'Accessory work'} - {units}
                </Caption>
              </div>
              <Button color="danger" variant="light" onClick={() => onRemoveAccessory(addition.clientId)}>
                <Trash2 size={14} />
                Remove
              </Button>
            </Panel>
          )
        })}

        {setupSession?.accessoryPrescriptions.length ? (
          <TemplateStartAccessoryForm
            setupSession={setupSession}
            setupOptions={setupOptions}
            onAddAccessory={onAddAccessory}
          />
        ) : null}
      </div>
    </Panel>
  )
}
