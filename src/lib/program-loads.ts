import type { ProgramStateDefaults, ProgramStateInput, ProgramStateRequirement, Unit } from '~/types/training'
import { mround } from './progression'

export const DEFAULT_TRAINING_MAX_PERCENT = 90
export const MIN_TRAINING_MAX_PERCENT = 80
export const MAX_TRAINING_MAX_PERCENT = 95

export const DEFAULT_WORKING_LOAD_PERCENT = 75
export const MIN_WORKING_LOAD_PERCENT = 60
export const MAX_WORKING_LOAD_PERCENT = 90

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
