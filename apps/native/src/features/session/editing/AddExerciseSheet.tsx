import { useEffect, useMemo, useState } from 'react'
import type { AccessoryMovementOption } from '@sheetless/domain/movement/types'
import { MovementPickerSheet } from '../movement-picker/MovementPickerSheet'

export type AddExerciseDraft = {
  movement: AccessoryMovementOption
}

export interface AddExerciseSheetProps {
  open: boolean
  options: readonly AccessoryMovementOption[]
  freeWeightOnly?: boolean
  isLoading?: boolean
  loadError?: string | null
  isPending?: boolean
  mutationError?: string | null
  onRetry?: () => void
  onClose: () => void
  onSubmit: (draft: AddExerciseDraft) => void
}

/** Full-catalog exercise picker for an already-running ad-hoc workout. */
export function AddExerciseSheet({
  open,
  options,
  freeWeightOnly = false,
  isLoading,
  loadError,
  isPending,
  mutationError,
  onRetry,
  onClose,
  onSubmit,
}: AddExerciseSheetProps) {
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null)
  const visibleOptions = useMemo(
    () => freeWeightOnly ? options.filter((option) => option.freeWeightCompatible) : options,
    [freeWeightOnly, options],
  )

  useEffect(() => {
    if (open) setSelectedMovementId(null)
  }, [open])

  return (
    <MovementPickerSheet
      key={open ? 'add-exercise-open' : 'add-exercise-closed'}
      open={open}
      title="Add exercise"
      subtitle={freeWeightOnly ? 'Showing free-weight compatible movements for this workout.' : 'Choose from the full movement catalogue.'}
      confirmLabel="Add exercise"
      options={visibleOptions}
      selectedMovementId={selectedMovementId}
      onSelectMovement={setSelectedMovementId}
      isPending={isLoading}
      error={loadError}
      onRetry={onRetry}
      isSubmitting={isPending}
      submitError={mutationError}
      searchPlaceholder="Search exercises"
      onClose={onClose}
      onConfirm={(movement) => onSubmit({ movement })}
    />
  )
}
