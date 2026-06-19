// End-of-cycle TM progression engine. See docs/Ultimate-workout-plan.md §6.2.
//
// Band order in CODE is RESET -> HOLD -> DOUBLE -> STANDARD (the §6.2 pseudocode
// checks DOUBLE's stricter condition before STANDARD, NOT the table's row order).

import type { LiftId, ProgressionBand } from './types'
import { isLowerBody } from './types'
import { roundTo, DEFAULT_ROUNDING_KG } from './math'

export interface TopSetResult {
  weekIndex: number
  minReps: number
  repsDone: number
  rir: number
  barFast: boolean
}

export interface EvaluateArgs {
  lift: LiftId
  currentTM: number
  /** Top "+" sets logged across this cycle's working weeks (exclude deload). */
  topSets: TopSetResult[]
  /** Max bench pain (0–10) logged this cycle; 0 for non-bench lifts. */
  benchPainMax: number
  /** Athlete self-report of full recovery (gates DOUBLE). */
  fullyRecovered: boolean
  /** Count of immediately-preceding consecutive HOLD/RESET cycles for this lift. */
  consecutiveHoldOrReset: number
  rounding?: number
}

export interface CycleEvaluation {
  band: ProgressionBand
  tmDeltaKg: number
  nextTM: number
  addExtraDeload: boolean
  stallReset: boolean
  /** Updated consecutive HOLD/RESET counter to persist for next cycle. */
  nextConsecutiveHoldOrReset: number
  reason: string
}

export function evaluateCycle(args: EvaluateArgs): CycleEvaluation {
  const {
    lift,
    currentTM,
    topSets,
    benchPainMax,
    fullyRecovered,
    consecutiveHoldOrReset,
    rounding = DEFAULT_ROUNDING_KG,
  } = args

  const isBench = lift === 'bench'
  const lower = isLowerBody(lift)

  const hasData = topSets.length > 0
  const missedMin = topSets.some((t) => t.repsDone < t.minReps)
  const anyGrind = topSets.some((t) => t.rir <= 1)
  const allRir2 = hasData && topSets.every((t) => t.rir >= 2)
  const allFastBar = hasData && topSets.every((t) => t.barFast)
  const allMinPlus2 = hasData && topSets.every((t) => t.repsDone >= t.minReps + 2)

  let band: ProgressionBand
  let delta: number
  let addExtraDeload = false
  let reason: string

  if (missedMin || (isBench && benchPainMax > 5)) {
    band = 'reset'
    addExtraDeload = true
    const nextTM = roundTo(currentTM * 0.9, rounding)
    delta = nextTM - currentTM
    reason = missedMin
      ? 'Missed a prescribed minimum — TM too high. Reset to 90% and add a deload.'
      : 'Bench pain > 5/10 — reset to 90% and add a deload.'
  } else if (anyGrind) {
    band = 'hold'
    delta = 0
    reason = 'A top set finished at RIR ≤ 1 (grind) — hold the TM.'
  } else if (allRir2 && allMinPlus2 && allFastBar && fullyRecovered) {
    band = 'double'
    delta = lower ? 7.5 : 5
    reason = 'Every top set beat the minimum by ≥2 at RIR ≥ 2, bar fast, fully recovered — double jump.'
  } else if (allRir2 && allFastBar) {
    band = 'standard'
    delta = lower ? 5 : 2.5
    reason = 'All top sets hit the minimum at RIR ≥ 2 with fast bar — standard jump.'
  } else {
    band = 'hold'
    delta = 0
    reason = hasData ? 'Mixed signal — hold the TM this cycle.' : 'No top-set data — hold the TM.'
  }

  // Bench only progresses if FULLY pain-free this cycle.
  if (isBench && benchPainMax > 0 && delta > 0) {
    band = 'hold'
    delta = 0
    reason = `Bench had pain (max ${benchPainMax}/10) — hold until fully pain-free.`
  }

  let nextTM = roundTo(currentTM + delta, rounding)

  // Stall rule: 2 consecutive HOLD/RESET cycles -> force TM down to 90%.
  const isHoldOrReset = band === 'hold' || band === 'reset'
  const nextConsecutiveHoldOrReset = isHoldOrReset ? consecutiveHoldOrReset + 1 : 0
  let stallReset = false
  if (isHoldOrReset && nextConsecutiveHoldOrReset >= 2) {
    stallReset = true
    nextTM = roundTo(currentTM * 0.9, rounding)
    delta = nextTM - currentTM
    reason += ' Stall rule: 2 consecutive hold/reset cycles — drop TM to 90% and rebuild.'
  }

  return {
    band,
    tmDeltaKg: delta,
    nextTM,
    addExtraDeload,
    stallReset,
    nextConsecutiveHoldOrReset,
    reason,
  }
}
