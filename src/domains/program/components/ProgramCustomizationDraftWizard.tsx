/* eslint-disable no-restricted-syntax -- Preserved dormant customization wizard; active template pages use Mantine-first extracted components. */
import { Badge, Button, Card, TextInput } from '@mantine/core'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { getMovementName } from '~/domains/movement/lib/movements'
import type {
  ProgramSetupOptions,
  ProgramSetupSlotOption,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  ProgramStateInput,
  ProgramTemplateSummary,
  Unit,
} from '~/shared/types'

type WizardStep = 'basics' | 'movements' | 'accessories' | 'review'

type AccessoryAdditionDraft = ProgramStartAccessoryAdditionInput & {
  clientId: string
}

export function ProgramCustomizationDraftWizard({
  titleId,
  template,
  setupOptions,
  isSetupLoading,
  setupError,
  units,
  rounding,
  stateValues,
  wizardStep,
  currentStepIndex,
  movementOverrides,
  accessoryAdditions,
  movementOverrideCount,
  accessoryAdditionCount,
  hasCustomizations,
  showCustomizationWarning,
  isPending,
  startError,
  onClose,
  onStateValuesChange,
  onStepChange,
  onMovementOverrideChange,
  onAddAccessory,
  onRemoveAccessory,
  onBack,
  onNext,
  onStart,
}: {
  titleId: string
  template: ProgramTemplateSummary
  setupOptions: ProgramSetupOptions | null
  isSetupLoading: boolean
  setupError: string | null
  units: Unit
  rounding: number
  stateValues: ProgramStateInput[]
  wizardStep: WizardStep
  currentStepIndex: number
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  movementOverrideCount: number
  accessoryAdditionCount: number
  hasCustomizations: boolean
  showCustomizationWarning: boolean
  isPending: boolean
  startError: string | null
  onClose: () => void
  onStateValuesChange: Dispatch<SetStateAction<ProgramStateInput[]>>
  onStepChange: (step: WizardStep) => void
  onMovementOverrideChange: (slot: ProgramSetupSlotOption, replacementMovementId: string) => void
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
  onRemoveAccessory: (clientId: string) => void
  onBack: () => void
  onNext: () => void
  onStart: () => void
}) {
  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: 'basics', label: 'Basics' },
    { id: 'movements', label: 'Movements' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'review', label: 'Review' },
  ]
  const isReview = wizardStep === 'review'
  const canMoveForward = wizardStep === 'basics' || Boolean(setupOptions)

  return (
    <Card className="max-h-[92vh] overflow-hidden p-0">
      <div className="border-b border-[var(--mantine-color-default-border)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="truncate text-lg font-bold">
                {template.name}
              </h2>
              {hasCustomizations ? <Badge color="warning">Customized</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
              Set starting loads, choose variations, and review accessory changes before starting.
            </p>
          </div>
          <Button color="neutral" variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={`min-h-9 rounded-md border px-2 text-xs font-bold transition ${
                wizardStep === step.id
                  ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-primary-color-filled)] text-white'
                  : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]'
              }`}
              onClick={() => onStepChange(step.id)}
              disabled={isPending || (index > 0 && !setupOptions && step.id !== 'basics')}
            >
              {step.label}
            </button>
          ))}
        </div>

        {showCustomizationWarning ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-3 text-sm text-[var(--vf-warning-text)]">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              This programme will be customized from the default coach template. The original template stays unchanged.
            </p>
          </div>
        ) : null}
      </div>

      <div className="max-h-[58vh] overflow-y-auto p-4">
        {wizardStep === 'basics' ? (
          <BasicsStep
            units={units}
            rounding={rounding}
            stateValues={stateValues}
            requiredState={stateValues}
            onStateValuesChange={onStateValuesChange}
          />
        ) : isSetupLoading ? (
          <p className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-4 text-sm text-[var(--mantine-color-dimmed)]">
            Loading programme setup options.
          </p>
        ) : setupError ? (
          <p className="rounded-lg border border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] p-4 text-sm text-[var(--vf-danger-text)]">
            {setupError}
          </p>
        ) : setupOptions && wizardStep === 'movements' ? (
          <MovementsStep
            setupOptions={setupOptions}
            movementOverrides={movementOverrides}
            onMovementOverrideChange={onMovementOverrideChange}
          />
        ) : setupOptions && wizardStep === 'accessories' ? (
          <AccessoriesStep
            setupOptions={setupOptions}
            accessoryAdditions={accessoryAdditions}
            onAddAccessory={onAddAccessory}
            onRemoveAccessory={onRemoveAccessory}
          />
        ) : setupOptions && wizardStep === 'review' ? (
          <ReviewStep
            setupOptions={setupOptions}
            units={units}
            rounding={rounding}
            stateValues={stateValues}
            movementOverrides={movementOverrides}
            accessoryAdditions={accessoryAdditions}
            movementOverrideCount={movementOverrideCount}
            accessoryAdditionCount={accessoryAdditionCount}
          />
        ) : null}
      </div>

      <div className="border-t border-[var(--mantine-color-default-border)] p-4">
        {startError ? (
          <p className="mb-3 rounded-lg border border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] p-3 text-sm text-[var(--vf-danger-text)]">
            {startError}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="default" disabled={isPending || currentStepIndex === 0} onClick={onBack}>
            <ChevronLeft size={14} />
            Back
          </Button>
          <div className="flex gap-2 sm:justify-end">
            {!isReview ? (
              <Button className="flex-1 sm:flex-none" disabled={isPending || !canMoveForward} onClick={onNext}>
                Next
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button className="flex-1 sm:flex-none" disabled={isPending} onClick={onStart}>
                <Check size={16} />
                Start program
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function BasicsStep({
  units,
  rounding,
  stateValues,
  requiredState,
  onStateValuesChange,
}: {
  units: Unit
  rounding: number
  stateValues: ProgramStateInput[]
  requiredState: ProgramTemplateSummary['requiredState']
  onStateValuesChange: Dispatch<SetStateAction<ProgramStateInput[]>>
}) {
  const visibleState = requiredState.length
    ? requiredState.map((required) => stateValues.find((state) => state.key === required.key)).filter(Boolean) as ProgramStateInput[]
    : []

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="vf-section-label">Programme defaults</p>
            <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
              New programmes use your saved preferences.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-[var(--mantine-color-text)]">
            <span className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2 py-1">
              {units}
            </span>
            <span className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2 py-1">
              Round {rounding}
            </span>
          </div>
        </div>
        <a
          href="/settings#preferences"
          className="mt-2 inline-flex text-xs font-bold text-[var(--mantine-primary-color-filled)] hover:underline"
        >
          Edit in Settings
        </a>
      </div>
      {requiredState.length ? (
        <div className="grid gap-2">
          <div>
            <p className="vf-section-label">Starting loads</p>
            <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
              Enter the training maxes or working loads used to calculate the first block.
            </p>
          </div>
          {visibleState.map((state) => (
            <label
              key={state.key}
              className="grid gap-3 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"
            >
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-[var(--mantine-color-text)]">{getMovementName(state.movementId)}</span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
                  {state.type.replaceAll('_', ' ')}
                </span>
              </span>
              <span className="relative block">
                <TextInput
                  classNames={{ input: 'pr-12 text-right' }}
                  type="number"
                  value={state.value ?? ''}
                  onChange={(event) =>
                    onStateValuesChange((current) =>
                      current.map((item) =>
                        item.key === state.key
                          ? { ...item, value: event.target.value === '' ? null : Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--mantine-color-dimmed)]">
                  {units}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="vf-section-label">No starting loads</p>
          <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
            This programme uses user-selected loads and history-only logging.
          </p>
        </div>
      )}
    </div>
  )
}

function MovementsStep({
  setupOptions,
  movementOverrides,
  onMovementOverrideChange,
}: {
  setupOptions: ProgramSetupOptions
  movementOverrides: ProgramStartMovementOverrideInput[]
  onMovementOverrideChange: (slot: ProgramSetupSlotOption, replacementMovementId: string) => void
}) {
  return (
    <div className="grid gap-4">
      <div>
        <p className="vf-section-label">Variations and accessories</p>
        <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
          Main lifts stay locked. Programme-level replacements apply from week 1.
        </p>
      </div>
      {setupOptions.sessions.map((session) => (
        <div key={session.id} className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-sm font-extrabold">{session.title}</p>
          <div className="mt-3 grid gap-2">
            {session.slots.length ? session.slots.map((slot) => {
              const selected = movementOverrides.find(
                (override) => override.slotId === slot.slotId && override.phaseKey === slot.phaseKey && override.role === slot.role,
              )
              const value = selected?.replacementMovementId ?? slot.defaultMovementId
              return (
                <div
                  key={`${slot.slotId}-${slot.phaseKey}`}
                  className="grid gap-2 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={slot.role === 'variation' ? 'action' : 'neutral'} size="xs">{slot.role}</Badge>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{slot.phaseLabel}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-bold">{slot.defaultMovementName}</p>
                    <p className="truncate text-[10px] text-[var(--mantine-color-dimmed)]">{slot.targetSummary}</p>
                  </div>
                  <select
                    className="min-h-10 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-3 text-sm"
                    value={value}
                    onChange={(event) => onMovementOverrideChange(slot, event.target.value)}
                  >
                    <option value={slot.defaultMovementId}>Use default</option>
                    {slot.replacementOptions.map((option) => (
                      <option key={option.movementId} value={option.movementId}>
                        {option.movementName}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="default"
                    disabled={value === slot.defaultMovementId}
                    onClick={() => onMovementOverrideChange(slot, slot.defaultMovementId)}
                  >
                    <RotateCcw size={14} />
                    Reset
                  </Button>
                </div>
              )
            }) : (
              <p className="text-sm text-[var(--mantine-color-dimmed)]">No configurable variation or accessory slots.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function AccessoriesStep({
  setupOptions,
  accessoryAdditions,
  onAddAccessory,
  onRemoveAccessory,
}: {
  setupOptions: ProgramSetupOptions
  accessoryAdditions: AccessoryAdditionDraft[]
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
  onRemoveAccessory: (clientId: string) => void
}) {
  const firstSession = setupOptions.sessions.find((session) => session.accessoryPrescriptions.length)
  const [sessionId, setSessionId] = useState(firstSession?.id ?? setupOptions.sessions[0]?.id ?? '')
  const selectedSession = setupOptions.sessions.find((session) => session.id === sessionId) ?? firstSession
  const [sourceSlotId, setSourceSlotId] = useState(selectedSession?.accessoryPrescriptions[0]?.sourceSlotId ?? '')
  const [movementId, setMovementId] = useState(setupOptions.accessoryCatalog[0]?.movementId ?? '')
  const effectiveSourceSlotId = selectedSession?.accessoryPrescriptions.some((item) => item.sourceSlotId === sourceSlotId)
    ? sourceSlotId
    : selectedSession?.accessoryPrescriptions[0]?.sourceSlotId ?? ''

  if (!firstSession) {
    return (
      <div className="grid gap-4">
        <div>
          <p className="vf-section-label">Add accessory slots</p>
          <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
            This programme does not have accessory prescriptions to copy.
          </p>
        </div>
      </div>
    )
  }

  const canAdd = Boolean(selectedSession && effectiveSourceSlotId && movementId)
  return (
    <div className="grid gap-4">
      <div>
        <p className="vf-section-label">Add accessory slots</p>
        <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
          Extra accessories copy an existing accessory prescription from the selected session.
        </p>
      </div>
      <div className="grid gap-3 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Session</span>
          <select
            className="min-h-10 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-3 text-sm"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
          >
            {setupOptions.sessions.filter((session) => session.accessoryPrescriptions.length).map((session) => (
              <option key={session.id} value={session.id}>{session.title}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Prescription</span>
          <select
            className="min-h-10 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-3 text-sm"
            value={effectiveSourceSlotId}
            onChange={(event) => setSourceSlotId(event.target.value)}
          >
            {selectedSession?.accessoryPrescriptions.map((option) => (
              <option key={option.sourceSlotId} value={option.sourceSlotId}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Movement</span>
          <select
            className="min-h-10 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-3 text-sm"
            value={movementId}
            onChange={(event) => setMovementId(event.target.value)}
          >
            {setupOptions.accessoryCatalog.map((movement) => (
              <option key={movement.movementId} value={movement.movementId}>{movement.movementName}</option>
            ))}
          </select>
        </label>
        <Button disabled={!canAdd} onClick={() => onAddAccessory({ sessionId, sourceSlotId: effectiveSourceSlotId, movementId })}>
          <Plus size={14} />
          Add
        </Button>
      </div>

      <div className="grid gap-2">
        <p className="vf-section-label">Extra accessories</p>
        {accessoryAdditions.length ? accessoryAdditions.map((addition) => {
          const session = setupOptions.sessions.find((item) => item.id === addition.sessionId)
          const source = session?.accessoryPrescriptions.find((item) => item.sourceSlotId === addition.sourceSlotId)
          return (
            <div
              key={addition.clientId}
              className="grid gap-2 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{getMovementName(addition.movementId)}</p>
                <p className="truncate text-xs text-[var(--mantine-color-dimmed)]">
                  {session?.title ?? addition.sessionId} - {source?.targetSummary ?? 'Accessory work'}
                </p>
              </div>
              <Button color="danger" variant="light" onClick={() => onRemoveAccessory(addition.clientId)}>
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
          )
        }) : (
          <p className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 text-sm text-[var(--mantine-color-dimmed)]">
            No extra accessories added.
          </p>
        )}
      </div>
    </div>
  )
}

function ReviewStep({
  setupOptions,
  units,
  stateValues,
  movementOverrides,
  accessoryAdditions,
  movementOverrideCount,
  accessoryAdditionCount,
}: {
  setupOptions: ProgramSetupOptions
  units: Unit
  rounding: number
  stateValues: ProgramStateInput[]
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  movementOverrideCount: number
  accessoryAdditionCount: number
}) {
  const setupSlots = setupOptions.sessions.flatMap((session) => session.slots)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Units</p>
          <p className="mt-1 text-lg font-black">{units}</p>
        </div>
        <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Customizations</p>
          <p className="mt-1 text-lg font-black">{movementOverrideCount + accessoryAdditionCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <p className="vf-section-label">Starting loads</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {stateValues.map((state) => (
            <div key={state.key} className="rounded-md bg-[var(--mantine-color-default)] px-3 py-2">
              <p className="text-xs text-[var(--mantine-color-dimmed)]">{getMovementName(state.movementId)}</p>
              <p className="text-sm font-bold">{state.value} {units}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <p className="vf-section-label">Movement changes</p>
        <div className="mt-2 space-y-2">
          {movementOverrides.length ? movementOverrides.map((override) => {
            const slot = setupSlots.find(
              (item) => item.slotId === override.slotId && item.phaseKey === override.phaseKey && item.role === override.role,
            )
            return (
              <div key={`${override.slotId}-${override.phaseKey}`} className="rounded-md bg-[var(--mantine-color-default)] px-3 py-2 text-sm">
                <span className="font-bold">{slot?.sessionTitle ?? 'Session'}</span>
                <span className="text-[var(--mantine-color-dimmed)]"> - {slot?.phaseLabel ?? override.phaseKey}</span>
                <p className="mt-1 text-xs">
                  {getMovementName(override.originalMovementId)} to <span className="font-bold">{getMovementName(override.replacementMovementId)}</span>
                </p>
              </div>
            )
          }) : (
            <p className="text-sm text-[var(--mantine-color-dimmed)]">No movement replacements.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <p className="vf-section-label">Added accessories</p>
        <div className="mt-2 space-y-2">
          {accessoryAdditions.length ? accessoryAdditions.map((addition) => {
            const session = setupOptions.sessions.find((item) => item.id === addition.sessionId)
            return (
              <div key={addition.clientId} className="rounded-md bg-[var(--mantine-color-default)] px-3 py-2 text-sm">
                <span className="font-bold">{getMovementName(addition.movementId)}</span>
                <span className="text-[var(--mantine-color-dimmed)]"> - {session?.title ?? addition.sessionId}</span>
              </div>
            )
          }) : (
            <p className="text-sm text-[var(--mantine-color-dimmed)]">No extra accessories.</p>
          )}
        </div>
      </div>
    </div>
  )
}
