import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { Check, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { patchSetInSession, type SetPatch } from '~/domains/session/lib/session-cache'
import { upsertSetLogFn } from '~/domains/session/server/session-functions'
import { cn } from '~/shared/lib/cn'
import type { MovementSlot, SetLog, WorkoutSession } from '~/shared/types'
import { QuickAdjustButton } from './LiveSessionControls'
import { formatNumber, formatSetTarget, roundToStep, SET_GRID_CLASS } from './live-session-utils'

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
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState({
    actualLoad: set.actualLoad ?? set.targetLoad ?? 0,
    actualReps: set.actualReps ?? set.targetReps ?? set.targetRepMin ?? 0,
    actualRir: set.actualRir ?? undefined,
  })
  const effectiveActualRir = draft.actualRir ?? (!set.completed && typeof set.actualRir !== 'number' ? suggestedRir : undefined)

  const mutation = useMutation({
    mutationKey: ['setLog', session.sessionId, movement.id, set.setIndex],
    mutationFn: (patch: SetPatch) =>
      upsertSetLogFn({
        data: {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          setIndex: set.setIndex,
          actualLoad: patch.actualLoad,
          actualReps: patch.actualReps,
          actualRir: patch.actualRir,
          completed: patch.completed,
          note: patch.note,
          clientMutationId: patch.clientMutationId ?? crypto.randomUUID(),
        },
      }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['session', session.sessionId] })
      const previous = queryClient.getQueryData<WorkoutSession>(['session', session.sessionId])
      if (previous) {
        queryClient.setQueryData(
          ['session', session.sessionId],
          patchSetInSession(previous, {
            ...patch,
            movementSlotId: movement.id,
            setIndex: set.setIndex,
            syncState: 'saving',
          }),
        )
      }
      return { previous }
    },
    onError: (error, patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['session', session.sessionId],
          patchSetInSession(context.previous, {
            ...patch,
            movementSlotId: movement.id,
            setIndex: set.setIndex,
            syncState: 'syncFailed',
          }),
        )
      }
      notifications.show({
        color: 'danger',
        title: 'Set not saved',
        message: getApiErrorMessage(error, 'Unable to save this set. Retry when your connection is stable.'),
      })
    },
    onSuccess: (nextSession) => {
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
    },
  })

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
        rowState === 'complete' && 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] opacity-65',
        rowState === 'current' && 'border-[var(--mantine-primary-color-filled)] bg-[var(--vf-action-soft)]',
        rowState === 'future' && 'border-dashed border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)]',
        rowState === 'failed' && 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)]',
      )}
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
        <div className={cn('text-center text-[9px] font-extrabold text-[var(--mantine-color-dimmed)]', rowState === 'current' && 'text-[var(--vf-action-text)]')}>
          {set.setIndex}
        </div>

        <SetValueInput
          value={draft.actualLoad}
          disabled={isEditingDisabled}
          muted={set.completed || isFuture}
          onFocus={onSelect}
          onChange={(value) => setDraft((current) => ({ ...current, actualLoad: value }))}
        />
        <SetValueInput
          value={draft.actualReps}
          disabled={isEditingDisabled}
          muted={set.completed || isFuture}
          onFocus={onSelect}
          onChange={(value) => setDraft((current) => ({ ...current, actualReps: value }))}
        />

        <div className="hidden text-center text-[10px] text-[var(--mantine-color-dimmed)] md:block">
          {set.isTopSet || set.isAmrap ? (
            <span className="rounded bg-[var(--vf-accent-soft)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-accent-filled)]">
              Top
            </span>
          ) : set.isBackoff ? (
            'Back-off'
          ) : (
            formatSetTarget(set, session.units, false)
          )}
        </div>

        <RirSegmentedControl
          value={effectiveActualRir}
          onChange={(value) => {
            setDraft((current) => ({ ...current, actualRir: value }))
            onRirSelected(set.setIndex, value)
          }}
          disabled={isEditingDisabled}
          muted={set.completed || isFuture}
          onFocus={onSelect}
        />

        <button
          type="button"
          className={cn(
            'flex h-8 w-8 items-center justify-center justify-self-center rounded-lg border text-[11px] transition',
            set.completed
              ? 'border-green-600 bg-green-600 text-white'
              : saveFailed
                ? 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]'
                : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)] hover:border-[var(--vf-action-border)] hover:bg-[var(--vf-surface-2)]',
          )}
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
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7 text-[9px] text-[var(--mantine-color-dimmed)] md:gap-2 md:pl-8">
          <span>load</span>
          {[-5, -session.rounding, session.rounding, 5].map((delta) => (
            <QuickAdjustButton key={`load-${delta}`} onClick={() => adjustLoad(delta)}>
              {delta > 0 ? `+${formatNumber(delta)}` : formatNumber(delta)}
            </QuickAdjustButton>
          ))}
          <span className="ml-1">reps</span>
          <QuickAdjustButton onClick={() => adjustReps(-1)}>−1</QuickAdjustButton>
          <QuickAdjustButton onClick={() => adjustReps(1)}>+1</QuickAdjustButton>
        </div>
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
}: {
  value: number
  disabled: boolean
  muted: boolean
  onFocus: () => void
  onChange: (value: number) => void
}) {
  return (
    <input
      type="number"
      className={cn(
        'live-session-input w-full rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] py-1.5 text-center text-sm font-bold text-[var(--mantine-color-text)] outline-none transition md:px-2 md:py-1',
        muted && 'font-semibold text-[var(--mantine-color-dimmed)]',
      )}
      value={Number.isFinite(value) ? value : 0}
      disabled={disabled}
      onFocus={onFocus}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}

const RIR_OPTIONS: { value: number; label: string; hint: string }[] = [
  { value: 0, label: '0', hint: '0 — none left, max effort' },
  { value: 1, label: '1', hint: '1 — maybe one more rep' },
  { value: 2, label: '2', hint: '2 — two more reps' },
  { value: 3, label: '3+', hint: '3+ — three or more reps' },
]

function RirSegmentedControl({
  value,
  onChange,
  disabled,
  muted,
  onFocus,
}: {
  value?: number
  onChange: (value: number) => void
  disabled: boolean
  muted: boolean
  onFocus: () => void
}) {
  return (
    <div className="flex gap-0.5">
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
              'flex-1 rounded-md border py-1 text-[8px] font-extrabold transition md:text-[9px]',
              selected
                ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-primary-color-filled)] text-white'
                : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)] hover:border-[var(--vf-action-border)] hover:bg-[var(--vf-surface-2)]',
              muted && !selected && 'opacity-80',
            )}
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
