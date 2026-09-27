import { describe, expect, it } from 'vitest'
import { buildProgramPlan } from '@sheetless/domain/program/program-plan'
import { buildProgramSessionStamps } from '@sheetless/domain/program/program-session-stamps'
import { fixedLoadKey } from '@sheetless/domain/program/return-loads'
import type { ProgramInstance, ProgramSessionStamp, TemplateDefinition } from '@sheetless/domain/program/types'
import type { HistorySessionInput } from '@sheetless/domain/history/history'

const definition: TemplateDefinition = {
  schemaVersion: '2026.06.dsl', id: 'test-plan', name: 'Test plan', durationWeeks: 2, daysPerWeek: 2,
  timelineDescription: 'Two weeks',
  requiredState: [{ key: 'squat_training_max', movementId: 'squat', type: 'training_max' }],
  sessions: ['one', 'two'].map((id) => ({
    id, title: `Session ${id}`, estimatedMinutes: 45,
    slots: [
      { id: 'main', role: 'main', movementId: 'squat', prescriptionId: 'main' },
      { id: 'accessory', role: 'accessory', movementId: 'lat_pulldown', prescriptionId: 'accessory' },
    ],
  })),
  weeks: [0.75, 0.9].map((percent, index) => ({
    label: `Week ${index + 1}`, phaseKey: 'base', phaseLabel: 'Base', summary: 'Build steadily', hardness: 'Medium',
    prescriptions: {
      main: {
        targetSummary: '3 sets of 5', progressionRuleId: 'training_max_band',
        sets: Array.from({ length: 3 }, () => ({
          targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent, default: 'low' }, targetReps: 5,
        })),
      },
      accessory: {
        targetSummary: '4 sets of 10',
        sets: Array.from({ length: 4 }, () => ({ targetLoad: { kind: 'fixed', kg: 40 }, targetReps: 10 })),
      },
    },
  })),
}

function program(overrides: Partial<ProgramInstance> = {}): ProgramInstance {
  return {
    id: 'program-1', templateId: definition.id, templateVersionId: 'version-1', title: definition.name,
    status: 'active', startDate: '2026-09-01', units: 'kg', rounding: 2.5, currentWeekIndex: 0, stateVersion: 0,
    customizationStatus: 'default', customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
    stateValues: [{ key: 'squat_training_max', movementId: 'squat', type: 'training_max', value: 100 }],
    templateDefinition: definition,
    ...overrides,
  }
}

function saved(weekIndex: number, load: number, overrides: Partial<ProgramSessionStamp> = {}): ProgramSessionStamp {
  return {
    weekIndex, completedAt: '2026-09-21T12:00:00Z', id: `saved-${weekIndex}`, title: `Saved ${weekIndex}`,
    units: 'kg', movementCount: 2, plannedSetCount: 7, completedSetCount: 5,
    mainTargets: [{ plannedMovementId: 'squat', performedMovementId: 'squat', targetLoad: load }],
    ...overrides,
  }
}

const build = (instance: ProgramInstance, stamps: ProgramSessionStamp[] = []) => buildProgramPlan({
  program: instance, sessionStamps: stamps, scheduledDate: '2026-09-22',
})

describe('Plan programme model', () => {
  it('addresses repeat-cycle sessions by global position and preserves saved targets', () => {
    const plan = build(program({ currentWeekIndex: 6 }), [saved(0, 200), saved(4, 60), saved(5, 65)])
    expect(plan).toMatchObject({ cycleStart: 4, currentWeekIndex: 1, completedSessions: 2, totalSessions: 4 })
    expect(plan.weeks[0]).toMatchObject({
      status: 'past', sessionsDone: 2, completedSetCount: 10, plannedSetCount: 14,
      targets: [{ movementId: 'squat', load: 65, source: 'saved' }],
    })
    expect(plan.weeks[0].sessions.map((session) => session.saved?.id)).toEqual(['saved-4', 'saved-5'])
    expect(plan.weeks[0].sessions.every((session) => session.preview === null)).toBe(true)
    expect(plan.weeks[1].sessions[0]).toMatchObject({ globalIndex: 6, status: 'next', preview: { weekIndex: 6 } })
  })

  it('previews every future week from current references without speculative increases', () => {
    const plan = build(program())
    expect(plan.weeks.map((week) => week.targets[0])).toEqual([
      { movementId: 'squat', movementName: 'Squat', load: 75, source: 'preview' },
      { movementId: 'squat', movementName: 'Squat', load: 90, source: 'preview' },
    ])
    expect(plan.weeks[1].sessions[0].preview?.scheduledDate).toBe('2026-09-22')
    expect(plan.weeks[1].sessions.every((session) => session.status === 'upcoming')).toBe(true)
  })

  it('keeps incomplete historical coverage unavailable instead of recomputing old targets', () => {
    const plan = build(program({ currentWeekIndex: 2 }), [saved(0, 65)])
    expect(plan.weeks[0]).toMatchObject({
      sessionsDone: 2, completedSetCount: null, plannedSetCount: null,
      targets: [{ load: null, source: 'unavailable' }],
    })
    expect(plan.weeks[0].sessions[1]).toMatchObject({ status: 'unavailable', saved: null, preview: null })
    const legacy = build(program({ currentWeekIndex: 2 }), [saved(0, 60), saved(1, 65, { mainTargets: undefined })])
    expect(legacy.weeks[0].targets[0]).toMatchObject({ load: null, source: 'unavailable' })
  })

  it('keeps replacements distinct, converts known units, and labels mixed saved/preview weeks', () => {
    const plan = build(program({ currentWeekIndex: 1 }), [saved(0, 0, {
      units: 'lb', mainTargets: [{ plannedMovementId: 'squat', performedMovementId: 'front_squat', targetLoad: 100 }],
    })])
    expect(plan.weeks[0].targets.find((target) => target.movementId === 'front_squat')?.load).toBeCloseTo(45.359, 3)
    expect(plan.weeks[0].targets.find((target) => target.movementId === 'squat')).toMatchObject({ load: 75, source: 'preview' })
    const mixed = build(program({ currentWeekIndex: 1 }), [saved(0, 80)])
    expect(mixed.weeks[0].targets[0]).toMatchObject({ load: 80, source: 'mixed' })
    const unknownUnits = build(program({ currentWeekIndex: 1 }), [saved(0, 80, { units: null })])
    expect(unknownUnits.weeks[0].targets[0]).toMatchObject({ load: null, source: 'unavailable' })
  })

  it('honors equipment adaptations, effective accessories and saved fixed-load overrides', () => {
    const instance = program({
      equipmentMode: 'free_weight',
      equipmentModeChoices: ['one', 'two'].map((templateSessionId) => ({
        templateSessionId, slotId: `slot-${templateSessionId}-accessory`, phaseKey: 'base', role: 'accessory',
        sourceMovementId: 'lat_pulldown', replacementMovementId: 'pull_up', policyRuleId: 'free-weight-v1-lat_pulldown',
      })),
      accessoryAdditions: [{
        sessionId: 'one', slotId: 'added-curl', phaseKey: '*', movementId: 'dumbbell_curl', prescriptionId: '',
        effectiveFromWeekIndex: 2, orderIndex: 3, sets: [{ id: 'added-1', setIndex: 1, targetLoad: 10, targetReps: 12 }],
      }],
    })
    const plan = build(instance)
    expect(plan.weeks[0].sessions[0].preview?.movements[1].movementId).toBe('pull_up')
    expect(plan.weeks[0].sessions[0].preview?.movements[1].sets.map((set) => set.targetLoad)).toEqual([null, null, null, null])
    expect(plan.weeks[0].sessions[0].movementCount).toBe(2)
    expect(plan.weeks[1].sessions[0].movementCount).toBe(3)
    expect(plan.weeks[1].sessions[0].plannedSetCount).toBe(8)

    const selector = { templateSessionId: 'one', slotId: 'slot-one-accessory', weekIndex: 0, movementId: 'lat_pulldown', setIndex: 1 }
    const overridden = build(program({ loadOverrides: [{ key: fixedLoadKey(selector), selector, value: 22.5 }] }))
    expect(overridden.weeks[0].sessions[0].preview?.movements[1].sets[0].targetLoad).toBe(22.5)
  })

  it('previews return stage set counts and keeps final-stage review active without weight increases', () => {
    const plan = build(program({ returnPeriod: {
      id: 'return-1', policyVersion: 1, status: 'active', startedAt: '2026-09-22T00:00:00Z', completedWorkouts: 0,
      settings: {
        stages: [{ workouts: 1, setFraction: 0.5, setCounts: {} }, { workouts: 1, setFraction: 0.75, setCounts: {} }],
        minimumRir: 3, defaultCap: 2.5, caps: {},
      },
    } }))
    const sessions = plan.weeks.flatMap((week) => week.sessions)
    expect(sessions.map((session) => session.plannedSetCount)).toEqual([4, 6, 6, 6])
    expect(sessions[2].preview?.returnContext?.review).toBe(true)
    expect(plan.weeks[1].targets[0]).toMatchObject({ load: 90, source: 'preview' })
  })

  it('supports a custom plan without reference values or load-bearing main lifts', () => {
    const custom = { ...definition, requiredState: [], sessions: definition.sessions.map((session) => ({
      ...session, slots: [{ id: 'main', movementId: 'pull_up', role: 'main' as const, prescriptionId: 'accessory' }],
    })), weeks: definition.weeks.map((week) => ({ ...week, prescriptions: {
      accessory: { targetSummary: '3 sets of 8', sets: Array.from({ length: 3 }, () => ({ targetReps: 8 })) },
    } })) }
    const plan = build(program({ stateValues: [], templateDefinition: custom }))
    expect(plan.weeks[0].sessions[0].plannedSetCount).toBe(3)
    expect(plan.weeks[0].targets[0]).toMatchObject({ movementId: 'pull_up', load: null, source: 'unavailable' })
  })
})

describe('saved programme stamp facts', () => {
  it('counts completed bodyweight sets and preserves prescribed rather than actual targets', () => {
    const session: HistorySessionInput = {
      id: 'saved-1', plannedSessionId: 'one-w1', title: 'Original title', programInstanceId: 'program-1',
      scheduledDate: '2026-09-20', completedAt: '2026-09-20T12:00:00Z', weekIndex: 0,
      units: 'kg', movementCount: 2, plannedSetCount: 3,
      exercises: [{
        id: 'main', plannedMovementId: 'squat', performedMovementId: 'front_squat', performedMovementName: 'Front Squat', role: 'main',
        sets: [
          { id: 'set-1', setIndex: 1, completed: true, actualLoad: 250, targetLoad: 60 },
          { id: 'set-2', setIndex: 2, completed: false, actualLoad: null, targetLoad: 70 },
        ],
      }, {
        id: 'accessory', plannedMovementId: 'pull_up', performedMovementId: 'pull_up', performedMovementName: 'Pull-Up', role: 'accessory',
        sets: [{ id: 'set-3', setIndex: 1, completed: true, actualLoad: 0, targetLoad: null }],
      }],
    }
    expect(buildProgramSessionStamps([session, { ...session, id: 'other', programInstanceId: 'other' }], 'program-1')).toEqual([{
      id: 'saved-1', title: 'Original title', weekIndex: 0, completedAt: '2026-09-20T12:00:00Z', units: 'kg',
      movementCount: 2, plannedSetCount: 3, completedSetCount: 2,
      mainTargets: [{ plannedMovementId: 'squat', performedMovementId: 'front_squat', targetLoad: 70 }],
    }])
  })
})
