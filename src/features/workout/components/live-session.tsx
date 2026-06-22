import { Checkbox, Modal, Select, TextInput } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import {
  Calculator,
  Check,
  ChevronDown,
  Dumbbell,
  History,
  Plus,
  RefreshCw,
  Repeat2,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { cn } from '~/lib/cn'
import { formatCompactDate, formatRelativeTime } from '~/lib/dates'
import { movementHistoryQueryOptions, movementSwapOptionsQueryOptions } from '~/lib/query-options'
import { patchMovementInSession, patchSetInSession, sessionCompletion, type SetPatch } from '~/lib/session-cache'
import { substituteMovementFn, upsertSetLogFn } from '~/server/api'
import type {
  MovementHistoryEntry,
  MovementHistorySet,
  MovementSlot,
  MovementSwapOption,
  SetLog,
  SubstitutionReason,
  SwapScope,
  WorkoutSession,
} from '~/types/training'
import { SyncPill } from './session'

const SET_GRID_CLASS = 'grid grid-cols-[1.15rem_minmax(3.75rem,1fr)_minmax(3rem,0.75fr)_minmax(4.75rem,1fr)_2.25rem] sm:grid-cols-[1.25rem_minmax(4.5rem,7.75rem)_minmax(3.25rem,6.5rem)_minmax(5rem,6.5rem)_2.25rem] md:grid-cols-[1.5rem_minmax(4.75rem,1fr)_minmax(4rem,0.8fr)_minmax(5.5rem,1fr)_minmax(7.5rem,1.35fr)_2.25rem]'

type LiveSessionFrameProps = {
  session: WorkoutSession
  activeMovementId: string
  onSelectMovement: (movementId: string) => void
  notes: string
  onNotesChange: (value: string) => void
  onFinish: () => void
  finishLabel: string
  finishDisabled: boolean
  finishBlockedReason?: string | null
  finishError?: string | null
}

export function LiveSessionFrame({
  session,
  activeMovementId,
  onSelectMovement,
  notes,
  onNotesChange,
  onFinish,
  finishLabel,
  finishDisabled,
  finishBlockedReason,
  finishError,
}: LiveSessionFrameProps) {
  const progress = sessionCompletion(session)
  const selectedMovement = session.movements.find((movement) => movement.id === activeMovementId) ?? session.movements[0]
  const selectedMovementId = selectedMovement?.id ?? activeMovementId
  const completedMovements = session.movements.filter(isMovementComplete).length

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-3.5rem)] bg-[var(--mantine-color-body)] text-[var(--mantine-color-text)] md:mx-auto md:my-0 md:min-h-0 md:max-w-[920px] md:rounded-2xl md:border md:border-[var(--mantine-color-default-border)] md:bg-[var(--mantine-color-default)] md:shadow-[var(--vf-shadow-panel)]">
      <SessionContextBar
        session={session}
        progress={progress}
        completedMovements={completedMovements}
        finishLabel={finishLabel}
        finishDisabled={finishDisabled}
        onFinish={onFinish}
      />

      <div className="h-1 bg-[var(--vf-surface-2)]" aria-hidden="true">
        <div
          className="h-full bg-[var(--mantine-primary-color-filled)] transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="md:flex md:min-h-[560px]">
        <MovementRail
          session={session}
          activeMovementId={selectedMovementId}
          onSelectMovement={onSelectMovement}
        />

        <main className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-3 py-3 pb-24 md:max-h-[calc(100vh-12rem)] md:space-y-3 md:bg-[var(--vf-bg-elevated)] md:p-4 md:pb-4">
          {finishBlockedReason ? (
            <StatusPanel tone="warning">{finishBlockedReason}</StatusPanel>
          ) : null}
          {finishError ? <StatusPanel tone="danger">{finishError}</StatusPanel> : null}

          {session.movements.map((movement) => {
            const isSelected = movement.id === selectedMovementId
            return (
              <div key={movement.id}>
                <LiveMovementCard
                  session={session}
                  movement={movement}
                  isActive={isSelected}
                  movementNumber={movement.orderIndex + 1}
                  onSelect={() => onSelectMovement(movement.id)}
                />
              </div>
            )
          })}

          <LiveNotesBox value={notes} onChange={onNotesChange} />
        </main>
      </div>
    </div>
  )
}

function SessionContextBar({
  session,
  progress,
  completedMovements,
  finishLabel,
  finishDisabled,
  onFinish,
}: {
  session: WorkoutSession
  progress: ReturnType<typeof sessionCompletion>
  completedMovements: number
  finishLabel: string
  finishDisabled: boolean
  onFinish: () => void
}) {
  return (
    <div className="sticky top-12 z-20 border-b border-[var(--mantine-color-default-border)] bg-[color:var(--mantine-color-default)/0.95] px-4 py-2.5 backdrop-blur md:static md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 md:hidden">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--vf-brand-mark)] text-[var(--vf-brand-mark-text)]">
              <Dumbbell size={11} />
            </div>
            <span className="text-xs font-bold tracking-tight text-[var(--mantine-color-text)]">Valhalla Fitness</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div>
              <h1 className="truncate text-[11px] font-extrabold leading-tight text-[var(--mantine-color-text)] md:text-sm">
                {session.title}
              </h1>
              <p className="mt-0.5 text-[9px] text-[var(--mantine-color-dimmed)] md:text-xs">
                {completedMovements} of {session.movements.length} movements · {progress.completed} of {progress.total} sets
              </p>
            </div>
            <div className="hidden flex-wrap gap-1.5 md:flex">
              <MetaPill tone={session.hardness === 'Hard' ? 'danger' : 'neutral'}>{session.hardness}</MetaPill>
              <MetaPill>{session.weekLabel}</MetaPill>
              <MetaPill>{session.programTitle}</MetaPill>
              <SyncPill state={session.syncState} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--mantine-primary-color-filled)] px-2.5 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-[var(--mantine-primary-color-filled-hover)] disabled:opacity-50 md:px-3 md:text-xs"
            disabled={finishDisabled}
            onClick={onFinish}
          >
            {finishLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function MovementRail({
  session,
  activeMovementId,
  onSelectMovement,
}: {
  session: WorkoutSession
  activeMovementId: string
  onSelectMovement: (movementId: string) => void
}) {
  return (
    <aside className="hidden w-48 shrink-0 flex-col border-r border-[var(--mantine-color-default-border)] bg-[var(--vf-bg-elevated)] px-2 py-3 md:flex">
      <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-dimmed)]">Movements</p>
      <div className="space-y-0.5">
        {session.movements.map((movement) => {
          const complete = isMovementComplete(movement)
          const active = movement.id === activeMovementId
          return (
            <button
              key={movement.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition',
                active
                  ? 'border border-[var(--mantine-primary-color-filled)] bg-[var(--vf-action-soft)] text-[var(--vf-action-text)]'
                  : 'text-[var(--mantine-color-dimmed)] hover:bg-[var(--mantine-color-default)]',
                complete && !active && 'opacity-55',
              )}
              onClick={() => onSelectMovement(movement.id)}
            >
              <MovementNumberBadge number={movement.orderIndex + 1} active={active} complete={complete} />
              <span className={cn('truncate text-xs', active ? 'font-extrabold' : 'font-semibold', complete && 'line-through')}>
                {movement.movementName}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function LiveMovementCard({
  session,
  movement,
  isActive,
  movementNumber,
  onSelect,
}: {
  session: WorkoutSession
  movement: MovementSlot
  isActive: boolean
  movementNumber: number
  onSelect: () => void
}) {
  const topSet = getTopSet(movement)
  const firstIncompleteIndex = movement.sets.find((set) => !set.completed)?.setIndex
  const [selectedSetIndex, setSelectedSetIndex] = useState(
    firstIncompleteIndex ?? movement.sets[0]?.setIndex ?? 1,
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const [suggestedRirBySetIndex, setSuggestedRirBySetIndex] = useState<Record<number, number | undefined>>({})

  const carryRirToNextSet = (setIndex: number, value: number) => {
    const nextSet = movement.sets.find((candidate) => candidate.setIndex > setIndex && !candidate.completed)
    if (!nextSet || typeof nextSet.actualRir === 'number') return
    setSuggestedRirBySetIndex((current) => ({ ...current, [nextSet.setIndex]: value }))
  }

  if (!isActive) {
    return <CollapsedMovementCard movement={movement} movementNumber={movementNumber} onSelect={onSelect} />
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-color-default)] md:rounded-xl md:border-2 md:p-4 md:shadow-[var(--vf-shadow-card)]">
      <div className="border-b border-[var(--mantine-color-default-border)] px-4 pb-3 pt-4 md:border-0 md:p-0">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 md:justify-start md:gap-4">
          <div className="min-w-0">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[15px] font-extrabold text-[var(--mantine-color-text)] md:text-base">
                {movement.movementName}
              </h2>
              <RolePill role={movement.role} />
            </div>
            <p className="text-[10px] text-[var(--mantine-color-dimmed)] md:text-xs">
              {movement.targetSummary} · {session.programTitle}
            </p>
            {movement.performedMovementId && movement.performedMovementId !== movement.movementId ? (
              <p className="mt-1 text-[10px] font-semibold text-[var(--vf-warning-text)]">
                Performed as {movement.performedMovementName}
              </p>
            ) : null}
          </div>
          <div className="flex gap-1.5 md:pt-0.5">
            <ToolButton title="Plate math" icon={<Calculator size={13} />} label="Plates" />
            <ToolButton
              title={movement.role === 'main' ? 'Main lifts cannot be swapped' : 'Swap movement'}
              icon={<Repeat2 size={13} />}
              label="Swap"
              disabled={movement.role === 'main'}
              onClick={() => setSwapOpen(true)}
            />
            <ToolButton title="Movement history" icon={<History size={13} />} label="History" onClick={() => setHistoryOpen(true)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-3 py-2 md:mb-3 md:rounded-lg md:px-3 md:py-2.5">
          <MetricBlock label="Top set today" value={topSet ? formatSetTarget(topSet, session.units) : 'No top set'} />
          <div className="hidden h-7 w-px bg-[var(--mantine-color-default-border)] md:block" aria-hidden="true" />
          <MetricBlock
            label="Last comparable"
            value={movement.previous?.label ?? 'No previous comparable'}
            align="right"
          />
          <div className="w-full border-t border-[var(--mantine-color-default-border)] pt-2 text-[10px] leading-relaxed text-[var(--mantine-color-dimmed)]">
            <span className="font-bold text-[var(--mantine-color-text)]">Progression hint:</span>{' '}
            {getProgressionHint(movement, topSet)}
          </div>
        </div>
      </div>

      <div className={cn(SET_GRID_CLASS, 'justify-stretch px-4 pb-1 pt-2.5 text-center text-[8px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-dimmed)] sm:justify-center md:justify-stretch md:gap-2 md:px-1 md:pt-0 md:text-[9px]')}>
        <span>#</span>
        <span>{session.units}</span>
        <span>Reps</span>
        <span className="hidden md:block">Target</span>
        <span>RIR</span>
        <span />
      </div>

      <div className="space-y-2 px-4 pb-3 md:space-y-1.5 md:px-0 md:pb-0">
        {movement.sets.map((set) => (
          <LiveSetRow
            key={`${movement.id}-${set.setIndex}`}
            session={session}
            movement={movement}
            set={set}
            isSelected={set.setIndex === selectedSetIndex}
            suggestedRir={suggestedRirBySetIndex[set.setIndex]}
            onSelect={() => setSelectedSetIndex(set.setIndex)}
            onRirSelected={carryRirToNextSet}
          />
        ))}
      </div>

      <MovementHistoryModal open={historyOpen} movement={movement} onClose={() => setHistoryOpen(false)} />
      {swapOpen ? (
        <MovementSwapModal
          open={swapOpen}
          session={session}
          movement={movement}
          onClose={() => setSwapOpen(false)}
        />
      ) : null}

      <button
        type="button"
        className="mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--mantine-color-default-border)] py-2 text-[10px] font-bold text-[var(--mantine-color-dimmed)] transition hover:bg-[var(--vf-surface-2)] md:mx-0 md:mb-0 md:mt-3 md:w-full md:rounded-lg md:bg-[var(--vf-surface-2)] md:py-1.5 md:text-[11px] md:hover:bg-[var(--vf-surface-3)]"
        title="Manual add-set support is coming soon"
      >
        <Plus size={12} />
        Add set
      </button>
    </article>
  )
}

function CollapsedMovementCard({
  movement,
  movementNumber,
  onSelect,
}: {
  movement: MovementSlot
  movementNumber: number
  onSelect: () => void
}) {
  const complete = isMovementComplete(movement)
  const completedSets = movement.sets.filter((set) => set.completed).length
  const totalSets = movement.sets.length

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-4 py-3 text-left text-[var(--mantine-color-text)] transition hover:border-[var(--vf-action-border)] md:rounded-xl md:shadow-[var(--vf-shadow-card)]',
        complete && 'opacity-55',
      )}
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <MovementNumberBadge number={movementNumber} complete={complete} />
          <h3 className={cn('truncate text-sm font-extrabold text-[var(--mantine-color-text)]', complete && 'line-through')}>
            {movement.movementName}
          </h3>
          <RolePill role={movement.role} subtle />
        </div>
        <p className="pl-7 text-[10px] text-[var(--mantine-color-dimmed)] md:text-xs">
          {totalSets} sets · {movement.targetSummary}
          {movement.previous?.label ? <span className="hidden sm:inline"> · {movement.previous.label}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold text-[var(--mantine-color-dimmed)]">
          {completedSets}/{totalSets}
        </span>
        <ChevronDown className="-rotate-90 text-[var(--mantine-color-dimmed)]" size={14} />
      </div>
    </button>
  )
}

function LiveSetRow({
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
      {[0, 1, 2, 3, 4].map((item) => {
        const selected = value === item
        return (
          <button
            key={item}
            type="button"
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
              onChange(item)
            }}
          >
            {item === 4 ? '4+' : item}
          </button>
        )
      })}
    </div>
  )
}

function LiveNotesBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 rounded-2xl border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-4 md:rounded-xl">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-dimmed)]">
        Session notes
      </span>
      <TextInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optional notes"
        classNames={{
          input: '!border-[var(--mantine-color-default-border)] !bg-[var(--vf-surface-2)] !text-[var(--mantine-color-text)]',
        }}
      />
    </label>
  )
}

function StatusPanel({ tone, children }: { tone: 'warning' | 'danger'; children: ReactNode }) {
  return (
    <p
      className={cn(
        'rounded-2xl border p-3 text-xs md:rounded-xl',
        tone === 'warning' && 'border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] text-[var(--vf-warning-text)]',
        tone === 'danger' && 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]',
      )}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}

function MetaPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider',
        tone === 'danger'
          ? 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]'
          : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]',
      )}
    >
      {children}
    </span>
  )
}

function RolePill({ role, subtle = false }: { role: MovementSlot['role']; subtle?: boolean }) {
  const roleColor = role === 'main' ? 'text-[var(--mantine-color-accent-filled)]' : 'text-[var(--mantine-color-dimmed)]'
  const roleBg = role === 'main' ? 'bg-[var(--vf-accent-soft)]' : 'bg-[var(--vf-surface-2)]'
  return (
    <span
      className={cn(
        'rounded border border-[var(--mantine-color-default-border)] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider md:text-[9px]',
        roleColor,
        roleBg,
        subtle && 'opacity-90',
      )}
    >
      {role}
    </span>
  )
}

const substitutionReasons: { value: SubstitutionReason; label: string }[] = [
  { value: 'equipment_missing', label: 'Equipment unavailable' },
  { value: 'crowded_gym', label: 'Crowded gym' },
  { value: 'preference', label: 'Preference' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'other', label: 'Other' },
]

function MovementSwapModal({
  open,
  session,
  movement,
  onClose,
}: {
  open: boolean
  session: WorkoutSession
  movement: MovementSlot
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null)
  const [reason, setReason] = useState<SubstitutionReason>('equipment_missing')
  const [scope, setScope] = useState<SwapScope>('session')
  const [note, setNote] = useState('')

  const optionsQuery = useQuery({
    ...movementSwapOptionsQueryOptions(session.sessionId, movement.id),
    enabled: open && movement.role !== 'main',
  })
  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data])
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return options
    return options.filter((option) => {
      const equipment = option.equipment.join(' ').toLowerCase()
      return (
        option.movementName.toLowerCase().includes(query) ||
        option.category.toLowerCase().includes(query) ||
        equipment.includes(query)
      )
    })
  }, [options, search])
  const effectiveSelectedMovementId = selectedMovementId ?? options[0]?.movementId ?? null
  const selectedOption = options.find((option) => option.movementId === effectiveSelectedMovementId) ?? null
  const canUsePhaseScope = Boolean(selectedOption?.allowedScopes.includes('phase_slot'))
  const effectiveScope: SwapScope = scope === 'phase_slot' && canUsePhaseScope ? 'phase_slot' : 'session'

  const mutation = useMutation({
    mutationKey: ['substituteMovement', session.sessionId, movement.id],
    mutationFn: (input: {
      option: MovementSwapOption
      reason: SubstitutionReason
      note?: string
      scope: SwapScope
    }) =>
      substituteMovementFn({
        data: {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          performedMovementId: input.option.movementId,
          reason: input.reason,
          note: input.note,
          scope: input.scope,
        },
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['session', session.sessionId] })
      const previous = queryClient.getQueryData<WorkoutSession>(['session', session.sessionId])
      if (previous) {
        queryClient.setQueryData(
          ['session', session.sessionId],
          patchMovementInSession(previous, {
            exerciseLogId: movement.id,
            performedMovementId: input.option.movementId,
            performedMovementName: input.option.movementName,
          }),
        )
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(['session', session.sessionId], context.previous)
      notifications.show({
        color: 'danger',
        title: 'Movement not swapped',
        message: getApiErrorMessage(error, 'Unable to swap this movement.'),
      })
    },
    onSuccess: async (nextSession, input) => {
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
      await queryClient.invalidateQueries({ queryKey: ['movementSwapOptions', session.sessionId, movement.id] })
      if (input.scope === 'phase_slot') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['today'] }),
          queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        ])
      }
      notifications.show({
        color: 'success',
        title: 'Movement swapped',
        message: input.scope === 'phase_slot' ? 'This slot will use the replacement for the rest of this phase.' : 'This session was updated.',
      })
      onClose()
    },
  })

  const submit = () => {
    if (!selectedOption || mutation.isPending) return
    mutation.mutate({
      option: selectedOption,
      reason,
      note: note.trim() || undefined,
      scope: effectiveScope,
    })
  }

  return (
    <Modal
      opened={open}
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      title="Swap movement"
      size="lg"
      closeOnClickOutside={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      withCloseButton={!mutation.isPending}
      classNames={{
        content: '!border !border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        header: '!bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        title: 'text-lg font-bold !text-[var(--mantine-color-text)]',
        body: '!text-[var(--mantine-color-text)]',
        close: '!text-[var(--mantine-color-dimmed)] hover:!bg-[var(--vf-surface-2)] hover:!text-[var(--mantine-color-text)]',
      }}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-dimmed)]">
            Planned
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-base font-extrabold">{movement.movementName}</p>
            <RolePill role={movement.role} subtle />
          </div>
          {movement.performedMovementId && movement.performedMovementId !== movement.movementId ? (
            <p className="mt-2 text-xs font-semibold text-[var(--vf-warning-text)]">
              Currently performed as {movement.performedMovementName}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
        </div>

        <TextInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search alternatives"
          classNames={{
            input: '!border-[var(--mantine-color-default-border)] !bg-[var(--vf-surface-2)] !text-[var(--mantine-color-text)]',
          }}
        />

        {optionsQuery.isPending ? (
          <HistoryStatus>Loading suggested movements...</HistoryStatus>
        ) : optionsQuery.isError ? (
          <HistoryStatus tone="danger">{getApiErrorMessage(optionsQuery.error, 'Unable to load movement options')}</HistoryStatus>
        ) : filteredOptions.length ? (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredOptions.map((option) => (
              <SwapOptionRow
                key={option.movementId}
                option={option}
                selected={option.movementId === effectiveSelectedMovementId}
                onSelect={() => setSelectedMovementId(option.movementId)}
              />
            ))}
          </div>
        ) : (
          <HistoryStatus>No matching movements found.</HistoryStatus>
        )}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Select
            label="Reason"
            data={substitutionReasons}
            value={reason}
            onChange={(value) => setReason((value ?? 'equipment_missing') as SubstitutionReason)}
            allowDeselect={false}
            disabled={mutation.isPending}
            classNames={{
              label: '!text-[var(--mantine-color-dimmed)] !text-xs !font-bold',
              input: '!border-[var(--mantine-color-default-border)] !bg-[var(--vf-surface-2)] !text-[var(--mantine-color-text)]',
              dropdown: '!border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)]',
              option: '!text-[var(--mantine-color-text)] hover:!bg-[var(--vf-surface-2)]',
            }}
          />
          <TextInput
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional"
            disabled={mutation.isPending}
            classNames={{
              label: '!text-[var(--mantine-color-dimmed)] !text-xs !font-bold',
              input: '!border-[var(--mantine-color-default-border)] !bg-[var(--vf-surface-2)] !text-[var(--mantine-color-text)]',
            }}
          />
        </div>

        <Checkbox
          checked={effectiveScope === 'phase_slot'}
          disabled={!canUsePhaseScope || mutation.isPending}
          onChange={(event) => setScope(event.currentTarget.checked ? 'phase_slot' : 'session')}
          label="Use for this slot for the rest of the phase"
          classNames={{
            label: '!text-sm !font-semibold !text-[var(--mantine-color-text)]',
            input: '!border-[var(--mantine-color-default-border)]',
          }}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-4 py-2 text-sm font-bold text-[var(--mantine-color-text)] transition hover:bg-[var(--vf-surface-2)] disabled:opacity-60"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-[var(--mantine-primary-color-filled)] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[var(--mantine-primary-color-filled-hover)] disabled:opacity-60"
            disabled={!selectedOption || mutation.isPending}
            onClick={submit}
          >
            {mutation.isPending ? 'Swapping...' : 'Swap movement'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function SwapOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: MovementSwapOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-xl border p-3 text-left transition',
        selected
          ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--vf-action-soft)]'
          : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] hover:border-[var(--vf-action-border)]',
      )}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-[var(--mantine-color-text)]">{option.movementName}</p>
          <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">
            {option.relationshipLabel} · {option.category}
          </p>
        </div>
        <span className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
          {option.source === 'rule' ? 'Suggested' : 'Related'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {option.equipment.map((item) => (
          <span
            key={item}
            className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--mantine-color-dimmed)]"
          >
            {formatEquipmentLabel(item)}
          </span>
        ))}
      </div>
    </button>
  )
}

function MovementHistoryModal({ open, movement, onClose }: { open: boolean; movement: MovementSlot; onClose: () => void }) {
  const movementId = movement.performedMovementId ?? movement.movementId
  const historyQuery = useQuery({
    ...movementHistoryQueryOptions(movementId),
    enabled: open,
  })
  const entries = historyQuery.data ?? []

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={`${movement.movementName} history`}
      size="lg"
      classNames={{
        content: '!border !border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        header: '!bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        title: 'text-lg font-bold !text-[var(--mantine-color-text)]',
        body: '!text-[var(--mantine-color-text)]',
        close: '!text-[var(--mantine-color-dimmed)] hover:!bg-[var(--vf-surface-2)] hover:!text-[var(--mantine-color-text)]',
      }}
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--mantine-color-dimmed)]">
          Recent completed logs for this movement, including sessions from any program.
        </p>

        {historyQuery.isPending ? (
          <HistoryStatus>Loading recent sets…</HistoryStatus>
        ) : historyQuery.isError ? (
          <HistoryStatus tone="danger">{getApiErrorMessage(historyQuery.error, 'Unable to load movement history')}</HistoryStatus>
        ) : entries.length ? (
          <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {entries.map((entry) => (
              <MovementHistoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <HistoryStatus>No completed sets for this movement yet.</HistoryStatus>
        )}
      </div>
    </Modal>
  )
}

function MovementHistoryCard({ entry }: { entry: MovementHistoryEntry }) {
  const completedSets = entry.sets.filter((set) => set.completed)
  const displaySets = completedSets.length ? completedSets : entry.sets
  const date = entry.completedAt ?? entry.scheduledDate

  return (
    <div className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{entry.sessionTitle}</p>
          <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">
            {entry.programTitle ?? 'Training session'} · {entry.targetSummary}
          </p>
        </div>
        <span className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2 py-1 text-right">
          <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{formatCompactDate(date)}</span>
          <span className="block text-[10px] font-semibold text-[var(--mantine-color-dimmed)]">{formatRelativeTime(date)}</span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {displaySets.map((set) => (
          <span
            key={set.id}
            className={cn(
              'rounded-lg border px-2 py-1 text-[11px] font-bold',
              set.isTopSet || set.isAmrap
                ? 'border-[var(--vf-accent-border)] bg-[var(--vf-accent-soft)] text-[var(--mantine-color-accent-filled)]'
                : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-text)]',
            )}
          >
            {set.setIndex}: {formatHistorySet(set, entry.units ?? undefined)}
          </span>
        ))}
      </div>
    </div>
  )
}

function HistoryStatus({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <p className={cn('rounded-xl border p-3 text-sm', tone === 'danger' ? 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]' : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]')}>
      {children}
    </p>
  )
}

function ToolButton({
  title,
  icon,
  label,
  onClick,
  disabled = false,
}: {
  title: string
  icon: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)] transition hover:border-[var(--vf-action-border)] hover:bg-[var(--vf-surface-3)] hover:text-[var(--mantine-color-text)] disabled:cursor-not-allowed disabled:opacity-45 md:h-7 md:w-auto md:gap-1 md:rounded-lg md:px-2 md:text-[11px] md:font-semibold"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  )
}

function MetricBlock({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <div className={cn(align === 'right' && 'text-right')}>
      <p className="text-[8px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-dimmed)] md:text-[9px]">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-[var(--mantine-color-text)] md:text-sm">{value}</p>
    </div>
  )
}

function MovementNumberBadge({
  number,
  active = false,
  complete = false,
}: {
  number: number
  active?: boolean
  complete?: boolean
}) {
  if (complete) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
        <Check size={10} />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold',
        active
          ? 'bg-[var(--mantine-primary-color-filled)] text-white'
          : 'bg-[var(--vf-surface-3)] text-[var(--mantine-color-dimmed)]',
      )}
    >
      {number}
    </span>
  )
}

function QuickAdjustButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-1.5 py-1 text-[9px] font-bold text-[var(--mantine-color-dimmed)] transition hover:border-[var(--vf-action-border)] hover:bg-[var(--vf-surface-2)] md:rounded-md md:px-2 md:py-0.5 md:text-[10px]"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function isMovementComplete(movement: MovementSlot) {
  return movement.sets.length > 0 && movement.sets.every((set) => set.completed)
}

function getTopSet(movement: MovementSlot) {
  return movement.sets.find((set) => set.isTopSet || set.isAmrap) ?? movement.sets.at(-1)
}

function getProgressionHint(movement: MovementSlot, topSet?: SetLog) {
  if (!topSet) return 'Complete the prescribed work and log RIR so recommendations stay accurate.'
  if (movement.role === 'main') {
    return `${formatSetTarget(topSet)} is the key set. Extra clean reps with honest RIR can support a stronger progression call.`
  }
  return 'Stay inside the target rep range and record RIR to make accessory progression reviewable later.'
}

function formatSetTarget(set: SetLog, units?: string, includeUnit = true) {
  const load = set.targetLoad ?? set.actualLoad
  const reps = set.targetReps ?? (set.targetRepMin && set.targetRepMax ? `${set.targetRepMin}-${set.targetRepMax}` : set.targetRepMin)
  const loadText = load == null ? '—' : `${formatNumber(load)}${includeUnit && units ? ` ${units}` : ''}`
  const repsText = reps == null ? '—' : `${reps}${set.isAmrap ? '+' : ''}`
  return `${loadText} × ${repsText}`
}

function formatHistorySet(set: MovementHistorySet, units?: string) {
  const load = set.actualLoad ?? set.targetLoad
  const reps = set.actualReps ?? set.targetReps ?? (set.targetRepMin && set.targetRepMax ? `${set.targetRepMin}-${set.targetRepMax}` : set.targetRepMin)
  const loadText = load == null ? '—' : `${formatNumber(load)}${units ? ` ${units}` : ''}`
  const repsText = reps == null ? '—' : `${reps}${set.isAmrap ? '+' : ''}`
  const rirText = typeof set.actualRir === 'number' ? ` @ RIR ${set.actualRir}` : ''
  return `${loadText} × ${repsText}${rirText}`
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value)) return 0
  if (!step) return value
  return Math.round(value / step) * step
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function formatEquipmentLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
