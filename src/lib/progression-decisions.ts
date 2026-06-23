import type { MovementSlot, ProgramInstance, ProgressionDecision, SetLog, WorkoutSession } from '~/types/training'
import {
  evaluate531TmBand,
  evaluateAccessoryDoubleProgression,
  evaluateBullmastiffPlusSet,
  evaluateSimpleLinearCompletion,
} from './progression'

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasCompletedReps(set: SetLog) {
  return set.completed && hasNumber(set.actualReps)
}

function hasCompletedRepsAndRir(set: SetLog) {
  return hasCompletedReps(set) && hasNumber(set.actualRir)
}

function hasCompleteAccessoryInputs(movement: MovementSlot) {
  return movement.sets.length > 0 && movement.sets.every(hasCompletedRepsAndRir)
}

export function accessoryOutcome(movement: MovementSlot) {
  if (!hasCompleteAccessoryInputs(movement)) return 'Incomplete data - no recommendation'
  const firstSet = movement.sets[0]
  const targetRepMin = firstSet?.targetRepMin ?? firstSet?.targetReps ?? 8
  const targetRepMax = firstSet?.targetRepMax ?? firstSet?.targetReps ?? targetRepMin
  return evaluateAccessoryDoubleProgression(
    movement.sets,
    targetRepMin,
    targetRepMax,
    firstSet?.targetRir ?? 2,
  )
}

export function usesAccessoryAutoregulation(movement: MovementSlot) {
  return movement.progressionRuleId === 'accessory_double_progression'
}

export function accessoryOutcomeSummary(movement: MovementSlot) {
  if (!usesAccessoryAutoregulation(movement)) return 'History only - no auto-regulation'
  return accessoryOutcome(movement)
}

export function buildProgressionDecisionsForSession(
  session: WorkoutSession,
  activeProgram: ProgramInstance,
) {
  const decisions: ProgressionDecision[] = []
  for (const movement of session.movements) {
    if (movement.role === 'main') {
      const ruleId = movement.progressionRuleId
      const anchor = activeProgram.anchors.find((item) => item.movementId === movement.movementId)
      if (!ruleId || !anchor) continue

      const topSetWithReps = movement.sets.find((set) => (set.isTopSet || set.isAmrap) && hasCompletedReps(set))
      const topSetWithRir = movement.sets.find((set) => (set.isTopSet || set.isAmrap) && hasCompletedRepsAndRir(set))
      if (ruleId === 'bullmastiff_plus_set' && topSetWithReps) {
        decisions.push(
          evaluateBullmastiffPlusSet(
            topSetWithReps,
            topSetWithReps.targetReps ?? 1,
            anchor.value,
            activeProgram.rounding,
            movement.movementId,
          ),
        )
      }
      if (ruleId === 'healthy_531_tm_band' && topSetWithRir) {
        decisions.push(evaluate531TmBand([topSetWithRir], anchor.value, activeProgram.rounding, movement.movementId))
      }
      if (ruleId === 'simple_linear_completion') {
        const decision = evaluateSimpleLinearCompletion(
          movement.sets,
          anchor.value,
          activeProgram.rounding,
          movement.movementId,
        )
        if (decision) decisions.push(decision)
      }
    }
    if (movement.role === 'accessory' && usesAccessoryAutoregulation(movement) && hasCompleteAccessoryInputs(movement)) {
      const outcome = accessoryOutcome(movement)
      if (outcome === 'Add load next time') {
        decisions.push({
          id: `pending-accessory-${movement.movementId}`,
          movementId: movement.movementId,
          movementName: movement.movementName,
          ruleId: 'accessory_double_progression',
          scope: 'session',
          status: 'pending',
          inputSummary: `${movement.movementName} completed the top of the rep range.`,
          recommendation: outcome,
        })
      }
    }
  }
  return decisions
}
