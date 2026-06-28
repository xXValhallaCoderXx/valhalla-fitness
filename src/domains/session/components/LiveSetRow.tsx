import { Badge } from '@mantine/core'
import { Check, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Caption, Text } from '~/components'
import { useSetLogMutation } from '~/domains/session/lib/useSetLogMutation'
import { cn } from '~/shared/lib/cn'
import type { MovementSlot, SetLog, WorkoutSession } from '~/shared/types'
import { QuickAdjustButton } from './LiveSessionControls'
import { formatNumber, formatSetTarget, RIR_OPTIONS, roundToStep, SET_GRID_CLASS } from './live-session-utils'

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
  const [draft, setDraft] = useState({
    actualLoad: set.actualLoad ?? set.targetLoad ?? 0,
    actualReps: set.actualReps ?? set.targetReps ?? set.targetRepMin ?? 0,
    actualRir: set.actualRir ?? undefined,
  })
  const effectiveActualRir = draft.actualRir ?? (!set.completed && typeof set.actualRir !== 'number' ? suggestedRir : undefined)

  const mutation = useSetLogMutation(session, movement, set.setIndex)

  const isSaving = mutation.isPending || set.syncState === 'saving'
  const saveFailed = set.syncState === 'syncFailed'
  const isEditingDisabled = set.completed || isSaving
  const isFuture = !set.completed && !isSelected
  const rowState = saveFailed ? 'failed' : isSelected ? 'current' : set.completed ? 'complete' : 'future'

  const complete = () => {
    if (isSaving) return
    const completed = saveFailed ? set.completed : !set.completed
    mutation.mutate({
      exerciseLogId: movement.id,
      movementSlotId: movement.id,
      setIndex: set.setIndex,
      actualLoad: Number(draft.actualLoad),
      actualReps: Number(draft.actualReps),
      actualRir: effectiveActualRir,
      completed,
      clientMutationId: crypto.randomUUID(),
    })
  }

  const adjustLoad = (delta: number) => {
    setDraft((current) => ({ ...current, actualLoad: roundToStep(Number(current.actualLoad) + delta, session.rounding) }))
  }

  const adjustReps = (delta: number) => {
    setDraft((current) => ({ ...current, actualReps: Math.max(0, Number(current.actualReps) + delta) }))
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'rounded-xl border px-4 py-2 transition md:rounded-lg md:px-1 md:py-1.5',
        rowState === 'future' && 'border-dashed',
      )}
      style={{
        borderColor:
          rowState === 'current'
            ? 'var(--mantine-primary-color-filled)'
            : rowState === 'failed'
              ? 'var(--vf-danger-border)'
              : 'var(--mantine-color-default-border)',
        backgroundColor:
          rowState === 'current'
            ? 'var(--vf-action-soft)'
            : rowState === 'failed'
              ? 'var(--vf-danger-soft)'
              : rowState === 'complete'
                ? 'var(--vf-surface-2)'
                : 'var(--mantine-color-default)',
        opacity: rowState === 'complete' ? 0.65 : undefined,
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
      <div className={cn(SET_GRID_CLASS, 'items-center justify-stretch gap-1.5 sm:justify-center sm:gap-2 md:justify-stretch md:gap-2')}>
        <Text
          component="div"
          ta="center"
          size="0.5625rem"
          fw={900}
          c={rowState === 'current' ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)'}
        >
          {set.setIndex}
        </Text>

        <SetValueInput
          value={draft.actualLoad}
          disabled={isEditingDisabled}
          muted={set.completed || isFuture}
          onFocus={onSelect}
          onChange={(value) => setDraft((current) => ({ ...current, actualLoad: value }))}
          dataTour={isSelected ? 'live-weight' : undefined}
        />
        <SetValueInput
          value={draft.actualReps}
          disabled={isEditingDisabled}
          muted={set.completed || isFuture}
          onFocus={onSelect}
          onChange={(value) => setDraft((current) => ({ ...current, actualReps: value }))}
        />

        <Caption component="div" className="hidden md:block" ta="center" size="0.625rem">
          {set.isTopSet || set.isAmrap ? (
            <Badge color="accent">Top</Badge>
          ) : set.isBackoff ? (
            'Back-off'
          ) : (
            formatSetTarget(set, session.units, false)
          )}
        </Caption>

        <RirSegmentedControl
          value={effectiveActualRir}
          onChange={(value) => {
            setDraft((current) => ({ ...current, actualRir: value }))
            onRirSelected(set.setIndex, value)
          }}
          disabled={isEditingDisabled}
          muted={set.completed || isFuture}
          onFocus={onSelect}
          dataTour={isSelected ? 'live-rir' : undefined}
        />

        <button
          type="button"
          data-tour={isSelected ? 'live-complete' : undefined}
          className="flex h-8 w-8 items-center justify-center justify-self-center rounded-lg border transition"
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

      {isSelected && !set.completed ? (
        <Caption component="div" className="mt-2 flex flex-wrap items-center gap-1.5 pl-7 md:gap-2 md:pl-8" size="0.625rem">
          <span>load</span>
          {[-5, -session.rounding, session.rounding, 5].map((delta) => (
            <QuickAdjustButton key={`load-${delta}`} onClick={() => adjustLoad(delta)}>
              {delta > 0 ? `+${formatNumber(delta)}` : formatNumber(delta)}
            </QuickAdjustButton>
          ))}
          <span className="ml-1">reps</span>
          <QuickAdjustButton onClick={() => adjustReps(-1)}>−1</QuickAdjustButton>
          <QuickAdjustButton onClick={() => adjustReps(1)}>+1</QuickAdjustButton>
        </Caption>
      ) : null}
    </div>
  )
}

function SetValueInput({
  value,
  disabled,
  muted,
  onFocus,
  onChange,
  dataTour,
}: {
  value: number
  disabled: boolean
  muted: boolean
  onFocus: () => void
  onChange: (value: number) => void
  dataTour?: string
}) {
  return (
    <input
      type="number"
      data-tour={dataTour}
      className="live-session-input w-full rounded-lg border py-1.5 text-center outline-none transition md:px-2 md:py-1"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default)',
        color: muted ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-text)',
        fontSize: 'var(--mantine-font-size-sm)',
        fontWeight: muted ? 600 : 700,
      }}
      value={Number.isFinite(value) ? value : 0}
      disabled={disabled}
      onFocus={onFocus}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}

function RirSegmentedControl({
  value,
  onChange,
  disabled,
  muted,
  onFocus,
  dataTour,
}: {
  value?: number
  onChange: (value: number) => void
  disabled: boolean
  muted: boolean
  onFocus: () => void
  dataTour?: string
}) {
  return (
    <div className="flex gap-0.5" role="group" aria-label="Reps in reserve (RIR)" data-tour={dataTour}>
      {RIR_OPTIONS.map((option) => {
        // The 3+ bucket also reflects any legacy values logged above 3.
        const selected = option.value === 3 ? (value ?? -1) >= 3 : value === option.value
        return (
          <button
            key={option.value}
            type="button"
            title={`How many more reps could you have done? ${option.hint}`}
            aria-label={option.hint}
            className={cn(
              'flex-1 rounded-md border py-1 transition',
              muted && !selected && 'opacity-80',
            )}
            style={{
              borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
              backgroundColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default)',
              color: selected ? 'white' : 'var(--mantine-color-dimmed)',
              fontSize: '0.5625rem',
              fontWeight: 900,
            }}
            disabled={disabled}
            onClick={() => {
              onFocus()
              onChange(option.value)
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
