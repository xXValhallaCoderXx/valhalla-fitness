export function sanitizeProgramSlotPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-')
}

export function programAccessoryAdditionId(
  sessionIndex: number,
  movementId: string,
) {
  return `added-accessory-${sessionIndex}-${sanitizeProgramSlotPart(movementId)}`
}

export function programAccessoryAdditionSlotId(
  sessionId: string,
  sessionIndex: number,
  movementId: string,
) {
  return `slot-${sessionId}-${programAccessoryAdditionId(sessionIndex, movementId)}`
}
