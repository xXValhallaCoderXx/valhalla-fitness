import type {
  ProgramStateDefaults,
  ProgramStateInput,
  ProgramStateRequirement,
  Unit,
} from '~/shared/types'

/**
 * Programme-state default helpers, kept free of template-definition imports so
 * client code (settings, onboarding) can use them without pulling the full
 * template DSL data into the browser bundle.
 */

export function requiredTrainingMaxState(): ProgramStateRequirement[] {
  return ['squat', 'bench_press', 'deadlift', 'overhead_press'].map((movementId) => ({
    key: `${movementId}_training_max`,
    movementId,
    type: 'training_max',
  }))
}

export function requiredOneRepMaxState(movementIds: string[]): ProgramStateRequirement[] {
  return movementIds.map((movementId) => ({
    key: `${movementId}_one_rep_max`,
    movementId,
    type: 'one_rep_max',
  }))
}

export function requiredWorkingLoadState(movementIds: string[]): ProgramStateRequirement[] {
  return movementIds.map((movementId) => ({
    key: `${movementId}_working_load`,
    movementId,
    type: 'working_load',
  }))
}

export function defaultProgramStateRequirements(): ProgramStateRequirement[] {
  return [
    ...requiredOneRepMaxState(['squat', 'bench_press', 'deadlift', 'overhead_press', 'barbell_row']),
    ...requiredTrainingMaxState(),
    ...requiredWorkingLoadState(['squat', 'bench_press', 'overhead_press', 'deadlift', 'barbell_row']),
  ]
}

export function defaultProgramStateDefaults(unit: Unit = 'kg'): ProgramStateDefaults {
  void unit
  const defaults: ProgramStateDefaults = {}
  for (const state of defaultProgramStateRequirements()) {
    defaults[state.key] = null
  }
  return defaults
}

export function defaultStateValues(
  unit: Unit = 'kg',
  requiredState: ProgramStateRequirement[] = requiredTrainingMaxState(),
  defaults: ProgramStateDefaults = defaultProgramStateDefaults(unit),
): ProgramStateInput[] {
  return requiredState.map((state) => ({
    ...state,
    value: stateDefaultValue(state, defaults),
    unit,
  }))
}

function stateDefaultValue(state: ProgramStateRequirement, defaults: ProgramStateDefaults) {
  const rawValue = defaults[state.key]
  if (rawValue === null || rawValue === undefined) return null
  const value = Number(rawValue)
  if (Number.isFinite(value) && value > 0) return value
  return null
}
