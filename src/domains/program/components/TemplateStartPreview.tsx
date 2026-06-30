import { Badge, Button } from '@mantine/core'
import { ArrowLeftRight, ArrowUp, Plus, RotateCcw, Trash2, Lock } from 'lucide-react'
import { useState } from 'react'
import { Caption, EmptyState, Panel, SectionLabel, Text } from '~/components'
import { getMovementName } from '~/domains/movement/lib/movements'
import {
  isSetupConfigurableRole,
  weekOptionHeading,
  type AccessoryAdditionDraft,
  type WeekPreviewOption,
} from '~/domains/program/lib/template-start-utils'
import type { TemplatePhase, TemplateStructureMode } from '~/domains/program/lib/template-start-phases'
import type {
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramSetupPreviewSession,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  Unit,
} from '~/shared/types'

export function TemplateStartPreview({
  activeWeek,
  activeWeekOption,
  weekOptions,
  mode,
  phases,
  activePhaseKey,
  changedSlots,
  units,
  setupOptions,
  movementOverrides,
  accessoryAdditions,
  onWeekChange,
  onMovementOverrideChange,
  onAddAccessory,
  onRemoveAccessory,
}: {
  activeWeek: ProgramSetupOptions['previewWeeks'][number] | undefined
  activeWeekOption: WeekPreviewOption | undefined
  weekOptions: WeekPreviewOption[]
  mode: TemplateStructureMode
  phases: TemplatePhase[]
  activePhaseKey: string
  changedSlots: Set<string>
  units: Unit
  setupOptions: ProgramSetupOptions
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  onWeekChange: (weekIndex: number) => void
  onMovementOverrideChange: (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => void
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
  onRemoveAccessory: (clientId: string) => void
}) {
  if (!activeWeek) {
    return <EmptyState title="No preview available">This programme does not have a setup preview yet.</EmptyState>
  }

  const activePhase = phases.find((phase) => phase.phaseKey === activePhaseKey)
  const planTitle = mode === 'phased' && activePhase ? activePhase.phaseLabel : weekOptionHeading(activeWeekOption)

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <SectionLabel>Week plan</SectionLabel>
          <Text mt={4} size="lg" fw={800}>{planTitle}</Text>
          <Text mt={4} size="sm" tone="dimmed" className="max-w-3xl">{activeWeek.summary}</Text>
          {mode !== 'phased' && activeWeekOption?.detail ? (
            <Caption mt={4} fw={600}>{activeWeekOption.detail}</Caption>
          ) : null}
        </div>
        {mode === 'phased' && phases.length > 1 ? (
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar sm:pb-0">
            {phases.map((phase) => (
              <Button
                key={phase.phaseKey}
                size="xs"
                variant={phase.phaseKey === activePhaseKey ? 'filled' : 'default'}
                className="shrink-0"
                onClick={() => onWeekChange(phase.firstWeekIndex)}
              >
                {phase.phaseLabel.replace(/\s+phase$/i, '')}
              </Button>
            ))}
          </div>
        ) : mode === 'cycle' && weekOptions.length > 1 ? (
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar sm:pb-0">
            {weekOptions.map((option) => (
              <Button
                key={option.key}
                size="xs"
                variant={option.week.index === activeWeek.index ? 'filled' : 'default'}
                className="shrink-0"
                onClick={() => onWeekChange(option.week.index)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        {activeWeek.sessions.map((session) => (
          <ProgramDayCard
            key={`${activeWeek.index}-${session.id}`}
            session={session}
            units={units}
            setupOptions={setupOptions}
            movementOverrides={movementOverrides}
            accessoryAdditions={accessoryAdditions}
            changedSlots={changedSlots}
            onMovementOverrideChange={onMovementOverrideChange}
            onAddAccessory={onAddAccessory}
            onRemoveAccessory={onRemoveAccessory}
          />
        ))}
      </div>
    </section>
  )
}

function ProgramDayCard({
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
          <MovementPreviewRow
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
          <DayAccessoryAddForm
            setupSession={setupSession}
            setupOptions={setupOptions}
            onAddAccessory={onAddAccessory}
          />
        ) : null}
      </div>
    </Panel>
  )
}

function MovementPreviewRow({
  movement,
  movementOverrides,
  editable = false,
  phaseChanged = false,
  onMovementOverrideChange,
}: {
  movement: ProgramSetupPreviewMovement
  movementOverrides: ProgramStartMovementOverrideInput[]
  editable?: boolean
  phaseChanged?: boolean
  onMovementOverrideChange: (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => void
}) {
  const override = movementOverrides.find(
    (item) => item.slotId === movement.slotId && item.phaseKey === movement.setupPhaseKey && item.role === movement.role,
  )
  const selectedMovementId = override?.replacementMovementId ?? movement.defaultMovementId
  const selectedMovementName = selectedMovementId === movement.defaultMovementId
    ? movement.defaultMovementName
    : getMovementName(selectedMovementId)
  const canSwap = isSetupConfigurableRole(movement.role) && movement.replacementOptions.length > 0
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
            <option value={movement.defaultMovementId}>Default: {movement.defaultMovementName}</option>
            {movement.replacementOptions.map((option) => (
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

function DayAccessoryAddForm({
  setupSession,
  setupOptions,
  onAddAccessory,
}: {
  setupSession: ProgramSetupOptions['sessions'][number]
  setupOptions: ProgramSetupOptions
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
}) {
  const [open, setOpen] = useState(false)
  const [sourceSlotId, setSourceSlotId] = useState(setupSession.accessoryPrescriptions[0]?.sourceSlotId ?? '')
  const [movementId, setMovementId] = useState(setupOptions.accessoryCatalog[0]?.movementId ?? '')
  const effectiveSourceSlotId = setupSession.accessoryPrescriptions.some((item) => item.sourceSlotId === sourceSlotId)
    ? sourceSlotId
    : setupSession.accessoryPrescriptions[0]?.sourceSlotId ?? ''
  const canAdd = Boolean(effectiveSourceSlotId && movementId)

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
              value={movementId}
              onChange={(event) => setMovementId(event.target.value)}
            >
              {setupOptions.accessoryCatalog.map((movement) => (
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
                movementId,
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
