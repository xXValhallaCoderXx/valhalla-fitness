import type { ProgressionDecision, SetLog, SetTarget } from '~/shared/types'
import { getMovementName } from '~/domains/movement/lib/movements'
import { e1rm, mround } from '~/shared/lib/math'

export { e1rm, mround }

const week531 = [
  [
    { percent: 0.65, reps: 5 },
    { percent: 0.75, reps: 5 },
    { percent: 0.85, reps: 5, plus: true },
  ],
  [
    { percent: 0.7, reps: 3 },
    { percent: 0.8, reps: 3 },
    { percent: 0.9, reps: 3, plus: true },
  ],
  [
    { percent: 0.75, reps: 5 },
    { percent: 0.85, reps: 3 },
    { percent: 0.95, reps: 1, plus: true },
  ],
  [
    { percent: 0.4, reps: 5 },
    { percent: 0.5, reps: 5 },
    { percent: 0.6, reps: 5 },
  ],
] as const

export function computeTrainingMaxWaveSets(anchor: number, weekIndex: number, rounding: number) {
  const week = week531[weekIndex % 4]
  const main = week.map((target, index): SetTarget => ({
    id: `main-${index + 1}`,
    setIndex: index + 1,
    targetLoad: mround(anchor * target.percent, rounding),
    targetReps: target.reps,
    targetRir: 'plus' in target ? 2 : null,
    isTopSet: 'plus' in target,
    isAmrap: 'plus' in target,
    label: 'plus' in target ? `${target.reps}+` : `${target.reps}`,
  }))

  if (weekIndex % 4 === 3) return main

  const backoffLoad = mround(anchor * 0.65, rounding)
  const backoff = Array.from({ length: 5 }, (_, index): SetTarget => ({
    id: `backoff-${index + 1}`,
    setIndex: main.length + index + 1,
    targetLoad: backoffLoad,
    targetReps: 5,
    targetRir: 2,
    isBackoff: true,
    label: 'Back-off',
  }))

  return [...main, ...backoff]
}

export type TopSetResult = Pick<SetLog, 'actualReps' | 'actualRir' | 'targetReps'>

export function evaluateTrainingMaxBand(
  cycleTopSets: TopSetResult[],
  currentTm: number,
  rounding: number,
  movementId: string,
  stateKey: string,
): ProgressionDecision {
  const isUpper = movementId === 'bench_press' || movementId === 'overhead_press'
  const minimumMissed = cycleTopSets.some(
    (set) => (set.actualReps ?? 0) < (set.targetReps ?? 0),
  )
  const hasGrinder = cycleTopSets.some((set) => (set.actualRir ?? 0) <= 1)
  const allDoubleEligible = cycleTopSets.every(
    (set) =>
      (set.actualReps ?? 0) >= (set.targetReps ?? 0) + 2 &&
      (set.actualRir ?? 0) >= 2,
  )

  let band: 'reset' | 'hold' | 'standard' | 'double'
  let next = currentTm
  if (minimumMissed) {
    band = 'reset'
    next = mround(currentTm * 0.9, rounding)
  } else if (hasGrinder) {
    band = 'hold'
  } else if (allDoubleEligible) {
    band = 'double'
    next = mround(currentTm + (isUpper ? 5 : 7.5), rounding)
  } else {
    band = 'standard'
    next = mround(currentTm + (isUpper ? 2.5 : 5), rounding)
  }

  return {
    id: `pending-training-max-${movementId}`,
    movementId,
    movementName: getMovementName(movementId),
    stateKey,
    stateType: 'training_max',
    ruleId: `training_max_${band}`,
    scope: 'cycle',
    status: 'pending',
    inputSummary: `${getMovementName(movementId)} cycle top sets evaluated as ${band}.`,
    recommendation:
      band === 'hold'
        ? `Repeat ${currentTm} next cycle.`
        : `Move TM from ${currentTm} to ${next}.`,
    previousValue: currentTm,
    recommendedValue: next,
  }
}

export function evaluatePlusSetWave(
  setLog: Pick<SetLog, 'actualReps' | 'actualRir'>,
  baselineReps: number,
  anchor: number,
  rounding: number,
  movementId: string,
  stateKey: string,
): ProgressionDecision {
  const actualReps = setLog.actualReps ?? 0
  const hasActualRir = typeof setLog.actualRir === 'number' && Number.isFinite(setLog.actualRir)
  const extraReps = Math.max(actualReps - baselineReps, 0)
  const jump = extraReps * anchor * 0.01
  const recommended = mround(anchor + jump, rounding)
  return {
    id: `pending-plus-set-wave-${movementId}`,
    movementId,
    movementName: getMovementName(movementId),
    stateKey,
    stateType: 'training_max',
    ruleId: 'plus_set_wave',
    scope: 'wave',
    status: 'pending',
    inputSummary: `${actualReps} reps${hasActualRir ? ` at RIR ${setLog.actualRir}` : ''} against a ${baselineReps}-rep baseline.`,
    recommendation:
      extraReps > 0
        ? `Add ${mround(jump, rounding)} based on ${extraReps} extra ${extraReps === 1 ? 'rep' : 'reps'}.`
        : 'Repeat the load next wave; no extra reps were logged on the plus set.',
    previousValue: anchor,
    recommendedValue: recommended,
  }
}

export function evaluateSimpleLinearCompletion(
  sets: Pick<SetLog, 'completed' | 'actualReps' | 'actualRir' | 'targetReps' | 'targetRepMin' | 'targetRir'>[],
  currentAnchor: number,
  rounding: number,
  movementId: string,
  stateKey: string,
  increment?: number,
): ProgressionDecision | null {
  const completedAllTargets = sets.length > 0 && sets.every((set) => {
    if (!set.completed) return false
    const targetReps = set.targetReps ?? set.targetRepMin ?? 1
    if ((set.actualReps ?? 0) < targetReps) return false
    const targetRir = set.targetRir
    if (typeof targetRir === 'number' && Number.isFinite(targetRir)) {
      return (set.actualRir ?? -1) >= targetRir
    }
    return true
  })
  if (!completedAllTargets) return null

  const isUpper = movementId === 'bench_press' || movementId === 'overhead_press' || movementId === 'barbell_row'
  const incrementValue = increment ?? (isUpper ? 2.5 : 5)
  const recommended = Math.max(mround(currentAnchor + incrementValue, rounding), currentAnchor + rounding)
  return {
    id: `pending-simple-linear-${movementId}`,
    movementId,
    movementName: getMovementName(movementId),
    stateKey,
    stateType: 'working_load',
    ruleId: 'simple_linear_completion',
    scope: 'session',
    status: 'pending',
    inputSummary: `${getMovementName(movementId)} completed all target work at or above the target reps and RIR.`,
    recommendation: `Move the working load from ${currentAnchor} to ${recommended}.`,
    previousValue: currentAnchor,
    recommendedValue: recommended,
  }
}

export function evaluateAccessoryDoubleProgression(
  sets: Pick<SetLog, 'actualReps' | 'actualRir'>[],
  repMin: number,
  repMax: number,
  targetRir: number,
) {
  const completedTop = sets.every(
    (set) => (set.actualReps ?? 0) >= repMax && (set.actualRir ?? 99) >= targetRir,
  )
  const missedMin = sets.some((set) => (set.actualReps ?? 0) < repMin)
  if (completedTop) return 'Add load next time'
  if (missedMin) return 'Repeat or reduce conservatively'
  return 'Repeat load'
}
