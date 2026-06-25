import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import {
  Calculator,
  ChevronDown,
  History,
  Plus,
  Repeat2,
} from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import { addExerciseSetFn } from '~/domains/session/server/session-functions'
import type { MovementSlot, WorkoutSession } from '~/shared/types'
import {
  MetricBlock,
  MovementNumberBadge,
  RolePill,
  ToolButton,
} from './LiveSessionControls'
import { LiveSetRow } from './LiveSetRow'
import { MovementHistoryModal } from './MovementHistoryModal'
import { MovementSwapModal } from './MovementSwapModal'
import {
  formatSetTarget,
  getProgressionHint,
  getTopSet,
  isMovementComplete,
  SET_GRID_CLASS,
} from './live-session-utils'

export function LiveMovementCard({
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
  const queryClient = useQueryClient()
  const topSet = getTopSet(movement)
  const firstIncompleteIndex = movement.sets.find((set) => !set.completed)?.setIndex
  const [selectedSetIndex, setSelectedSetIndex] = useState(
    firstIncompleteIndex ?? movement.sets[0]?.setIndex ?? 1,
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const [suggestedRirBySetIndex, setSuggestedRirBySetIndex] = useState<Record<number, number | undefined>>({})
  const addSetMutation = useMutation({
    mutationKey: ['addExerciseSet', session.sessionId, movement.id],
    mutationFn: () =>
      addExerciseSetFn({
        data: {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          clientMutationId: crypto.randomUUID(),
        },
      }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Set not added',
        message: getApiErrorMessage(error, 'Unable to add another set.'),
      })
    },
    onSuccess: (nextSession) => {
      const nextMovement = nextSession.movements.find((item) => item.id === movement.id)
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
      const nextSetIndex = nextMovement?.sets.at(-1)?.setIndex
      if (nextSetIndex) setSelectedSetIndex(nextSetIndex)
    },
  })

  const carryRirToNextSet = (setIndex: number, value: number) => {
    const nextSet = movement.sets.find((candidate) => candidate.setIndex > setIndex && !candidate.completed)
    if (!nextSet || typeof nextSet.actualRir === 'number') return
    setSuggestedRirBySetIndex((current) => ({ ...current, [nextSet.setIndex]: value }))
  }

  if (!isActive) {
    return <CollapsedMovementCard movement={movement} movementNumber={movementNumber} onSelect={onSelect} />
  }

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-color-default)] md:border-2 md:p-4 md:shadow-[var(--vf-shadow-card)]">
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

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-3 py-2 md:mb-3 md:px-3 md:py-2.5">
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
        className="mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--mantine-color-default-border)] py-2 text-[10px] font-bold text-[var(--mantine-color-dimmed)] transition hover:bg-[var(--vf-surface-2)] disabled:cursor-not-allowed disabled:opacity-45 md:mx-0 md:mb-0 md:mt-3 md:w-full md:rounded-lg md:bg-[var(--vf-surface-2)] md:py-1.5 md:text-[11px] md:hover:bg-[var(--vf-surface-3)]"
        title={movement.role === 'accessory' ? 'Add another accessory set' : 'Extra sets can only be added to accessories'}
        disabled={movement.role !== 'accessory' || addSetMutation.isPending}
        onClick={() => addSetMutation.mutate()}
      >
        <Plus size={12} />
        {addSetMutation.isPending ? 'Adding set...' : 'Add set'}
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
        'flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-4 py-3 text-left text-[var(--mantine-color-text)] transition hover:border-[var(--vf-action-border)] md:shadow-[var(--vf-shadow-card)]',
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
