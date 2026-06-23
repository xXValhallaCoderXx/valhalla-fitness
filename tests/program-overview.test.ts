import { describe, expect, it } from 'vitest'
import { calculateBodyLoad } from '../src/lib/body-load'
import { buildProgramOverview } from '../src/lib/program-overview'
import { getFallbackTemplateDefinition } from '../src/lib/template-definitions'
import { expandPlannedSession } from '../src/lib/templates'
import type { ProgramInstance, TodayPayload, WorkoutSession } from '../src/types/training'

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
  stateValues: [
    { key: 'squat_training_max', movementId: 'squat', type: 'training_max', value: 165 },
    { key: 'bench_press_training_max', movementId: 'bench_press', type: 'training_max', value: 110 },
    { key: 'deadlift_training_max', movementId: 'deadlift', type: 'training_max', value: 190 },
    { key: 'overhead_press_training_max', movementId: 'overhead_press', type: 'training_max', value: 75 },
  ],
  templateDefinition: getFallbackTemplateDefinition('bromley-bullmastiff'),
}

describe('program overview model', () => {
  it('derives position, next session, state values, and accessory plan from the active template', () => {
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
      movementSummary: 'Bench Press, Close-Grip Bench Press, Chest-Supported Row, Triceps Pressdown',
      mainCount: 1,
      accessoryCount: 2,
      status: 'planned',
      href: '/today',
    })
    expect(overview.stateValues.map((state) => state.movementName)).toContain('Bench Press')
    expect(overview.accessoryPlan).toHaveLength(4)
    expect(overview.recentSessions[0]?.topSetHighlights).toEqual(['Squat 120 kg x 6+'])
  })

  it('keeps an advanced next session planned after a different session was completed today', () => {
    const lpProgram: ProgramInstance = {
      ...program,
      templateId: 'generic_alternating_5x5_lp',
      title: 'Alternating 5x5 LP',
      currentWeekIndex: 1,
      stateValues: [
        { key: 'squat_working_load', movementId: 'squat', type: 'working_load', value: 60 },
        { key: 'bench_press_working_load', movementId: 'bench_press', type: 'working_load', value: 45 },
        { key: 'overhead_press_working_load', movementId: 'overhead_press', type: 'working_load', value: 30 },
        { key: 'deadlift_working_load', movementId: 'deadlift', type: 'working_load', value: 80 },
        { key: 'barbell_row_working_load', movementId: 'barbell_row', type: 'working_load', value: 40 },
      ],
      templateDefinition: getFallbackTemplateDefinition('generic_alternating_5x5_lp'),
    }
    const completedDayOne = expandPlannedSession({ ...lpProgram, currentWeekIndex: 0 }, '2026-06-22', lpProgram.templateDefinition)
    const plannedDayTwo = expandPlannedSession(lpProgram, '2026-06-22', lpProgram.templateDefinition)
    const today: TodayPayload = {
      activeProgram: lpProgram,
      plannedSession: plannedDayTwo,
      activeSession: null,
      completedSession: {
        ...completedDayOne,
        sessionId: 'completed-day-one',
        status: 'completed',
        completedAt: '2026-06-22T10:00:00.000Z',
        syncState: 'synced',
      } satisfies WorkoutSession,
      pendingDecisions: [],
    }

    const overview = buildProgramOverview({
      today,
      recentSessions: [],
      bodyLoad: calculateBodyLoad([]),
      acceptedDecisions: [],
    })

    expect(overview.nextSession).toMatchObject({
      title: 'Day 2',
      movementSummary: 'Squat, Overhead Press, Deadlift',
      keyPrescription: '5x5 @ current working load',
      mainCount: 3,
      accessoryCount: 0,
      status: 'planned',
      href: '/today',
    })
    expect(overview.nextSession?.movements.map((movement) => movement.movementName)).toEqual([
      'Squat',
      'Overhead Press',
      'Deadlift',
    ])
  })
})
