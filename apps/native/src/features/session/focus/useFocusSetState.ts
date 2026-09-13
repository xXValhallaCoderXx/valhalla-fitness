import { useState } from 'react'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { firstActionableSetIndex } from '@sheetless/domain/session/live-focus-utils'

/** Navigation and suggestions belong to this exact exercise within this workout. */
export function useFocusSetState(sessionId: string, movement: MovementSlot) {
  const scope = JSON.stringify([sessionId, movement.id, movement.performedMovementId ?? movement.movementId])
  const [selected, setSelected] = useState(() => ({ scope, setIndex: firstActionableSetIndex(movement) }))
  const [suggestions, setSuggestions] = useState<Record<string, Record<number, number>>>({})
  const selectedSetIndex = selected.scope === scope ? selected.setIndex : firstActionableSetIndex(movement)

  const selectSet = (setIndex: number) => setSelected({ scope, setIndex })
  const carryRirToNextSet = (setIndex: number, value: number) => {
    const nextSet = movement.sets.find((set) => set.setIndex > setIndex && !set.completed)
    if (!nextSet || typeof nextSet.actualRir === 'number') return
    setSuggestions((current) => ({
      ...current,
      [scope]: { ...current[scope], [nextSet.setIndex]: value },
    }))
  }

  return { selectedSetIndex, selectSet, carryRirToNextSet, suggestedRir: suggestions[scope]?.[selectedSetIndex] }
}
