import type { ProgramInstance } from '~/shared/types'
import {
  buildProgramTimelineFromDefinition,
  type ProgramTimelineModel,
  type TimelineSession,
  type TimelineWeek,
  type TemplateDefinition,
} from '~/domains/program/lib/template-engine'

export type { ProgramTimelineModel, TimelineSession, TimelineWeek }

// `definition` is required: falling back to the built-in catalogue here would drag the full
// template DSL data into the client bundle, and it throws for custom template ids anyway.
export function buildProgramTimeline(
  program: Pick<ProgramInstance, 'templateId' | 'currentWeekIndex'>,
  definition: TemplateDefinition,
) {
  return buildProgramTimelineFromDefinition(program, definition)
}
