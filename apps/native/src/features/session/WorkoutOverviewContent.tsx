import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { Caption, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { WorkoutManagementSheets } from './WorkoutManagementSheets'
import { WorkoutOverviewRow } from './WorkoutOverviewRow'
import { WorkoutToolsPanel } from './WorkoutToolsPanel'
import { useAccessoryOrderMutation } from './useAccessoryOrderMutation'
import { useWorkoutManagement } from './useWorkoutManagement'

function movementSlotId(movement: MovementSlot) {
  return movement.slotId ?? movement.id
}

export function WorkoutOverviewContent({
  user,
  session,
  activeMovement,
  notes,
  disabled,
  onNotesChange,
  onSelectMovement,
  onEnterFocus,
}: {
  user: User
  session: WorkoutSession
  activeMovement: MovementSlot
  notes: string
  disabled: boolean
  onNotesChange: (notes: string) => void
  onSelectMovement: (movementId: string | null) => void
  onEnterFocus: (movementId: string) => void
}) {
  const order = useAccessoryOrderMutation(user, session)
  const management = useWorkoutManagement({
    user,
    session,
    movement: activeMovement,
    selectedSet: activeMovement.sets[0],
    notes,
    disabled,
    onNotesChange,
    onSelectMovement,
    onAddedMovement: onEnterFocus,
  })
  const addedSlotIds = order.orderedSlotIds
  const canReorder = !session.isAdHoc && addedSlotIds.length > 1

  return (
    <>
      <View style={{ gap: spacing.xs }}>
        <SectionLabel>Exercises</SectionLabel>
        <Caption>Tap an exercise to open its next set in Focus.</Caption>
      </View>

      <View style={{ gap: spacing.sm }}>
        {order.displayMovements.map((movement, index) => {
          const addedIndex = addedSlotIds.indexOf(movementSlotId(movement))
          const isProgrammeAddition = !session.isAdHoc && Boolean(movement.isAdded)
          return (
            <WorkoutOverviewRow
              key={movement.id}
              movement={movement}
              ordinal={index + 1}
              disabled={disabled || order.isPending}
              canMoveUp={isProgrammeAddition && addedIndex > 0}
              canMoveDown={isProgrammeAddition && addedIndex >= 0 && addedIndex < addedSlotIds.length - 1}
              canRemove={Boolean(session.isAdHoc || movement.isAdded)}
              onOpen={() => onEnterFocus(movement.id)}
              onMoveUp={() => order.move(movement, -1)}
              onMoveDown={() => order.move(movement, 1)}
              onRemove={() => management.overviewTools.onRemoveMovement(movement)}
            />
          )
        })}
      </View>

      {canReorder ? (
        <Caption>Move controls reorder added accessories only; prescribed exercises stay fixed.</Caption>
      ) : null}
      {order.errorMessage ? (
        <Text size="sm" tone="danger">
          {order.errorMessage}
        </Text>
      ) : null}

      <WorkoutToolsPanel {...management.workoutTools} />
      <WorkoutManagementSheets controller={management} />
    </>
  )
}
