import { describe, expect, it } from 'vitest'
import { calculateBodyLoad } from '../src/lib/body-load'
import { buildProgramOverview } from '../src/lib/program-overview'
import { getFallbackTemplateDefinition } from '../src/lib/template-definitions'
import { expandPlannedSession } from '../src/lib/templates'
import type { ProgramInstance, TodayPayload } from '../src/types/training'

const program: ProgramInstance = {
  id: 'program-1',
  templateId: 'bromley-bullmastiff',
  templateVersionId: 'template-version-1',
  title: 'Bromley Bullmastiff',
  status: 'active',
  startDate: '2026-06-21',
  units: 'kg',
  rounding: 2.5,
  currentWeekIndex: 1,
  customizationStatus: 'default',
  customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
  anchors: [
    { movementId: 'squat', anchorType: 'training_max', value: 165 },
    { movementId: 'bench_press', anchorType: 'training_max', value: 110 },
    { movementId: 'deadlift', anchorType: 'training_max', value: 190 },
    { movementId: 'overhead_press', anchorType: 'training_max', value: 75 },
  ],
  templateDefinition: getFallbackTemplateDefinition('bromley-bullmastiff'),
}

describe('program overview model', () => {
  it('derives position, next session, anchors, and accessory plan from the active template', () => {
    const plannedSession = expandPlannedSession(program, '2026-06-22', program.templateDefinition)
    const today: TodayPayload = {
      activeProgram: program,
      plannedSession,
      activeSession: null,
      completedSession: null,
      pendingDecisions: [],
    }

    const overview = buildProgramOverview({
      today,
      recentSessions: [
        {
          id: 'session-1',
          title: 'Bullmastiff Squat',
          scheduledDate: '2026-06-21',
          completedAt: '2026-06-21T12:00:00.000Z',
          completedSetCount: 8,
          plannedSetCount: 8,
          topSetHighlights: ['Squat 120 kg x 6+'],
        },
      ],
      bodyLoad: calculateBodyLoad([]),
      acceptedDecisions: [],
    })

    expect(overview.position).toMatchObject({
      phaseKey: 'base',
      phaseLabel: 'Base phase',
      weekNumber: 1,
      sessionNumber: 2,
    })
    expect(overview.nextSession).toMatchObject({
      title: 'Bullmastiff Bench',
      mainMovementName: 'Bench Press',
      accessoryCount: 2,
      status: 'planned',
      href: '/today',
    })
    expect(overview.anchors.map((anchor) => anchor.movementName)).toContain('Bench Press')
    expect(overview.accessoryPlan).toHaveLength(4)
    expect(overview.recentSessions[0]?.topSetHighlights).toEqual(['Squat 120 kg x 6+'])
  })
})
