import type {
  PlannedSession,
  ProgramInstance,
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
    name: 'Alternating 5x5 LP',
    source: 'linear_strength',
    sourceLabel: 'Linear Strength',
    origin: 'system_default',
    description:
      'Three-day beginner linear progression alternating A/B sessions with 5x5 work and a 1x5 deadlift.',
    daysPerWeek: 3,
    progressionLabel: 'Working-load LP',
    complexity: 'Beginner',
    tags: ['linear', '5x5', 'beginner'],
    requiredState: requiredWorkingLoadState(['squat', 'bench_press', 'overhead_press', 'deadlift', 'barbell_row']),
    available: true,
  },
  {
    id: 'healthy-531-fsl',
    name: 'Healthy 5/3/1 FSL',
    source: 'healthy_531',
    sourceLabel: 'Healthy 5/3/1',
    origin: 'system_default',
    description:
      '4-week 5/3/1 training-max progression with First Set Last supplemental work and structured accessories.',
    daysPerWeek: 4,
    progressionLabel: 'TM progression + FSL',
    complexity: 'Intermediate',
    tags: ['5/3/1', 'base'],
    requiredState: requiredTrainingMaxState(),
    available: true,
  },
  {
    id: 'bromley-bullmastiff',
    name: 'Bromley Bullmastiff',
    source: 'bromley_base_strength',
    sourceLabel: 'Bromley',
    origin: 'coach_authored',
    description:
      '18-week upper/lower Bullmastiff structure with base and peak phases, autoregulated plus sets, variations, and bodybuilding accessories.',
    daysPerWeek: 4,
    progressionLabel: '18-week plus-set waves',
    complexity: 'Advanced',
    tags: ['bromley', 'base', 'high volume'],
    requiredState: requiredTrainingMaxState(),
    available: true,
  },
  {
    id: 'bromley-70s-powerlifter',
    name: 'Bromley 70s Powerlifter',
    source: 'bromley_base_strength',
    sourceLabel: 'Bromley',
    origin: 'coach_authored',
    description: '18-week upper/lower plan with volumizing waves, intensifying waves, variations, and bodybuilding layers.',
    daysPerWeek: 4,
    progressionLabel: 'Base-to-peak waves',
    complexity: 'Advanced',
    tags: ['bromley', 'base', 'peak'],
    requiredState: requiredTrainingMaxState(),
    available: true,
  },
  {
    id: 'bromley-volume-intensity',
    name: 'Bromley Volume/Intensity',
    source: 'bromley_base_strength',
    sourceLabel: 'Bromley',
    origin: 'coach_authored',
    description: 'Three-day whole-body split alternating a 3-week volume wave with a 3-week top-set wave.',
    daysPerWeek: 3,
    progressionLabel: 'Alternating volume/intensity waves',
    complexity: 'Intermediate',
    tags: ['bromley', 'base'],
    requiredState: requiredTrainingMaxState(),
    available: true,
  },
]

export function defaultStateValues(
  unit: Unit = 'kg',
  requiredState: ProgramStateRequirement[] = requiredTrainingMaxState(),
): ProgramStateInput[] {
  const values =
    unit === 'kg'
      ? { squat: 165, bench_press: 110, deadlift: 190, overhead_press: 75, barbell_row: 60 }
      : { squat: 365, bench_press: 245, deadlift: 420, overhead_press: 165, barbell_row: 135 }
  return requiredState.map((state) => ({
    ...state,
    value: values[state.movementId as keyof typeof values] ?? (unit === 'kg' ? 60 : 135),
    unit,
  }))
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
