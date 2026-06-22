import { Modal } from '@mantine/core'
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
import { useState, type ReactNode } from 'react'
import { TextInput } from '~/components/atoms'
import { getApiErrorMessage } from '~/lib/api-error'
import { cn } from '~/lib/cn'
import { formatCompactDate, formatRelativeTime } from '~/lib/dates'
import { movementHistoryQueryOptions } from '~/lib/query-options'
import { patchSetInSession, sessionCompletion, type SetPatch } from '~/lib/session-cache'
import { upsertSetLogFn } from '~/server/api'
import type { MovementHistoryEntry, MovementHistorySet, MovementSlot, SetLog, WorkoutSession } from '~/types/training'
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
    <div className="-mx-4 -my-5 min-h-[calc(100vh-3.5rem)] bg-[#0F0F11] text-[#F2F2F3] md:mx-auto md:my-0 md:min-h-0 md:max-w-[920px] md:rounded-2xl md:border md:border-[#E5E7EB] md:bg-white md:text-[#111827] md:shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
      <SessionContextBar
        session={session}
        progress={progress}
        completedMovements={completedMovements}
        finishLabel={finishLabel}
        finishDisabled={finishDisabled}
        onFinish={onFinish}
      />

      <div className="h-1 bg-[#242428] md:bg-[#F4F5F7]" aria-hidden="true">
        <div
          className="h-full bg-[#4F8EF7] transition-all md:bg-[#2563EB]"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="md:flex md:min-h-[560px]">
        <MovementRail
          session={session}
          activeMovementId={selectedMovementId}
          onSelectMovement={onSelectMovement}
        />

        <main className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-3 py-3 pb-24 md:max-h-[calc(100vh-12rem)] md:space-y-3 md:bg-[#F4F5F7] md:p-4 md:pb-4">
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
    <div className="sticky top-12 z-20 border-b border-[#2E2E34] bg-[#1A1A1E]/95 px-4 py-2.5 backdrop-blur md:static md:border-[#E5E7EB] md:bg-white md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 md:hidden">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-[#0F0F11]">
              <Dumbbell size={11} />
            </div>
            <span className="text-xs font-bold tracking-tight text-[#F2F2F3]">Valhalla Fitness</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div>
              <h1 className="truncate text-[11px] font-extrabold leading-tight text-[#F2F2F3] md:text-sm md:text-[#111827]">
                {session.title}
              </h1>
              <p className="mt-0.5 text-[9px] text-[#9A9AA6] md:text-xs md:text-[#6B7280]">
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
            className="rounded-lg bg-[#4F8EF7] px-2.5 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-[#3d7de4] disabled:opacity-50 md:bg-[#2563EB] md:px-3 md:text-xs md:hover:bg-[#1d4ed8]"
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
    <aside className="hidden w-48 shrink-0 flex-col border-r border-[#E5E7EB] bg-[#F4F5F7] px-2 py-3 md:flex">
      <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">Movements</p>
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
                  ? 'border border-[#2563EB] bg-blue-50 text-[#2563EB]'
                  : 'text-[#6B7280] hover:bg-white',
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
    <article className="overflow-hidden rounded-2xl border border-[#4F8EF7] bg-[#1A1A1E] md:rounded-xl md:border-2 md:border-[#2563EB] md:bg-white md:p-4 md:shadow-sm">
      <div className="border-b border-[#2E2E34] px-4 pb-3 pt-4 md:border-0 md:p-0">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 md:justify-start md:gap-4">
          <div className="min-w-0">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[15px] font-extrabold text-[#F2F2F3] md:text-base md:text-[#111827]">
                {movement.movementName}
              </h2>
              <RolePill role={movement.role} />
            </div>
            <p className="text-[10px] text-[#9A9AA6] md:text-xs md:text-[#6B7280]">
              {movement.targetSummary} · {session.programTitle}
            </p>
            {movement.performedMovementId && movement.performedMovementId !== movement.movementId ? (
              <p className="mt-1 text-[10px] font-semibold text-amber-300 md:text-amber-600">
                Performed as {movement.performedMovementName}
              </p>
            ) : null}
          </div>
          <div className="flex gap-1.5 md:pt-0.5">
            <ToolButton title="Plate math" icon={<Calculator size={13} />} label="Plates" />
            <ToolButton title="Swap movement" icon={<Repeat2 size={13} />} label="Swap" />
            <ToolButton title="Movement history" icon={<History size={13} />} label="History" onClick={() => setHistoryOpen(true)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2E2E34] bg-[#242428] px-3 py-2 md:mb-3 md:rounded-lg md:border-[#E5E7EB] md:bg-[#F4F5F7] md:px-3 md:py-2.5">
          <MetricBlock label="Top set today" value={topSet ? formatSetTarget(topSet, session.units) : 'No top set'} />
          <div className="hidden h-7 w-px bg-[#2E2E34] md:block md:bg-[#E5E7EB]" aria-hidden="true" />
          <MetricBlock
            label="Last comparable"
            value={movement.previous?.label ?? 'No previous comparable'}
            align="right"
          />
          <div className="w-full border-t border-[#2E2E34] pt-2 text-[10px] leading-relaxed text-[#9A9AA6] md:border-[#E5E7EB] md:text-[#6B7280]">
            <span className="font-bold text-[#F2F2F3] md:text-[#111827]">Progression hint:</span>{' '}
            {getProgressionHint(movement, topSet)}
          </div>
        </div>
      </div>

      <div className={cn(SET_GRID_CLASS, 'justify-stretch px-4 pb-1 pt-2.5 text-center text-[8px] font-extrabold uppercase tracking-wider text-[#9A9AA6] sm:justify-center md:justify-stretch md:gap-2 md:px-1 md:pt-0 md:text-[9px] md:text-[#6B7280]')}>
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

      <button
        type="button"
        className="mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2E2E34] py-2 text-[10px] font-bold text-[#9A9AA6] transition hover:bg-[#242428] md:mx-0 md:mb-0 md:mt-3 md:w-full md:rounded-lg md:border-[#E5E7EB] md:bg-[#F4F5F7] md:py-1.5 md:text-[11px] md:text-[#6B7280] md:hover:bg-white"
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
        'flex w-full items-center justify-between gap-3 rounded-2xl border border-[#2E2E34] bg-[#1A1A1E] px-4 py-3 text-left transition hover:border-[#4F8EF7] md:rounded-xl md:border-[#E5E7EB] md:bg-white md:shadow-sm md:hover:border-gray-300',
        complete && 'opacity-55',
      )}
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <MovementNumberBadge number={movementNumber} complete={complete} />
          <h3 className={cn('truncate text-sm font-extrabold text-[#F2F2F3] md:text-[#111827]', complete && 'line-through')}>
            {movement.movementName}
          </h3>
          <RolePill role={movement.role} subtle />
        </div>
        <p className="pl-7 text-[10px] text-[#9A9AA6] md:text-xs md:text-[#6B7280]">
          {totalSets} sets · {movement.targetSummary}
          {movement.previous?.label ? <span className="hidden sm:inline"> · {movement.previous.label}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold text-[#9A9AA6] md:text-[#6B7280]">
          {completedSets}/{totalSets}
        </span>
        <ChevronDown className="-rotate-90 text-[#9A9AA6]" size={14} />
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
        rowState === 'complete' && 'border-[#2E2E34] bg-[#242428] opacity-65 md:border-[#E5E7EB] md:bg-[#F4F5F7]',
        rowState === 'current' && 'border-[#4F8EF7] bg-[#242428] md:border-[#2563EB] md:bg-blue-50',
        rowState === 'future' && 'border-dashed border-[#2E2E34] md:border-[#E5E7EB] md:bg-white',
        rowState === 'failed' && 'border-red-500/50 bg-red-500/10',
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
        <div className={cn('text-center text-[9px] font-extrabold text-[#9A9AA6]', rowState === 'current' && 'text-[#4F8EF7] md:text-[#2563EB]')}>
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

        <div className="hidden text-center text-[10px] text-[#9A9AA6] md:block md:text-[#6B7280]">
          {set.isTopSet || set.isAmrap ? (
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-purple-400 md:text-purple-600">
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
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : 'border-[#2E2E34] bg-[#1A1A1E] text-[#9A9AA6] hover:border-[#4F8EF7] md:border-[#E5E7EB] md:bg-white md:text-[#6B7280] md:hover:bg-[#F4F5F7]',
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
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7 text-[9px] text-[#9A9AA6] md:gap-2 md:pl-8 md:text-[#6B7280]">
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
        'live-session-input w-full rounded-lg border border-[#2E2E34] bg-[#1A1A1E] py-1.5 text-center text-sm font-bold text-[#F2F2F3] outline-none transition md:border-[#E5E7EB] md:bg-white md:px-2 md:py-1 md:text-[#111827]',
        muted && 'font-semibold text-[#9A9AA6] md:text-[#6B7280]',
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
                ? 'border-[#4F8EF7] bg-[#4F8EF7] text-white md:border-[#2563EB] md:bg-[#2563EB]'
                : 'border-[#2E2E34] bg-[#1A1A1E] text-[#9A9AA6] hover:border-[#4F8EF7] md:border-[#E5E7EB] md:bg-white md:text-[#6B7280] md:hover:bg-[#F4F5F7]',
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
    <label className="grid gap-1 rounded-2xl border border-[#2E2E34] bg-[#1A1A1E] p-4 md:rounded-xl md:border-[#E5E7EB] md:bg-white">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#9A9AA6] md:text-[#6B7280]">
        Session notes
      </span>
      <TextInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optional notes"
        className="border-[#2E2E34] bg-[#242428] text-[#F2F2F3] md:border-[#E5E7EB] md:bg-[#F4F5F7] md:text-[#111827]"
      />
    </label>
  )
}

function StatusPanel({ tone, children }: { tone: 'warning' | 'danger'; children: ReactNode }) {
  return (
    <p
      className={cn(
        'rounded-2xl border p-3 text-xs md:rounded-xl',
        tone === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-200 md:text-amber-700',
        tone === 'danger' && 'border-red-500/30 bg-red-500/10 text-red-200 md:text-red-700',
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
          ? 'border-red-100 bg-red-50 text-[#EF4444]'
          : 'border-[#E5E7EB] bg-[#F4F5F7] text-[#6B7280]',
      )}
    >
      {children}
    </span>
  )
}

function RolePill({ role, subtle = false }: { role: MovementSlot['role']; subtle?: boolean }) {
  const roleColor = role === 'main' ? 'text-purple-300 md:text-purple-600' : 'text-[#9A9AA6] md:text-[#6B7280]'
  const roleBg = role === 'main' ? 'bg-purple-900/30 md:bg-purple-50' : 'bg-[#242428] md:bg-[#F4F5F7]'
  return (
    <span
      className={cn(
        'rounded border border-[#2E2E34] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider md:border-[#E5E7EB] md:text-[9px]',
        roleColor,
        roleBg,
        subtle && 'opacity-90',
      )}
    >
      {role}
    </span>
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
        content: '!border !border-[var(--border)] !bg-[var(--surface)] !text-[var(--text)]',
        header: '!bg-[var(--surface)] !text-[var(--text)]',
        title: 'text-lg font-bold !text-[var(--text)]',
        body: '!text-[var(--text)]',
        close: '!text-[var(--muted)] hover:!bg-[var(--surface-2)] hover:!text-[var(--text)]',
      }}
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{entry.sessionTitle}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {entry.programTitle ?? 'Training session'} · {entry.targetSummary}
          </p>
        </div>
        <span className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-right">
          <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{formatCompactDate(date)}</span>
          <span className="block text-[10px] font-semibold text-[var(--muted)]">{formatRelativeTime(date)}</span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {displaySets.map((set) => (
          <span
            key={set.id}
            className={cn(
              'rounded-lg border px-2 py-1 text-[11px] font-bold',
              set.isTopSet || set.isAmrap
                ? 'border-purple-500/30 bg-purple-500/10 text-purple-300 md:text-purple-700'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]',
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
    <p className={cn('rounded-xl border p-3 text-sm', tone === 'danger' ? 'border-red-500/30 bg-red-500/10 text-red-200 md:text-red-700' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]')}>
      {children}
    </p>
  )
}

function ToolButton({ title, icon, label, onClick }: { title: string; icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#2E2E34] bg-[#242428] text-[#9A9AA6] transition hover:border-[#4F8EF7] md:h-7 md:w-auto md:gap-1 md:rounded-lg md:border-[#E5E7EB] md:bg-[#F4F5F7] md:px-2 md:text-[11px] md:font-semibold md:text-[#6B7280] md:hover:bg-white md:hover:text-[#111827]"
      title={title}
      aria-label={title}
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
      <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#9A9AA6] md:text-[9px] md:text-[#6B7280]">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-[#F2F2F3] md:text-sm md:text-[#111827]">{value}</p>
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
          ? 'bg-[#4F8EF7] text-white md:bg-[#2563EB]'
          : 'bg-[#2E2E34] text-[#9A9AA6] md:bg-[#E5E7EB] md:text-[#6B7280]',
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
      className="rounded-lg border border-[#2E2E34] bg-[#1A1A1E] px-1.5 py-1 text-[9px] font-bold text-[#9A9AA6] transition hover:border-[#4F8EF7] md:rounded-md md:border-[#E5E7EB] md:bg-white md:px-2 md:py-0.5 md:text-[10px] md:text-[#6B7280] md:hover:bg-[#F4F5F7]"
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
