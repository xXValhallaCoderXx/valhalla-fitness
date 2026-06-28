import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { Button } from '@mantine/core'
import {
  Calculator,
  ChevronDown,
  History,
  Plus,
  Repeat2,
} from 'lucide-react'
import { useState } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
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
    <article
      data-tour="live-movement"
      className="overflow-hidden rounded-xl border md:border-2 md:p-4"
      style={{
        borderColor: 'var(--mantine-primary-color-filled)',
        backgroundColor: 'var(--mantine-color-default)',
        boxShadow: 'var(--vf-shadow-card)',
      }}
    >
      <div className="border-b px-4 pb-3 pt-4 md:border-0 md:p-0" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 md:justify-start md:gap-4">
          <div className="min-w-0">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <Text component="h2" size="md" fw={900} truncate>
                {movement.movementName}
              </Text>
              <RolePill role={movement.role} />
            </div>
            <Caption component="p" size="xs">
              {movement.targetSummary} · {session.programTitle}
            </Caption>
            {movement.performedMovementId && movement.performedMovementId !== movement.movementId ? (
              <Caption component="p" mt={4} fw={700} c="var(--vf-warning-text)">
                Performed as {movement.performedMovementName}
              </Caption>
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

        <Panel surface="inset" className="md:mb-3" px="sm" py="xs">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-x-8">
            <MetricBlock label="Top set today" value={topSet ? formatSetTarget(topSet, session.units) : 'No top set'} />
            <div
              className="hidden h-7 w-px md:block"
              style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
              aria-hidden="true"
            />
            <MetricBlock
              label="Last comparable"
              value={movement.previous?.label ?? 'No previous comparable'}
            />
          </div>
          <Caption
            component="div"
            className="mt-2 border-t pt-2"
            lh={1.5}
            style={{ borderColor: 'var(--mantine-color-default-border)' }}
          >
            <Text component="span" fw={700}>Progression hint:</Text>{' '}
            {getProgressionHint(movement, topSet)}
          </Caption>
        </Panel>
      </div>

      <div className={cn(SET_GRID_CLASS, 'justify-stretch px-4 pb-1 pt-2.5 text-center sm:justify-center md:justify-stretch md:gap-2 md:px-1 md:pt-0')}>
        <SectionLabel component="span" size="0.5625rem">#</SectionLabel>
        <SectionLabel component="span" size="0.5625rem">{session.units}</SectionLabel>
        <SectionLabel component="span" size="0.5625rem">Reps</SectionLabel>
        <SectionLabel component="span" size="0.5625rem" className="hidden md:block">Target</SectionLabel>
        <SectionLabel component="span" size="0.5625rem">RIR</SectionLabel>
        <span />
      </div>
      <Caption component="p" className="px-4 pb-1.5 md:px-1" size="0.625rem" lh={1.2}>
        <Text component="span" fw={700}>RIR</Text> = how many more reps you could have done. Log it after each set.
      </Caption>

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

      <Button
        type="button"
        className="mx-3 mb-3 w-[calc(100%-1.5rem)] md:mx-0 md:mb-0 md:mt-3 md:w-full"
        variant="default"
        title={movement.role === 'accessory' ? 'Add another accessory set' : 'Extra sets can only be added to accessories'}
        disabled={movement.role !== 'accessory' || addSetMutation.isPending}
        onClick={() => addSetMutation.mutate()}
      >
        <Plus size={12} />
        {addSetMutation.isPending ? 'Adding set...' : 'Add set'}
      </Button>
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
        'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition',
        complete && 'opacity-55',
      )}
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default)',
        color: 'var(--mantine-color-text)',
        boxShadow: 'var(--vf-shadow-card)',
      }}
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <MovementNumberBadge number={movementNumber} complete={complete} />
          <Text component="h3" size="sm" fw={900} truncate className={cn(complete && 'line-through')}>
            {movement.movementName}
          </Text>
          <RolePill role={movement.role} subtle />
        </div>
        <Caption component="p" className="pl-7" size="xs">
          {totalSets} sets · {movement.targetSummary}
          {movement.previous?.label ? <span className="hidden sm:inline"> · {movement.previous.label}</span> : null}
        </Caption>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Caption component="span" fw={700}>
          {completedSets}/{totalSets}
        </Caption>
        <ChevronDown className="-rotate-90" style={{ color: 'var(--mantine-color-dimmed)' }} size={14} />
      </div>
    </button>
  )
}
