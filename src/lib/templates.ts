import type {
  AnchorInput,
  PlannedSession,
  ProgramInstance,
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
    available: true,
  },
]

export function defaultAnchors(unit: Unit = 'kg'): AnchorInput[] {
  const values =
    unit === 'kg'
      ? { squat: 165, bench_press: 110, deadlift: 190, overhead_press: 75 }
      : { squat: 365, bench_press: 245, deadlift: 420, overhead_press: 165 }
  return Object.entries(values).map(([movementId, value]) => ({
    movementId,
    anchorType: 'training_max',
    value,
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
