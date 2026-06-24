import type { ProgramInstance } from '~/types/training'
import {
  buildProgramTimelineFromDefinition,
  type ProgramTimelineModel,
  type TimelineSession,
  type TimelineWeek,
  type TemplateDefinition,
} from './template-engine'
import { getFallbackTemplateDefinition } from './template-definitions'

export type { ProgramTimelineModel, TimelineSession, TimelineWeek }

export function buildProgramTimeline(
  program: Pick<ProgramInstance, 'templateId' | 'currentWeekIndex'>,
  definition: TemplateDefinition = getFallbackTemplateDefinition(program.templateId),
) {
  return buildProgramTimelineFromDefinition(program, definition)
}

export function buildOldSchoolWaveTimeline(currentSessionIndex: number) {
  return buildProgramTimeline(
    { templateId: 'bromley-bullmastiff', currentWeekIndex: currentSessionIndex },
    getFallbackTemplateDefinition('bromley-bullmastiff'),
  )
}

export function buildTrainingMaxWaveTimeline(currentSessionIndex: number) {
  return buildProgramTimeline(
    { templateId: 'healthy-531-fsl', currentWeekIndex: currentSessionIndex },
    getFallbackTemplateDefinition('healthy-531-fsl'),
  )
}
