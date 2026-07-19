import type { MovementSlot, ProgramInstance, ProgressionDecision, SetLog, WorkoutSession } from '~/shared/types'
import { formatWeight } from '~/shared/lib/set-notation'
import { programStateKey } from '~/domains/program/lib/template-engine'
import {
  evaluateAccessoryDoubleProgression,
  evaluatePlusSetWave,
  evaluateSimpleLinearCompletion,
  evaluateTrainingMaxBand,
} from '~/domains/program/lib/progression'

type ValidProgramState = ProgramInstance['stateValues'][number] & { value: number }

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

function isPlusSetWaveRule(ruleId: string) {
  return ruleId === 'plus_set_wave' || ruleId === 'bullmastiff_plus_set'
}

function isTrainingMaxBandRule(ruleId: string) {
  return ruleId === 'training_max_band' || ruleId === 'healthy_531_tm_band'
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
      if (!ruleId) continue

      const topSetWithReps = movement.sets.find((set) => (set.isTopSet || set.isAmrap) && hasCompletedReps(set))
      const topSetWithRir = movement.sets.find((set) => (set.isTopSet || set.isAmrap) && hasCompletedRepsAndRir(set))
      if (isPlusSetWaveRule(ruleId) && topSetWithReps) {
        const state = stateForMovement(activeProgram, movement.movementId, 'training_max')
        if (!state) continue
        decisions.push(
          evaluatePlusSetWave(
            topSetWithReps,
            topSetWithReps.targetReps ?? 1,
            state.value,
            activeProgram.rounding,
            movement.movementId,
            state.key,
          ),
        )
      }
      if (isTrainingMaxBandRule(ruleId) && topSetWithRir) {
        const state = stateForMovement(activeProgram, movement.movementId, 'training_max')
        if (!state) continue
        decisions.push(evaluateTrainingMaxBand([topSetWithRir], state.value, activeProgram.rounding, movement.movementId, state.key))
      }
      if (ruleId === 'simple_linear_completion') {
        const state = stateForMovement(activeProgram, movement.movementId, 'working_load')
        if (!state) continue
        const decision = evaluateSimpleLinearCompletion(
          movement.sets,
          state.value,
          activeProgram.rounding,
          movement.movementId,
          state.key,
          simpleLinearIncrement(activeProgram, movement.movementId),
        )
        if (decision) decisions.push(decision)
      }
    }
    if (movement.role === 'accessory' && usesAccessoryAutoregulation(movement) && hasCompleteAccessoryInputs(movement)) {
      const outcome = accessoryOutcome(movement)
      if (outcome === 'Add load next time') {
        // Accessories have no programmed load, so anchor the suggestion to the heaviest weight the
        // user actually logged; without one (bodyweight work) the decision stays qualitative.
        const topLoad = topCompletedLoad(movement)
        decisions.push({
          id: `pending-accessory-${movement.movementId}`,
          movementId: movement.movementId,
          movementName: movement.movementName,
          ruleId: 'accessory_double_progression',
          scope: 'session',
          status: 'pending',
          inputSummary:
            topLoad == null
              ? `${movement.movementName} completed the top of the rep range.`
              : `${movement.movementName} completed the top of the rep range at ${formatWeight(topLoad, activeProgram.units)}.`,
          recommendation: outcome,
          ...(topLoad == null
            ? {}
            : {
                rationale: 'You hit the top of the rep range on every set with effort to spare, so Sheetless suggests a small increase.',
                previousValue: topLoad,
                recommendedValue: topLoad + activeProgram.rounding,
              }),
        })
      }
    }
  }
  return decisions
}

/** Heaviest load logged across the movement's completed sets, or null when none carried weight. */
function topCompletedLoad(movement: MovementSlot): number | null {
  let top: number | null = null
  for (const set of movement.sets) {
    if (!set.completed || !hasNumber(set.actualLoad) || set.actualLoad <= 0) continue
    if (top == null || set.actualLoad > top) top = set.actualLoad
  }
  return top
}

function stateForMovement(
  activeProgram: ProgramInstance,
  movementId: string,
  type: 'training_max' | 'working_load',
): ValidProgramState | null {
  const state = activeProgram.stateValues.find((state) => state.key === programStateKey(movementId, type)) ??
    activeProgram.stateValues.find((state) => state.movementId === movementId && state.type === type)
  if (!state || !hasNumber(state.value) || state.value <= 0) return null
  return state as ValidProgramState
}

function simpleLinearIncrement(activeProgram: ProgramInstance, movementId: string) {
  const configured = activeProgram.templateDefinition?.progressionConfig?.simple_linear_completion?.increments[movementId]
  return configured?.[activeProgram.units]
}
