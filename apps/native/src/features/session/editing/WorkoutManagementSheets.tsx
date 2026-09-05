import { MovementHistorySheet } from '@/features/history/movements/MovementHistorySheet'
import { AddAccessorySheet } from './AddAccessorySheet'
import { AddExerciseSheet } from './AddExerciseSheet'
import { MovementSwapSheet } from './MovementSwapSheet'
import { PlateCalculatorSheet } from '../plate-calculator/PlateCalculatorSheet'
import { RemoveMovementDialog } from './RemoveMovementDialog'
import { SessionNotesSheet } from './SessionNotesSheet'
import type { WorkoutManagementController } from './useWorkoutManagement'

export function WorkoutManagementSheets({
  controller,
}: {
  controller: WorkoutManagementController
}) {
  return (
    <>
      <MovementSwapSheet {...controller.sheets.swap} />
      <AddAccessorySheet {...controller.sheets.addAccessory} />
      <AddExerciseSheet {...controller.sheets.addExercise} />
      <RemoveMovementDialog {...controller.sheets.remove} />
      <SessionNotesSheet {...controller.sheets.notes} />
      <PlateCalculatorSheet {...controller.sheets.plates} />
      <MovementHistorySheet {...controller.sheets.history} />
    </>
  )
}
