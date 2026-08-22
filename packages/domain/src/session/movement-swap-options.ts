import type { MovementSwapOption } from '@sheetless/domain/movement/types'

export function selectVisibleMovementSwapOption(
  options: readonly MovementSwapOption[],
  selectedMovementId: string | null,
): MovementSwapOption | null {
  if (selectedMovementId) {
    const selectedOption = options.find(
      (option) => option.movementId === selectedMovementId,
    )
    if (selectedOption) return selectedOption
  }

  return options[0] ?? null
}

export function canUseMovementSwapPhaseScope({
  option,
  isAdHoc,
  isAdded,
}: {
  option: Pick<MovementSwapOption, 'allowedScopes'> | null
  isAdHoc: boolean
  isAdded: boolean
}): boolean {
  return (
    !isAdHoc &&
    !isAdded &&
    Boolean(option?.allowedScopes.includes('phase_slot'))
  )
}
