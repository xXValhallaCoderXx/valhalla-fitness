import type { ProgramStateInput, ProgramStateRequirement } from '@sheetless/domain/program/types'
import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'
import { mround } from '@sheetless/domain/program/progression'
import type { ExperienceMode } from '@sheetless/domain/account/types'

export const DEFAULT_TRAINING_MAX_PERCENT = 90
export const MIN_TRAINING_MAX_PERCENT = 80
export const MAX_TRAINING_MAX_PERCENT = 95

export const DEFAULT_WORKING_LOAD_PERCENT = 75
export const MIN_WORKING_LOAD_PERCENT = 60
export const MAX_WORKING_LOAD_PERCENT = 90

/**
 * Heading and caption for the programme's reference numbers.
 *
 * Guided calls them training weights and says what they are for; Full names them training maxes
 * and shows how the starting value was derived. Same numbers either way.
 */
export function programLoadReferenceCopy(mode: ExperienceMode, rounding: number) {
  if (mode === 'guided') {
    return {
      label: 'Your training weights',
      caption: 'Every set this cycle is a share of these numbers. They move up when you finish a cycle with every rep, and come down a little if you miss.',
    }
  }
  return {
    label: 'Training maxes',
    caption: `TM₀ = MROUND(e1RM × 0.${DEFAULT_TRAINING_MAX_PERCENT}, ${rounding}) · then progression rules only. Deltas exclude explicit resets.`,
  }
}

export function oneRepMaxKeyForMovement(movementId: string) {
  return `${movementId}_one_rep_max`
}

export function buildProgramStartStateValues({
  unit,
  requiredState,
  defaults,
  rounding,
  trainingMaxPercent = DEFAULT_TRAINING_MAX_PERCENT,
  workingLoadPercent = DEFAULT_WORKING_LOAD_PERCENT,
}: {
  unit: Unit
  requiredState: ProgramStateRequirement[]
  defaults: ProgramStateDefaults
  rounding: number
  trainingMaxPercent?: number
  workingLoadPercent?: number
}): ProgramStateInput[] {
  return requiredState.map((state) => ({
    ...state,
    value:
      state.type === 'training_max'
        ? suggestedLoadFromOneRepMax(defaults, state.movementId, trainingMaxPercent, rounding)
        : state.type === 'working_load'
          ? suggestedLoadFromOneRepMax(defaults, state.movementId, workingLoadPercent, rounding)
          : profileStateDefaultValue(state, defaults),
    unit,
  }))
}

export function suggestedLoadFromOneRepMax(
  defaults: ProgramStateDefaults,
  movementId: string,
  percent: number,
  rounding: number,
) {
  const oneRepMax = profileLoadDefault(defaults[oneRepMaxKeyForMovement(movementId)])
  if (!oneRepMax) return null
  return mround(oneRepMax * (percent / 100), rounding)
}

export function profileStateDefaultValue(state: ProgramStateRequirement, defaults: ProgramStateDefaults) {
  return profileLoadDefault(defaults[state.key])
}

export function profileLoadDefault(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}
