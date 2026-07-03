import { Badge } from '@mantine/core'
import { Check, Minus, Plus, RefreshCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Caption, Text } from '~/components'
import { useSetLogMutation } from '~/domains/session/lib/useSetLogMutation'
import { cn } from '~/shared/lib/cn'
import type { MovementSlot, SetLog, WorkoutSession } from '~/shared/types'
import { formatSetTarget, resolveSetRir, RIR_OPTIONS, roundToStep, seedLoadForSet, seedRepsForSet, selectAllOnFocus, SET_GRID_CLASS } from './live-session-utils'

function rirLabel(value: number) {
  return value >= 3 ? '3+' : String(value)
}

export function LiveSetRow({
  session,
  movement,
  set,
  isSelected,
  suggestedRir,
  onSelect,
  onRirSelected,
}: {
  session: WorkoutSession
  movement: MovementSlot
  set: SetLog
  isSelected: boolean
  suggestedRir?: number
  onSelect: () => void
  onRirSelected: (setIndex: number, value: number) => void
}) {
  // Rows stay mounted for the whole session, so the draft only holds what the user actually
  // touched; untouched values derive from the set each render. That lets an open set pick up the
  // carried-over weight the moment an earlier set completes, without clobbering typed input.
  const [draft, setDraft] = useState<{ actualLoad?: number; actualReps?: number; actualRir?: number }>({})
  const seedReps = () => seedRepsForSet(movement, set)
  const loadValue = draft.actualLoad ?? seedLoadForSet(movement, set)
  const repsValue = draft.actualReps ?? seedReps()
  const [pickerOpen, setPickerOpen] = useState(false)
  const effectiveActualRir = resolveSetRir({
    draftRir: draft.actualRir,
    savedRir: set.actualRir,
    completed: set.completed,
    suggestedRir,
  })

  const mutation = useSetLogMutation(session, movement, set.setIndex)

  const isSaving = mutation.isPending || set.syncState === 'saving'
  const saveFailed = set.syncState === 'syncFailed'
  const isEditingDisabled = set.completed || isSaving
  const isFuture = !set.completed && !isSelected
  // A completed set always reads as 'complete' (blue), even while it's still the selected row —
  // otherwise the set you just completed stays white until the selection moves to the next one.
  const rowState = saveFailed ? 'failed' : set.completed ? 'complete' : isSelected ? 'current' : 'future'

  // A committed RIR (just-tapped draft, or already saved on the set) shows solid; a carried-over
  // suggestion on an open set shows as a muted hint until it's committed.
  const rirConfirmed = draft.actualRir != null || typeof set.actualRir === 'number'
  const rirChipLabel = effectiveActualRir == null ? 'RIR' : rirLabel(effectiveActualRir)

  const complete = () => {
    if (isSaving) return
    const completed = saveFailed ? set.completed : !set.completed
    const actualRir = effectiveActualRir
    mutation.mutate({
      exerciseLogId: movement.id,
      movementSlotId: movement.id,
      setIndex: set.setIndex,
      actualLoad: loadValue,
      actualReps: repsValue,
      actualRir,
      completed,
      clientMutationId: crypto.randomUUID(),
    })
    // Completing commits the effective RIR (accepting a carried-over suggestion counts) and carries
    // it on to the next set, so the chain continues without tapping the picker on every set.
    if (completed && typeof actualRir === 'number') onRirSelected(set.setIndex, actualRir)
  }

  const selectRir = (value: number) => {
    setDraft((current) => ({ ...current, actualRir: value }))
    onRirSelected(set.setIndex, value)
    setPickerOpen(false)
  }

  // Desktop-only ± steppers on the selected row, so weight/reps can be set without the keyboard.
  const adjustLoad = (delta: number) => {
    setDraft((current) => ({
      ...current,
      actualLoad: Math.max(0, roundToStep((current.actualLoad ?? seedLoadForSet(movement, set)) + delta, session.rounding)),
    }))
  }
  const adjustReps = (delta: number) => {
    setDraft((current) => ({ ...current, actualReps: Math.max(0, (current.actualReps ?? seedReps()) + delta) }))
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'rounded-2xl border px-3 py-2 transition md:rounded-xl md:px-2 md:py-1.5',
        rowState === 'future' && 'border-dashed',
      )}
      style={{
        borderColor:
          rowState === 'failed'
            ? 'var(--vf-danger-border)'
            : rowState === 'complete'
              ? 'var(--vf-action-border)'
              : 'var(--mantine-color-default-border)',
        backgroundColor:
          rowState === 'failed'
            ? 'var(--vf-danger-soft)'
            : rowState === 'complete'
              ? 'var(--vf-action-soft)'
              : 'var(--mantine-color-default)',
        // Active row gets a calm teal left accent rather than a heavy full border.
        boxShadow: rowState === 'current' ? 'inset 3px 0 0 var(--mantine-primary-color-filled)' : undefined,
      }}
      onClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('button,input')) return
        onSelect()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className={cn(SET_GRID_CLASS, 'items-center gap-1.5 md:gap-2')}>
        <Text
          component="div"
          ta="center"
          size="0.5625rem"
          fw={900}
          c={rowState === 'current' ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)'}
        >
          {set.setIndex}
        </Text>

        <Caption component="div" className="min-w-0 truncate" size="0.625rem">
          {set.isTopSet || set.isAmrap ? (
            <Badge color="accent">Top</Badge>
          ) : set.isBackoff ? (
            'Back-off'
          ) : (
            formatSetTarget(set, session.units, false)
          )}
        </Caption>

        <StepCell
          value={loadValue}
          disabled={isEditingDisabled}
          muted={set.completed || isFuture}
          showSteppers={isSelected && !isEditingDisabled}
          step={session.rounding}
          onAdjust={adjustLoad}
          onFocus={onSelect}
          onChange={(value) => setDraft((current) => ({ ...current, actualLoad: Math.max(0, value) }))}
          dataTour={isSelected ? 'live-weight' : undefined}
          decreaseLabel="Decrease weight"
          increaseLabel="Increase weight"
        />
        <StepCell
          value={repsValue}
          disabled={isEditingDisabled}
          muted={set.completed || isFuture}
          showSteppers={isSelected && !isEditingDisabled}
          step={1}
          onAdjust={adjustReps}
          onFocus={onSelect}
          onChange={(value) => setDraft((current) => ({ ...current, actualReps: Math.max(0, value) }))}
          decreaseLabel="Decrease reps"
          increaseLabel="Increase reps"
        />

        <button
          type="button"
          data-tour={isSelected ? 'live-rir' : undefined}
          className="vf-chip w-full justify-center"
          data-active={rirConfirmed ? 'true' : undefined}
          disabled={isEditingDisabled}
          style={
            isSelected && effectiveActualRir == null
              ? { borderStyle: 'dashed', borderColor: 'var(--vf-action-border)', color: 'var(--vf-action-text)' }
              : undefined
          }
          aria-label="Reps in reserve (RIR)"
          aria-expanded={pickerOpen}
          title="How many more reps could you have done?"
          onClick={() => {
            onSelect()
            if (!isEditingDisabled) setPickerOpen((open) => !open)
          }}
        >
          {rirChipLabel}
        </button>

        <button
          type="button"
          data-tour={isSelected ? 'live-complete' : undefined}
          className="flex h-7 w-7 items-center justify-center justify-self-center rounded-full border transition md:h-8 md:w-8"
          style={{
            borderColor: set.completed
              ? 'var(--vf-success-text)'
              : saveFailed
                ? 'var(--vf-danger-border)'
                : 'var(--mantine-color-default-border)',
            backgroundColor: set.completed
              ? 'var(--vf-success-text)'
              : saveFailed
                ? 'var(--vf-danger-soft)'
                : 'var(--mantine-color-default)',
            color: set.completed ? 'white' : saveFailed ? 'var(--vf-danger-text)' : 'var(--mantine-color-dimmed)',
          }}
          disabled={isSaving}
          onClick={() => {
            onSelect()
            complete()
          }}
          title={saveFailed ? 'Retry save' : set.completed ? 'Mark incomplete to edit' : 'Complete set'}
          aria-label={saveFailed ? 'Retry save' : set.completed ? `Edit set ${set.setIndex}` : `Complete set ${set.setIndex}`}
        >
          {saveFailed ? <RefreshCw size={12} /> : <Check size={12} />}
        </button>
      </div>

      {pickerOpen && !isEditingDisabled ? (
        <div className="mt-2.5">
          <Caption component="p" className="mb-1.5" size="0.625rem">
            How many more reps could you have done?
          </Caption>
          <div className="flex gap-2">
            {RIR_OPTIONS.map((option) => {
              // The 3+ bucket also reflects any legacy values logged above 3.
              const selected = option.value === 3 ? (effectiveActualRir ?? -1) >= 3 : effectiveActualRir === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  title={`How many more reps could you have done? ${option.hint}`}
                  aria-label={option.hint}
                  className="flex-1 rounded-lg border py-2 transition"
                  style={{
                    borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
                    backgroundColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default)',
                    color: selected ? 'white' : 'var(--mantine-color-text)',
                    fontSize: 'var(--mantine-font-size-sm)',
                    fontWeight: 700,
                  }}
                  onClick={() => selectRir(option.value)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StepCell({
  value,
  disabled,
  muted,
  showSteppers,
  step,
  onAdjust,
  onFocus,
  onChange,
  dataTour,
  decreaseLabel,
  increaseLabel,
}: {
  value: number
  disabled: boolean
  muted: boolean
  showSteppers: boolean
  step: number
  onAdjust: (delta: number) => void
  onFocus: () => void
  onChange: (value: number) => void
  dataTour?: string
  decreaseLabel: string
  increaseLabel: string
}) {
  return (
    <div className="flex items-center gap-1">
      {showSteppers ? (
        <StepIconButton className="hidden md:inline-flex" ariaLabel={decreaseLabel} onClick={() => onAdjust(-step)}>
          <Minus size={13} />
        </StepIconButton>
      ) : null}
      <input
        type="number"
        data-tour={dataTour}
        className="live-session-input min-w-0 flex-1 rounded-lg border py-1.5 text-center outline-none transition md:px-1 md:py-1"
        style={{
          borderColor: 'var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: muted ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-text)',
          fontSize: 'var(--mantine-font-size-sm)',
          fontWeight: muted ? 600 : 700,
        }}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onFocus={(event) => {
          selectAllOnFocus(event)
          onFocus()
        }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {showSteppers ? (
        <StepIconButton className="hidden md:inline-flex" ariaLabel={increaseLabel} onClick={() => onAdjust(step)}>
          <Plus size={13} />
        </StepIconButton>
      ) : null}
    </div>
  )
}

function StepIconButton({
  children,
  ariaLabel,
  onClick,
  className,
}: {
  children: ReactNode
  ariaLabel: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn('h-7 w-7 shrink-0 items-center justify-center rounded-full border transition active:scale-95', className)}
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--vf-surface-2)',
        color: 'var(--mantine-color-dimmed)',
      }}
    >
      {children}
    </button>
  )
}
