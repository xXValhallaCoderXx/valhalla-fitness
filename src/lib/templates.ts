import type {
  PlannedSession,
  ProgramInstance,
  ProgramStateDefaults,
  ProgramStateInput,
  ProgramStateRequirement,
  ProgramTemplateSummary,
  Unit,
} from '~/types/training'
import {
  expandSessionFromTemplateDefinition,
  programForNextUncompletedSessionFromDefinition,
  type TemplateDefinition,
} from './template-engine'
import {
  getFallbackTemplateDefinition,
  listFallbackTemplateDefinitions,
} from './template-definitions'

export const templateCatalog: ProgramTemplateSummary[] = [
  {
    id: 'generic_alternating_5x5_lp',
    name: 'Beginner 5x5 Linear',
    source: 'linear_strength',
    sourceLabel: 'Linear Strength',
    origin: 'system_default',
    description:
      'Three-day beginner linear progression alternating A/B sessions with 5x5 work, a 1x5 deadlift, and simple suggested accessories.',
    daysPerWeek: 3,
    progressionLabel: 'Working-load LP',
    complexity: 'Beginner',
    tags: ['linear', '5x5', 'beginner'],
    requiredState: requiredWorkingLoadState(['squat', 'bench_press', 'overhead_press', 'deadlift', 'barbell_row']),
    available: true,
  },
  {
    id: 'healthy-531-fsl',
    name: 'Training Max Wave',
    source: 'training_max_wave',
    sourceLabel: 'Training Max Wave',
    origin: 'system_default',
    description:
      '4-week training-max percentage wave with back-off work and structured accessories.',
    daysPerWeek: 4,
    progressionLabel: 'Training-max wave',
    complexity: 'Intermediate',
    tags: ['training max', 'wave', 'strength'],
    requiredState: requiredTrainingMaxState(),
    available: true,
  },
  {
    id: 'bromley-bullmastiff',
    name: 'Old School Wave Powerbuilding',
    source: 'wave_powerbuilding',
    sourceLabel: 'Wave Powerbuilding',
    origin: 'system_default',
    description:
      '18-week upper/lower wave structure with base and peak phases, plus-set regulation, variations, and bodybuilding accessories.',
    daysPerWeek: 4,
    progressionLabel: 'Plus-set waves',
    complexity: 'Advanced',
    tags: ['wave', 'powerbuilding', 'high volume'],
    requiredState: requiredTrainingMaxState(),
    available: true,
  },
  {
    id: 'bromley-70s-powerlifter',
    name: 'Classic Volume Strength',
    source: 'volume_strength',
    sourceLabel: 'Volume Strength',
    origin: 'system_default',
    description: '18-week upper/lower plan with volumizing waves, intensifying waves, variations, and bodybuilding layers.',
    daysPerWeek: 4,
    progressionLabel: 'Base-to-peak waves',
    complexity: 'Advanced',
    tags: ['volume', 'strength', 'peak'],
    requiredState: requiredTrainingMaxState(),
    available: true,
  },
  {
    id: 'bromley-volume-intensity',
    name: 'Volume-Intensity Strength',
    source: 'volume_strength',
    sourceLabel: 'Volume Strength',
    origin: 'system_default',
    description: 'Three-day whole-body split alternating a 3-week volume wave with a 3-week top-set wave.',
    daysPerWeek: 3,
    progressionLabel: 'Alternating volume/intensity waves',
    complexity: 'Intermediate',
    tags: ['volume', 'intensity', 'strength'],
    requiredState: requiredTrainingMaxState(),
    available: true,
  },
]

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

export function defaultProgramStateDefaults(unit: Unit = 'kg'): ProgramStateDefaults {
  void unit
  const defaults: ProgramStateDefaults = {}
  for (const state of defaultProgramStateRequirements()) {
    defaults[state.key] = null
  }
  return defaults
}

export function defaultProgramStateRequirements(): ProgramStateRequirement[] {
  return [
    ...requiredTrainingMaxState(),
    ...requiredWorkingLoadState(['squat', 'bench_press', 'overhead_press', 'deadlift', 'barbell_row']),
  ]
}

function stateDefaultValue(state: ProgramStateRequirement, defaults: ProgramStateDefaults) {
  const rawValue = defaults[state.key]
  if (rawValue === null || rawValue === undefined) return null
  const value = Number(rawValue)
  if (Number.isFinite(value) && value > 0) return value
  return null
}

export function expandPlannedSession(
  program: ProgramInstance,
  scheduledDate: string,
  definition: TemplateDefinition = getFallbackTemplateDefinition(program.templateId),
  previousBySlotId: Record<string, PlannedSession['movements'][number]['previous']> = {},
) {
  return expandSessionFromTemplateDefinition(program, definition, scheduledDate, previousBySlotId)
}

export function programForNextUncompletedSession(
  program: ProgramInstance,
  completedPlannedSessionIds: Iterable<string>,
  scheduledDate: string,
  definition: TemplateDefinition = getFallbackTemplateDefinition(program.templateId),
) {
  return programForNextUncompletedSessionFromDefinition(
    program,
    definition,
    completedPlannedSessionIds,
    scheduledDate,
  )
}

export { getFallbackTemplateDefinition, listFallbackTemplateDefinitions }

function requiredTrainingMaxState(): ProgramStateRequirement[] {
  return ['squat', 'bench_press', 'deadlift', 'overhead_press'].map((movementId) => ({
    key: `${movementId}_training_max`,
    movementId,
    type: 'training_max',
  }))
}

function requiredWorkingLoadState(movementIds: string[]): ProgramStateRequirement[] {
  return movementIds.map((movementId) => ({
    key: `${movementId}_working_load`,
    movementId,
    type: 'working_load',
  }))
}
