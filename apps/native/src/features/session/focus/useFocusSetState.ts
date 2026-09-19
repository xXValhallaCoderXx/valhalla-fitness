import { useState } from 'react'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { firstActionableSetIndex } from '@sheetless/domain/session/live-focus-utils'

export type FocusSetMemory = {
  selected: Record<string, number>
  suggestions: Record<string, Record<number, number>>
}
export type FocusSetStore = { value: FocusSetMemory; update: (change: (current: FocusSetMemory) => FocusSetMemory) => void }

/** Navigation and suggestions belong to this exact exercise within this workout. */
export function useFocusSetState(sessionId: string, movement: MovementSlot | null, store?: FocusSetStore) {
  const scope = JSON.stringify([sessionId, movement?.id, movement?.performedMovementId ?? movement?.movementId])
  const [local, setLocal] = useState<FocusSetMemory>({ selected: {}, suggestions: {} })
  const { selected, suggestions } = store?.value ?? local
  const update = store?.update ?? setLocal
  const selectedSetIndex = selected[scope] ?? (movement ? firstActionableSetIndex(movement) : 1)

  const selectSet = (setIndex: number) => update((current) => ({ ...current, selected: { ...current.selected, [scope]: setIndex } }))
  const selectMovementSet = (target: MovementSlot, setIndex: number) => {
    const targetScope = JSON.stringify([sessionId, target.id, target.performedMovementId ?? target.movementId])
    update((current) => ({ ...current, selected: { ...current.selected, [targetScope]: setIndex } }))
  }
  const carryRirToNextSet = (setIndex: number, value: number) => {
    const nextSet = movement?.sets.find((set) => set.setIndex > setIndex && !set.completed)
    if (!nextSet || typeof nextSet.actualRir === 'number') return
    update((current) => ({
      ...current,
      suggestions: { ...current.suggestions, [scope]: { ...current.suggestions[scope], [nextSet.setIndex]: value } },
    }))
  }

  return { selectedSetIndex, selectSet, selectMovementSet, carryRirToNextSet, suggestedRir: suggestions[scope]?.[selectedSetIndex] }
}
