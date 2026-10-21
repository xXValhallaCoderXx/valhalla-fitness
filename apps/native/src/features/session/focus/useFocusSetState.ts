import { useState } from 'react'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { firstActionableSetIndex } from '@sheetless/domain/session/live-focus-utils'

/** Selection survives movement changes. Optional effort is never carried to another set. */
export function useFocusSetState(sessionId: string, movement: MovementSlot) {
  const scope = JSON.stringify([sessionId, movement.id, movement.performedMovementId ?? movement.movementId])
  const [selected, setSelected] = useState<Record<string, number>>({})
  const selectedSetIndex = selected[scope] ?? firstActionableSetIndex(movement)
  const selectSet = (setIndex: number, target = movement) => {
    const targetScope = JSON.stringify([sessionId, target.id, target.performedMovementId ?? target.movementId])
    setSelected(current => ({ ...current, [targetScope]: setIndex }))
  }
  return { selectedSetIndex, selectSet }
}
