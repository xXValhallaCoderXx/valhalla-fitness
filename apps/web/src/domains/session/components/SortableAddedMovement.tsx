import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ActionIcon } from '@mantine/core'
import { GripVertical } from 'lucide-react'
import { Caption, Panel, Text } from '~/components'
import type { MovementSlot, WorkoutSession } from '~/shared/types'
import { LiveMovementCard } from './LiveMovementCard'

export function SortableAddedMovement({
  session,
  movement,
  isActive,
  movementNumber,
  disabled,
  onSelect,
  onRemove,
  managementPending,
}: {
  session: WorkoutSession
  movement: MovementSlot
  isActive: boolean
  movementNumber: number
  disabled: boolean
  onSelect: () => void
  onRemove: () => void
  managementPending: boolean
}) {
  const slotId = movementSlotId(movement)
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slotId, disabled })
  const sortHandle = (
    <ActionIcon
      ref={setActivatorNodeRef}
      className="shrink-0"
      style={{ touchAction: 'none' }}
      variant="default"
      color="neutral"
      radius="xl"
      size="md"
      title={`Reorder ${movement.movementName}`}
      aria-label={`Reorder ${movement.movementName}`}
      data-testid="accessory-drag-handle"
      data-movement-slot={slotId}
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <GripVertical size={14} />
    </ActionIcon>
  )

  return (
    <div
      ref={setNodeRef}
      data-testid="movement-card"
      data-movement-slot={slotId}
      style={{
        transform: transform ? CSS.Transform.toString({ ...transform, x: 0 }) : undefined,
        transition,
        opacity: isDragging ? 0.35 : 1,
        position: 'relative',
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      <LiveMovementCard
        session={session}
        movement={movement}
        isActive={isActive}
        movementNumber={movementNumber}
        onSelect={onSelect}
        sortHandle={sortHandle}
        onRemoveAdded={onRemove}
        managementPending={managementPending}
      />
    </div>
  )
}

export function MovementDragPreview({ movement }: { movement: MovementSlot }) {
  return (
    <Panel
      p="sm"
      className="flex items-center gap-3"
      style={{ width: 'min(32rem, calc(100vw - 2rem))' }}
    >
      <Text component="span" tone="dimmed" className="flex shrink-0">
        <GripVertical size={16} />
      </Text>
      <div className="min-w-0">
        <Text component="p" size="sm" fw={800} truncate>
          {movement.movementName}
        </Text>
        <Caption truncate>{movement.targetSummary}</Caption>
      </div>
    </Panel>
  )
}

function movementSlotId(movement: MovementSlot) {
  return movement.slotId ?? movement.id
}
