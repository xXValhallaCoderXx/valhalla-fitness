import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { Button } from '@mantine/core'
import {
  Calculator,
  History,
  Info,
  Plus,
  Repeat2,
  Trash2,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Caption, ConfirmDialog, InfoHint, Panel, SectionLabel, Text } from '~/components'
import { useAddExerciseSet } from '~/domains/session/lib/useAddExerciseSet'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import { removeAdHocExerciseFn } from '~/domains/session/server/session-functions'
import type { MovementSlot, WorkoutSession } from '~/shared/types'
import { CollapsedMovementCard } from './CollapsedMovementCard'
import {
  RolePill,
  ToolButton,
} from './LiveSessionControls'
import { LiveSetRow } from './LiveSetRow'
import { MovementHistoryModal } from './MovementHistoryModal'
import { MovementSwapModal } from './MovementSwapModal'
import { PlateCalculatorModal } from './PlateCalculatorModal'
import {
  formatPreviousShort,
  formatSetTarget,
  getTopSet,
  seedLoadForSet,
  SET_GRID_CLASS,
} from './live-session-utils'

export function LiveMovementCard({
  session,
  movement,
  isActive,
  movementNumber,
  onSelect,
  sortHandle,
  onRemoveAdded,
  managementPending = false,
}: {
  session: WorkoutSession
  movement: MovementSlot
  isActive: boolean
  movementNumber: number
  onSelect: () => void
  sortHandle?: ReactNode
  onRemoveAdded?: () => void
  managementPending?: boolean
}) {
  const queryClient = useQueryClient()
  const topSet = getTopSet(movement)
  const firstIncompleteIndex = movement.sets.find((set) => !set.completed)?.setIndex
  const [selectedSetIndex, setSelectedSetIndex] = useState(
    firstIncompleteIndex ?? movement.sets[0]?.setIndex ?? 1,
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const [plateOpen, setPlateOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [showRirHelp, setShowRirHelp] = useState(false)
  const [suggestedRirBySetIndex, setSuggestedRirBySetIndex] = useState<Record<number, number | undefined>>({})
  const isAdHoc = Boolean(session.isAdHoc)
  const canAddSet = movement.role === 'accessory' || isAdHoc
  const addSetMutation = useAddExerciseSet(session, movement)

  const removeMutation = useMutation({
    mutationKey: ['removeAdHocExercise', session.sessionId, movement.id],
    mutationFn: () =>
      removeAdHocExerciseFn({
        data: { sessionId: session.sessionId, exerciseLogId: movement.id },
      }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Exercise not removed',
        message: getApiErrorMessage(error, 'Unable to remove this exercise.'),
      })
    },
    onSuccess: (nextSession) => {
      setRemoveOpen(false)
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
    },
  })

  const carryRirToNextSet = (setIndex: number, value: number) => {
    const nextSet = movement.sets.find((candidate) => candidate.setIndex > setIndex && !candidate.completed)
    if (!nextSet || typeof nextSet.actualRir === 'number') return
    setSuggestedRirBySetIndex((current) => ({ ...current, [nextSet.setIndex]: value }))
  }

  if (!isActive) {
    return (
      <CollapsedMovementCard
        movement={movement}
        movementNumber={movementNumber}
        units={session.units}
        onSelect={onSelect}
        sortHandle={sortHandle}
        onRemoveAdded={onRemoveAdded}
        managementPending={managementPending}
      />
    )
  }

  const plateSeedSet = movement.sets.find((set) => set.setIndex === selectedSetIndex) ?? movement.sets[0]
  const plateSeed = plateSeedSet ? seedLoadForSet(movement, plateSeedSet) : 0

  return (
    <article
      data-tour="live-movement"
      className="overflow-hidden rounded-2xl border md:border-2 md:p-4"
      style={{
        borderColor: 'var(--mantine-primary-color-filled)',
        backgroundColor: 'var(--mantine-color-default)',
        boxShadow: 'var(--vf-shadow-card)',
      }}
    >
      <div className="border-b px-4 pb-3 pt-4 md:border-0 md:p-0" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 md:gap-4">
          <div className="min-w-0">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <Text component="h2" size="md" fw={900} truncate>
                {movement.movementName}
              </Text>
              <RolePill role={movement.role} />
            </div>
            <Caption component="p" size="xs">
              {isAdHoc ? movement.targetSummary : `${movement.targetSummary} · ${session.programTitle}`}
            </Caption>
            {movement.performedMovementId && movement.performedMovementId !== movement.movementId ? (
              <Caption component="p" mt={4} fw={700} c="var(--vf-warning-text)">
                Performed as {movement.performedMovementName}
              </Caption>
            ) : null}
          </div>
          <div className="flex gap-1.5 md:pt-0.5">
            {sortHandle}
            <ToolButton title="Plate math" icon={<Calculator size={13} />} label="Plates" onClick={() => setPlateOpen(true)} />
            <ToolButton
              title={movement.role === 'main' ? 'Main lifts cannot be swapped' : 'Swap movement'}
              icon={<Repeat2 size={13} />}
              label="Swap"
              disabled={movement.role === 'main' || managementPending}
              onClick={() => setSwapOpen(true)}
            />
            <ToolButton title="Movement history" icon={<History size={13} />} label="History" onClick={() => setHistoryOpen(true)} />
            {isAdHoc || movement.isAdded ? (
              <ToolButton
                title="Remove exercise"
                icon={<Trash2 size={13} />}
                label="Remove"
                disabled={managementPending}
                onClick={isAdHoc ? () => setRemoveOpen(true) : onRemoveAdded}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 md:mb-1">
          {movement.previous ? (
            <span className="inline-flex items-center gap-1">
              <Caption component="span">Last time</Caption>
              <Text component="span" size="xs" fw={700}>
                {formatPreviousShort(movement.previous, session.units)}
              </Text>
              <InfoHint label="Last session details" width={260}>{movement.previous.label}</InfoHint>
            </span>
          ) : (
            <Caption component="span">No previous session yet</Caption>
          )}
          {topSet ? (
            <Caption component="span">
              · key set{' '}
              <Text component="span" size="xs" fw={700}>
                {formatSetTarget(topSet, session.units)}
              </Text>
            </Caption>
          ) : null}
        </div>
      </div>

      <div className={cn(SET_GRID_CLASS, 'items-center gap-1.5 px-7 pb-1 pt-2.5 md:gap-2 md:px-2 md:pt-0')}>
        <SectionLabel component="span" size="0.5625rem" ta="center">#</SectionLabel>
        <SectionLabel component="span" size="0.5625rem">Target</SectionLabel>
        <SectionLabel component="span" size="0.5625rem" ta="center">{session.units}</SectionLabel>
        <SectionLabel component="span" size="0.5625rem" ta="center">Reps</SectionLabel>
        <button
          type="button"
          className="flex items-center justify-center gap-0.5"
          onClick={() => setShowRirHelp((open) => !open)}
          aria-expanded={showRirHelp}
          aria-label="What is RIR?"
          title="What is RIR?"
        >
          <SectionLabel component="span" size="0.5625rem" c="var(--vf-action-text)">RIR</SectionLabel>
          <Info size={11} color="var(--vf-action-text)" />
        </button>
        <span />
      </div>
      {showRirHelp ? (
        <Panel surface="inset" className="mx-4 mb-2 mt-1 md:mx-0" px="sm" py="xs">
          <Caption component="p" lh={1.5}>
            <Text component="span" fw={700}>RIR = Reps In Reserve.</Text> After a set, how many more good reps
            could you have done? Logging it honestly is how Sheetless decides when to add weight.
          </Caption>
        </Panel>
      ) : null}

      <div className="space-y-2 px-4 pb-3 md:space-y-1.5 md:px-0 md:pb-0">
        {movement.sets.map((set) => (
          <LiveSetRow
            key={`${movement.id}-${set.setIndex}`}
            session={session}
            movement={movement}
            set={set}
            isSelected={set.setIndex === selectedSetIndex}
            suggestedRir={suggestedRirBySetIndex[set.setIndex]}
            disabled={managementPending}
            onSelect={() => setSelectedSetIndex(set.setIndex)}
            onRirSelected={carryRirToNextSet}
          />
        ))}
      </div>

      <MovementHistoryModal open={historyOpen} movement={movement} onClose={() => setHistoryOpen(false)} />
      <PlateCalculatorModal
        open={plateOpen}
        onClose={() => setPlateOpen(false)}
        units={session.units}
        movementName={movement.movementName}
        initialTarget={plateSeed}
      />
      {swapOpen ? (
        <MovementSwapModal
          open={swapOpen}
          session={session}
          movement={movement}
          onClose={() => setSwapOpen(false)}
        />
      ) : null}
      <ConfirmDialog
        open={removeOpen}
        title={`Remove ${movement.movementName}?`}
        confirmLabel="Remove exercise"
        cancelLabel="Keep it"
        tone="danger"
        isPending={removeMutation.isPending}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => removeMutation.mutate()}
      >
        Its logged sets are deleted with it. You can always add it back from the catalog.
      </ConfirmDialog>

      <Button
        type="button"
        className="mx-3 mb-3 w-[calc(100%-1.5rem)] md:mx-0 md:mb-0 md:mt-3 md:w-full"
        variant="default"
        title={canAddSet ? 'Add another set' : 'Extra sets can only be added to accessories'}
        disabled={!canAddSet || addSetMutation.isPending || managementPending}
        onClick={() =>
          addSetMutation.mutate(undefined, {
            onSuccess: (nextSession) => {
              const nextMovement = nextSession.movements.find((item) => item.id === movement.id)
              const nextSetIndex = nextMovement?.sets.at(-1)?.setIndex
              if (nextSetIndex) setSelectedSetIndex(nextSetIndex)
            },
          })
        }
      >
        <Plus size={12} />
        {addSetMutation.isPending ? 'Adding set...' : 'Add set'}
      </Button>
    </article>
  )
}
