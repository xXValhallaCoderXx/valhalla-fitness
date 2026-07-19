import type { AccessoryProgressionMethod, MovementSlot, SetTarget } from '~/shared/types'

export const accessoryProgressionOptions: Array<{ value: AccessoryProgressionMethod; label: string }> = [
  { value: 'history_only', label: 'None (history only)' },
  { value: 'double_progression', label: 'Double progression' },
]

const progressionRuleByMethod: Record<AccessoryProgressionMethod, string | null> = {
  history_only: null,
  double_progression: 'accessory_double_progression',
}

export function isAccessoryProgressionMethod(value: unknown): value is AccessoryProgressionMethod {
  return value === 'history_only' || value === 'double_progression'
}

export function accessoryProgressionRuleId(method: AccessoryProgressionMethod): string | null {
  return progressionRuleByMethod[method]
}

export function accessoryProgressionLabel(method: AccessoryProgressionMethod) {
  return method === 'double_progression' ? 'Double progression' : 'History only'
}

export type AccessoryRepTarget = {
  label: string
  targetReps?: number | null
  targetRepMin?: number | null
  targetRepMax?: number | null
}

export function parseAccessoryRepTarget(value: string): AccessoryRepTarget | null {
  const input = value.trim()
  if (!input) return null
  const rangeMatch = input.match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/)
  if (rangeMatch) {
    const first = Number(rangeMatch[1])
    const second = Number(rangeMatch[2])
    if (!validAccessoryRepCount(first) || !validAccessoryRepCount(second)) return null
    const targetRepMin = Math.min(first, second)
    const targetRepMax = Math.max(first, second)
    return {
      label: `${targetRepMin}-${targetRepMax}`,
      targetReps: null,
      targetRepMin,
      targetRepMax,
    }
  }

  const reps = Number(input)
  if (!validAccessoryRepCount(reps)) return null
  return {
    label: String(reps),
    targetReps: reps,
    targetRepMin: null,
    targetRepMax: null,
  }
}

export function accessoryTargetSummary(repTarget: AccessoryRepTarget, method: AccessoryProgressionMethod) {
  return `${repTarget.label} reps · ${accessoryProgressionLabel(method)}`
}

export function buildAccessoryInitialSets(repTarget: AccessoryRepTarget): SetTarget[] {
  return [
    {
      id: 'set-1',
      setIndex: 1,
      targetLoad: null,
      targetReps: repTarget.targetReps ?? null,
      targetRepMin: repTarget.targetRepMin ?? null,
      targetRepMax: repTarget.targetRepMax ?? null,
      targetRir: 2,
      targetRpe: null,
      isTopSet: false,
      isAmrap: false,
      isBackoff: false,
      label: repTarget.label,
    },
  ]
}

function movementSlotId(movement: MovementSlot) {
  return movement.slotId ?? movement.id
}

export function reorderAddedAccessories(
  movements: readonly MovementSlot[],
  orderedSlotIds: readonly string[],
): MovementSlot[] {
  const uniqueSlotIds = new Set(orderedSlotIds)
  if (uniqueSlotIds.size !== orderedSlotIds.length) {
    throw new Error('Accessory order contains duplicate slot IDs.')
  }

  const movementsBySlotId = new Map(movements.map((movement) => [movementSlotId(movement), movement]))
  const addedMovements = movements.filter((movement) => movement.isAdded)

  for (const slotId of orderedSlotIds) {
    const movement = movementsBySlotId.get(slotId)
    if (!movement) throw new Error('Accessory order is stale. Refresh and try again.')
    if (!movement.isAdded) throw new Error('Only added accessories can be reordered.')
  }

  if (
    orderedSlotIds.length !== addedMovements.length ||
    addedMovements.some((movement) => !uniqueSlotIds.has(movementSlotId(movement)))
  ) {
    throw new Error('Accessory order must include every added accessory.')
  }

  const reordered = orderedSlotIds.map((slotId) => movementsBySlotId.get(slotId)!)
  let addedIndex = 0
  return movements.map((movement) => {
    if (!movement.isAdded) return movement
    const nextMovement = reordered[addedIndex++]!
    return {
      ...nextMovement,
      orderIndex: movement.orderIndex,
    }
  })
}

export function removeAddedAccessory(movements: readonly MovementSlot[], slotId: string): MovementSlot[] {
  const movement = movements.find((item) => movementSlotId(item) === slotId)
  if (!movement) throw new Error('Accessory is no longer part of this session.')
  if (!movement.isAdded) throw new Error('Only added accessories can be removed.')
  const remaining = movements.filter((item) => movementSlotId(item) !== slotId)
  const maxFixedOrderIndex = Math.max(
    0,
    ...remaining.filter((item) => !item.isAdded).map((item) => item.orderIndex),
  )
  let nextAddedOrderIndex = maxFixedOrderIndex + 1
  return remaining.map((item) =>
    item.isAdded ? { ...item, orderIndex: nextAddedOrderIndex++ } : item,
  )
}

function validAccessoryRepCount(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 100
}
