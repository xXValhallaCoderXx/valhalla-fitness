import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Checkbox } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useIsMutating, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog, Text } from '~/components'
import { reorderAddedAccessories } from '~/domains/session/lib/accessories'
import {
  removeSessionAccessoryFn,
  reorderSessionAccessoriesFn,
} from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type { MovementSlot, SwapScope, TodayPayload, WorkoutSession } from '~/shared/types'
import { LiveMovementCard } from './LiveMovementCard'
import { MovementDragPreview, SortableAddedMovement } from './SortableAddedMovement'

type LiveMovementListProps = {
  session: WorkoutSession
  activeMovementId: string
  onSelectMovement: (movementId: string) => void
}

export function LiveMovementList({
  session,
  activeMovementId,
  onSelectMovement,
}: LiveMovementListProps) {
  const queryClient = useQueryClient()
  const conflictingMutationCount = useIsMutating({
    predicate: (mutation) => {
      const key = mutation.options.mutationKey
      return Array.isArray(key)
        && key[1] === session.sessionId
        && ['setLog', 'addExerciseSet', 'substituteMovement', 'addSessionAccessory'].includes(String(key[0]))
    },
  })
  const currentAddedSlotIds = useMemo(
    () => session.isAdHoc
      ? []
      : session.movements.filter((movement) => movement.isAdded).map(movementSlotId),
    [session.isAdHoc, session.movements],
  )
  const [orderedSlotIds, setOrderedSlotIds] = useState(currentAddedSlotIds)
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null)
  const [movementToRemove, setMovementToRemove] = useState<MovementSlot | null>(null)
  const [removeFromFuture, setRemoveFromFuture] = useState(false)

  useEffect(() => {
    setOrderedSlotIds(currentAddedSlotIds)
  }, [currentAddedSlotIds])

  const displayMovements = useMemo(() => {
    if (session.isAdHoc) return session.movements
    try {
      return reorderAddedAccessories(session.movements, orderedSlotIds)
    } catch {
      return session.movements
    }
  }, [orderedSlotIds, session.isAdHoc, session.movements])
  const hasPersistentAdditions = displayMovements.some(
    (movement) => movement.isAdded && movement.addedScope === 'phase_slot',
  )

  const reorderMutation = useMutation({
    mutationKey: ['reorderSessionAccessories', session.sessionId],
    mutationFn: (nextSlotIds: string[]) =>
      reorderSessionAccessoriesFn({
        data: { sessionId: session.sessionId, orderedSlotIds: nextSlotIds },
      }),
    onError: async (error) => {
      setOrderedSlotIds(currentAddedSlotIds)
      await invalidateManagementCaches(queryClient, session.sessionId, hasPersistentAdditions)
      notifications.show({
        color: 'danger',
        title: 'Order not saved',
        message: getApiErrorMessage(error, 'Unable to reorder these accessories.'),
      })
    },
    onSuccess: (nextSession) => {
      updateSessionCaches(queryClient, nextSession)
      if (hasPersistentAdditions) invalidateProgramCaches(queryClient)
    },
  })

  const removeMutation = useMutation({
    mutationKey: ['removeSessionAccessory', session.sessionId],
    mutationFn: ({ movement, scope }: { movement: MovementSlot; scope: SwapScope }) =>
      removeSessionAccessoryFn({
        data: {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          scope,
        },
      }),
    onError: async (error, input) => {
      setMovementToRemove(null)
      setRemoveFromFuture(false)
      await invalidateManagementCaches(queryClient, session.sessionId, input.scope === 'phase_slot')
      notifications.show({
        color: 'danger',
        title: 'Accessory not removed',
        message: getApiErrorMessage(error, 'Unable to remove this accessory.'),
      })
    },
    onSuccess: (nextSession, input) => {
      const removedIndex = displayMovements.findIndex((movement) => movement.id === input.movement.id)
      updateSessionCaches(queryClient, nextSession)
      if (input.scope === 'phase_slot') invalidateProgramCaches(queryClient)
      if (activeMovementId === input.movement.id) {
        const nextIndex = Math.min(Math.max(removedIndex, 0), nextSession.movements.length - 1)
        onSelectMovement(nextSession.movements[nextIndex]?.id ?? '')
      }
      setMovementToRemove(null)
      setRemoveFromFuture(false)
      notifications.show({
        color: 'success',
        title: 'Accessory removed',
        message: input.scope === 'phase_slot'
          ? 'Removed from this session and future appearances.'
          : 'Removed from this session.',
      })
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const managementPending = reorderMutation.isPending || removeMutation.isPending
  const managementDisabled = managementPending || conflictingMutationCount > 0

  const draggedMovement = draggedSlotId
    ? displayMovements.find((movement) => movementSlotId(movement) === draggedSlotId) ?? null
    : null

  const startRemove = (movement: MovementSlot) => {
    setRemoveFromFuture(false)
    setMovementToRemove(movement)
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraggedSlotId(String(active.id))
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedSlotId(null)
    if (!over || active.id === over.id || managementDisabled) return
    const fromIndex = orderedSlotIds.indexOf(String(active.id))
    const toIndex = orderedSlotIds.indexOf(String(over.id))
    if (fromIndex < 0 || toIndex < 0) return
    const nextSlotIds = arrayMove(orderedSlotIds, fromIndex, toIndex)
    setOrderedSlotIds(nextSlotIds)
    reorderMutation.mutate(nextSlotIds)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={() => setDraggedSlotId(null)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedSlotIds} strategy={verticalListSortingStrategy}>
          {displayMovements.map((movement) => {
            return movement.isAdded && !session.isAdHoc ? (
              <SortableAddedMovement
                key={movement.id}
                session={session}
                movement={movement}
                isActive={movement.id === activeMovementId}
                movementNumber={movement.orderIndex + 1}
                disabled={managementDisabled || orderedSlotIds.length < 2}
                onSelect={() => onSelectMovement(movement.id)}
                onRemove={() => startRemove(movement)}
                managementPending={managementDisabled}
              />
            ) : (
              <div key={movement.id} data-testid="movement-card" data-movement-slot={movementSlotId(movement)}>
                <LiveMovementCard
                  session={session}
                  movement={movement}
                  isActive={movement.id === activeMovementId}
                  movementNumber={movement.orderIndex + 1}
                  onSelect={() => onSelectMovement(movement.id)}
                  managementPending={managementDisabled}
                />
              </div>
            )
          })}
        </SortableContext>
        <DragOverlay>{draggedMovement ? <MovementDragPreview movement={draggedMovement} /> : null}</DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={Boolean(movementToRemove)}
        title={`Remove ${movementToRemove?.movementName ?? 'accessory'}?`}
        confirmLabel="Remove exercise"
        cancelLabel="Keep it"
        confirmVariant="danger"
        tone="danger"
        isPending={removeMutation.isPending}
        onCancel={() => {
          if (removeMutation.isPending) return
          setMovementToRemove(null)
          setRemoveFromFuture(false)
        }}
        onConfirm={() => {
          if (!movementToRemove || removeMutation.isPending) return
          removeMutation.mutate({
            movement: movementToRemove,
            scope: removeFromFuture ? 'phase_slot' : 'session',
          })
        }}
      >
        <div className="space-y-4">
          <Text component="p" size="sm" tone="dimmed">
            Its logged sets in this session will be deleted. You can add it again from the catalog.
          </Text>
          {movementToRemove?.addedScope === 'phase_slot' ? (
            <Checkbox
              checked={removeFromFuture}
              disabled={removeMutation.isPending}
              data-testid="remove-accessory-future"
              label="Also remove from future appearances"
              onChange={(event) => setRemoveFromFuture(event.currentTarget.checked)}
            />
          ) : null}
        </div>
      </ConfirmDialog>
    </>
  )
}

function movementSlotId(movement: MovementSlot) {
  return movement.slotId ?? movement.id
}

function updateSessionCaches(queryClient: QueryClient, session: WorkoutSession) {
  queryClient.setQueryData(['session', session.sessionId], session)
  queryClient.setQueryData<TodayPayload>(['today'], (current) =>
    current ? { ...current, activeSession: session } : current,
  )
}

function invalidateManagementCaches(
  queryClient: QueryClient,
  sessionId: string,
  includeProgram: boolean,
) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] }),
    queryClient.invalidateQueries({ queryKey: ['today'] }),
  ]
  if (includeProgram) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
      queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
    )
  }
  return Promise.all(invalidations)
}

function invalidateProgramCaches(queryClient: QueryClient) {
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: ['today'] }),
    queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
    queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
  ])
}
