import type { ProgramInstance } from '~/shared/types'
import {
  buildProgramTimelineFromDefinition,
  type ProgramTimelineModel,
  type TimelineSession,
  type TimelineWeek,
  type TemplateDefinition,
} from '~/domains/program/lib/template-engine'
import { getFallbackTemplateDefinition } from '~/domains/program/lib/template-definitions'

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
