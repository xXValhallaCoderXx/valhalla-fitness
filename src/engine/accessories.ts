import {
  ACCESSORY_INCREMENT_KG,
  ROUNDING_KG,
  type AccessorySlotSpec,
  type ExerciseSpec,
} from './program-config'
import { roundTo } from './math'

export interface AccessorySetResult {
  reps: number
  rir?: number
}

export interface AccessorySuggestion {
  addWeightKg: number
  newWeight: number
  resetToBottom: boolean
  reason: string
}

export interface SwapContext {
  benchPain?: number
  readinessScore?: number
  preferLowFatigue?: boolean
}

export interface SwapCandidate {
  exercise: ExerciseSpec
  eligible: boolean
  reasons: string[]
}

export interface PlannedAccessory {
  slot: AccessorySlotSpec
  exercise: ExerciseSpec
  alternatives: SwapCandidate[]
}

export function accessorySuggestion(
  currentWeight: number,
  repHigh: number,
  lastSets: AccessorySetResult[],
  increment: number = ACCESSORY_INCREMENT_KG,
): AccessorySuggestion | null {
  if (lastSets.length === 0) return null

  const allHitTop = lastSets.every((s) => s.reps >= repHigh)
  const allHaveReserve = lastSets.every((s) => (s.rir ?? 0) >= 2)

  if (!allHitTop || !allHaveReserve) return null

  return {
    addWeightKg: increment,
    newWeight: roundTo(currentWeight + increment, ROUNDING_KG),
    resetToBottom: true,
    reason: `Hit the top of the range on all sets with reps to spare - +${increment} kg, back to the bottom.`,
  }
}

export function exerciseForSlot(
  slot: AccessorySlotSpec,
  library: Record<string, ExerciseSpec>,
  selectedExerciseId?: string,
): ExerciseSpec {
  const id = selectedExerciseId ?? slot.plannedExerciseId
  return library[id] ?? library[slot.plannedExerciseId]
}

export function swapEligibility(
  slot: AccessorySlotSpec,
  exercise: ExerciseSpec,
  context: SwapContext = {},
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = []

  if (exercise.category !== slot.category) {
    reasons.push(`Different pattern: ${exercise.category} instead of ${slot.category}.`)
  }

  if ((slot.painGated || exercise.painGated) && (context.benchPain ?? 0) > 0) {
    reasons.push('Shoulder is not pain-free today.')
  }

  if (
    (slot.fatigueSensitive || context.preferLowFatigue || (context.readinessScore ?? 5) <= 2) &&
    exercise.fatigueCost === 'high'
  ) {
    reasons.push('High fatigue choice on a day that should stay conservative.')
  }

  return { eligible: reasons.length === 0, reasons }
}

export function swapCandidates(
  slot: AccessorySlotSpec,
  library: Record<string, ExerciseSpec>,
  context: SwapContext = {},
): SwapCandidate[] {
  return slot.swapPool
    .map((exerciseId) => library[exerciseId])
    .filter((exercise): exercise is ExerciseSpec => Boolean(exercise))
    .map((exercise) => {
      const result = swapEligibility(slot, exercise, context)
      return { exercise, eligible: result.eligible, reasons: result.reasons }
    })
}

export function buildAccessoryPlan(
  slotIds: string[],
  slots: Record<string, AccessorySlotSpec>,
  library: Record<string, ExerciseSpec>,
  selectedBySlot: Record<string, string> = {},
  context: SwapContext = {},
): PlannedAccessory[] {
  return slotIds
    .map((slotId) => slots[slotId])
    .filter((slot): slot is AccessorySlotSpec => Boolean(slot))
    .map((slot) => ({
      slot,
      exercise: exerciseForSlot(slot, library, selectedBySlot[slot.id]),
      alternatives: swapCandidates(slot, library, context),
    }))
}
