import { describe, expect, it } from 'vitest'
import { buildAccessoryInitialSets, parseAccessoryRepTarget } from '../src/lib/accessories'
import { movementCatalog } from '../src/lib/movements'
import { buildProgramStartStateValues } from '../src/lib/program-loads'
import { defaultProgramStateDefaults, defaultStateValues, expandPlannedSession, programForNextUncompletedSession } from '../src/lib/templates'
import { getFallbackTemplateDefinition, listFallbackTemplateDefinitions } from '../src/lib/template-definitions'
import { findMissingTemplateMovementIds, validateRequiredState, validateTemplateDefinition } from '../src/lib/template-engine'
import type { ProgramInstance } from '../src/types/training'

const program: ProgramInstance = {
  id: 'program-1',
  templateId: 'bromley-bullmastiff',
  templateVersionId: 'template-version-1',
  title: 'Old School Wave Powerbuilding',
  status: 'active',
  startDate: '2026-06-21',
  units: 'kg',
  rounding: 2.5,
  currentWeekIndex: 0,
  customizationStatus: 'default',
  customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
  stateValues: [
    { key: 'squat_training_max', movementId: 'squat', type: 'training_max', value: 165 },
    { key: 'bench_press_training_max', movementId: 'bench_press', type: 'training_max', value: 110 },
    { key: 'deadlift_training_max', movementId: 'deadlift', type: 'training_max', value: 190 },
    { key: 'overhead_press_training_max', movementId: 'overhead_press', type: 'training_max', value: 75 },
  ],
}

describe('planned session progression', () => {
  it('keeps missing profile loads unset and blocks templates that require them', () => {
    const definition = getFallbackTemplateDefinition('generic_alternating_5x5_lp')
    const stateValues = defaultStateValues('kg', definition.requiredState, defaultProgramStateDefaults('kg'))

    expect(stateValues.every((state) => state.value === null)).toBe(true)
    expect(() => validateRequiredState(definition, stateValues)).toThrow('Missing valid programme state')
  })

  it('preserves saved load defaults without filling missing keys', () => {
    const definition = getFallbackTemplateDefinition('generic_alternating_5x5_lp')
    const stateValues = defaultStateValues('kg', definition.requiredState, {
      ...defaultProgramStateDefaults('kg'),
      squat_working_load: 60,
    })

    expect(stateValues.find((state) => state.key === 'squat_working_load')?.value).toBe(60)
    expect(stateValues.find((state) => state.key === 'bench_press_working_load')?.value).toBeNull()
  })

  it('derives programme working loads from saved e1RMs at start', () => {
    const definition = getFallbackTemplateDefinition('generic_alternating_5x5_lp')
    const stateValues = buildProgramStartStateValues({
      unit: 'kg',
      requiredState: definition.requiredState,
      defaults: {
        ...defaultProgramStateDefaults('kg'),
        squat_one_rep_max: 100,
        bench_press_one_rep_max: 82.5,
        squat_training_max: 300,
        squat_working_load: 999,
      },
      rounding: 2.5,
      workingLoadPercent: 75,
    })

    expect(stateValues.find((state) => state.key === 'squat_working_load')?.value).toBe(75)
    expect(stateValues.find((state) => state.key === 'bench_press_working_load')?.value).toBe(62.5)
    expect(stateValues.find((state) => state.key === 'barbell_row_working_load')?.value).toBeNull()
  })

  it('derives programme training maxes from saved e1RMs at start', () => {
    const definition = getFallbackTemplateDefinition('healthy-531-fsl')
    const stateValues = buildProgramStartStateValues({
      unit: 'kg',
      requiredState: definition.requiredState,
      defaults: {
        ...defaultProgramStateDefaults('kg'),
        squat_one_rep_max: 140,
        bench_press_one_rep_max: 100,
        squat_training_max: 999,
      },
      rounding: 2.5,
      trainingMaxPercent: 90,
    })

    expect(stateValues.find((state) => state.key === 'squat_training_max')?.value).toBe(125)
    expect(stateValues.find((state) => state.key === 'bench_press_training_max')?.value).toBe(90)
    expect(stateValues.find((state) => state.key === 'deadlift_training_max')?.value).toBeNull()
  })

  it('validates all fallback template definitions', () => {
    for (const definition of listFallbackTemplateDefinitions()) {
      expect(validateTemplateDefinition(definition)).toMatchObject({ ok: true })
      expect(findMissingTemplateMovementIds(definition, movementCatalog)).toEqual([])
    }
  })

  it('keeps training-max wave prescriptions on the same cycle week for all four weekly sessions', () => {
    const healthyProgram: ProgramInstance = { ...program, templateId: 'healthy-531-fsl' }
    const sessions = [0, 1, 2, 3].map((currentWeekIndex) =>
      expandPlannedSession({ ...healthyProgram, currentWeekIndex }, '2026-06-21'),
    )

    expect(sessions.map((session) => session.id)).toEqual([
      'squat-day-w1',
      'bench-day-w1',
      'deadlift-day-w1',
      'press-day-w1',
    ])
    expect(sessions.every((session) => session.movements[0]?.sets.find((set) => set.isAmrap)?.targetReps === 5)).toBe(true)
  })

  it('moves training-max wave into week two after all four weekly sessions', () => {
    const healthyProgram: ProgramInstance = { ...program, templateId: 'healthy-531-fsl', currentWeekIndex: 4 }
    const nextSession = expandPlannedSession(healthyProgram, '2026-06-21')

    expect(nextSession.id).toBe('squat-day-w2')
    expect(nextSession.movements[0]?.sets.find((set) => set.isAmrap)?.targetReps).toBe(3)
  })

  it('expands beginner 5x5 linear as a continuous A/B rotation with suggested accessories', () => {
    const lpProgram: ProgramInstance = {
      ...program,
      templateId: 'generic_alternating_5x5_lp',
      title: 'Beginner 5x5 Linear',
      stateValues: [
        { key: 'squat_working_load', movementId: 'squat', type: 'working_load', value: 60 },
        { key: 'bench_press_working_load', movementId: 'bench_press', type: 'working_load', value: 45 },
        { key: 'overhead_press_working_load', movementId: 'overhead_press', type: 'working_load', value: 30 },
        { key: 'deadlift_working_load', movementId: 'deadlift', type: 'working_load', value: 80 },
        { key: 'barbell_row_working_load', movementId: 'barbell_row', type: 'working_load', value: 40 },
      ],
    }
    const sessions = [0, 1, 2, 3, 4, 5, 6].map((currentWeekIndex) =>
      expandPlannedSession({ ...lpProgram, currentWeekIndex }, '2026-06-21'),
    )

    expect(sessions.map((session) => session.movements.map((movement) => movement.movementId).join('/'))).toEqual([
      'squat/bench_press/barbell_row/chin_up/back_extension',
      'squat/overhead_press/deadlift/lat_pulldown/sit_up',
      'squat/bench_press/barbell_row/pull_up/cable_crunch',
      'squat/overhead_press/deadlift/chin_up/back_extension',
      'squat/bench_press/barbell_row/lat_pulldown/sit_up',
      'squat/overhead_press/deadlift/pull_up/cable_crunch',
      'squat/bench_press/barbell_row/chin_up/back_extension',
    ])
    expect(sessions[0]?.movements[0]?.sets).toHaveLength(5)
    expect(sessions[1]?.movements[2]?.sets).toHaveLength(1)
    expect(sessions[1]?.movements[3]).toMatchObject({
      movementName: 'Lat Pulldown',
      role: 'accessory',
      targetSummary: '3 sets x 6-10 reps @ RIR 2',
    })
    expect(sessions[1]?.movements[4]).toMatchObject({
      movementName: 'Sit-Up',
      role: 'accessory',
      targetSummary: '3 sets x 10-15 reps @ RIR 2',
    })
    expect(sessions[0]?.movements[0]?.sets[0]?.targetLoad).toBe(60)
    expect(sessions[1]?.movements[2]?.sets[0]?.targetLoad).toBe(80)
  })

  it('moves old-school wave from completed squat day to bench day', () => {
    const nextProgram = programForNextUncompletedSession(program, ['wave-squat-w1'], '2026-06-21')
    const nextSession = expandPlannedSession(nextProgram, '2026-06-21')

    expect(nextProgram.currentWeekIndex).toBe(1)
    expect(nextSession.title).toBe('Bench Wave')
    expect(nextSession.movements[0]?.movementName).toBe('Bench Press')
    expect(nextSession.id).toBe('wave-bench-w1')
    expect(nextSession.movements[0]?.sets.at(-1)?.targetReps).toBe(6)
  })

  it('keeps old-school wave prescriptions on the same programme week for all four weekly sessions', () => {
    const sessions = [0, 1, 2, 3].map((currentWeekIndex) =>
      expandPlannedSession({ ...program, currentWeekIndex }, '2026-06-21'),
    )

    expect(sessions.map((session) => session.id)).toEqual([
      'wave-squat-w1',
      'wave-bench-w1',
      'wave-deadlift-w1',
      'wave-press-w1',
    ])
    expect(sessions.every((session) => session.movements[0]?.sets.at(-1)?.targetReps === 6)).toBe(true)
  })

  it('moves old-school wave into peak prescriptions after the 9-week base phase', () => {
    const peakSession = expandPlannedSession({ ...program, currentWeekIndex: 36 }, '2026-06-21')

    expect(peakSession.weekLabel).toContain('Peak Wave 1')
    expect(peakSession.movements[0]?.sets).toHaveLength(5)
    expect(peakSession.movements[0]?.sets.at(-1)?.targetReps).toBe(3)
    expect(peakSession.movements[1]?.movementName).toBe('Pause Squat')
  })

  it('does not advance when the current planned day has not been completed', () => {
    const nextProgram = programForNextUncompletedSession(program, ['bull-bench-w2'], '2026-06-21')
    const nextSession = expandPlannedSession(nextProgram, '2026-06-21')

    expect(nextProgram.currentWeekIndex).toBe(0)
    expect(nextSession.title).toBe('Squat Wave')
  })

  it('applies future movement overrides only to the matching slot and phase', () => {
    const baseSquat = expandPlannedSession(
      {
        ...program,
        currentWeekIndex: 4,
        movementOverrides: [
          {
            slotId: 'slot-wave-squat-variation',
            phaseKey: 'base',
            role: 'variation',
            originalMovementId: 'front_squat',
            replacementMovementId: 'safety_bar_squat',
            effectiveFromWeekIndex: 1,
          },
        ],
      },
      '2026-06-21',
    )
    const peakSquat = expandPlannedSession(
      {
        ...program,
        currentWeekIndex: 36,
        movementOverrides: [
          {
            slotId: 'slot-wave-squat-variation',
            phaseKey: 'base',
            role: 'variation',
            originalMovementId: 'front_squat',
            replacementMovementId: 'safety_bar_squat',
            effectiveFromWeekIndex: 1,
          },
        ],
      },
      '2026-06-21',
    )

    expect(baseSquat.movements[1]?.movementName).toBe('Safety Bar Squat')
    expect(peakSquat.movements[1]?.movementName).toBe('Pause Squat')
  })

  it('applies setup-time wildcard accessory overrides from the first programme week', () => {
    const session = expandPlannedSession(
      {
        ...program,
        movementOverrides: [
          {
            slotId: 'slot-wave-squat-accessory-1',
            phaseKey: '*',
            role: 'accessory',
            originalMovementId: 'leg_press',
            replacementMovementId: 'hack_squat',
            effectiveFromWeekIndex: 0,
          },
        ],
      },
      '2026-06-21',
    )

    expect(session.movements[2]?.movementName).toBe('Hack Squat')
  })

  it('appends setup-time accessory additions with copied accessory prescriptions', () => {
    const session = expandPlannedSession(
      {
        ...program,
        accessoryAdditions: [
          {
            sessionId: 'wave-squat',
            slotId: 'added-accessory-1-hack_squat',
            phaseKey: '*',
            movementId: 'hack_squat',
            prescriptionId: 'accessory-1',
            sourceSlotId: 'accessory-1',
            effectiveFromWeekIndex: 0,
            orderIndex: 1,
          },
        ],
      },
      '2026-06-21',
    )

    expect(session.movements.map((movement) => movement.movementName)).toContain('Hack Squat')
    expect(session.movements.at(-1)).toMatchObject({
      role: 'accessory',
      targetSummary: '3 sets x 10-15 reps @ RIR 2',
      isAdded: true,
    })
  })

  it('appends live-added accessories with stored manual prescriptions', () => {
    const session = expandPlannedSession(
      {
        ...program,
        accessoryAdditions: [
          {
            sessionId: 'wave-squat',
            slotId: 'added-accessory-1-face_pull',
            phaseKey: 'base',
            movementId: 'face_pull',
            prescriptionId: 'manual-double_progression',
            sourceSlotId: null,
            targetSummary: '10-15 reps · Double progression',
            sets: buildAccessoryInitialSets(parseAccessoryRepTarget('10-15')!),
            note: 'Extra upper back',
            progressionMethod: 'double_progression',
            effectiveFromWeekIndex: 0,
            orderIndex: 1,
          },
        ],
      },
      '2026-06-21',
    )

    expect(session.movements.at(-1)).toMatchObject({
      movementName: 'Face Pull',
      role: 'accessory',
      targetSummary: '10-15 reps · Double progression',
      progressionRuleId: 'accessory_double_progression',
      progressionMethod: 'double_progression',
      notes: 'Extra upper back',
      isAdded: true,
      addedScope: 'phase_slot',
    })
    expect(session.movements.at(-1)?.sets).toHaveLength(1)
    expect(session.movements.at(-1)?.sets[0]).toMatchObject({
      targetRepMin: 10,
      targetRepMax: 15,
      completed: false,
    })
  })

  it('generates classic volume strength first-week base work from DSL data', () => {
    const session = expandPlannedSession(
      { ...program, templateId: 'bromley-70s-powerlifter', title: 'Classic Volume Strength', currentWeekIndex: 0 },
      '2026-06-21',
    )

    expect(session.title).toBe('Bench Volume')
    expect(session.movements.map((movement) => movement.role)).toEqual([
      'main',
      'variation',
      'variation',
      'accessory',
      'accessory',
      'accessory',
    ])
    expect(session.movements[0]?.targetSummary).toBe('3x10 @ 60%')
    expect(session.movements[0]?.sets).toHaveLength(3)
    expect(session.movements[1]?.movementName).toBe('Wide-Grip Bench Press')
  })

  it('generates classic volume strength peak examples without dropping below authored peak percentages', () => {
    const peakSession = expandPlannedSession(
      { ...program, templateId: 'bromley-70s-powerlifter', title: 'Classic Volume Strength', currentWeekIndex: 36 },
      '2026-06-21',
    )

    expect(peakSession.weekLabel).toContain('Peak Wave 1')
    expect(peakSession.movements[0]?.targetSummary).toBe('5x3 @ 80%')
    expect(peakSession.movements[1]?.movementName).toBe('Pause Bench Press')
    expect(peakSession.movements[1]?.targetSummary).toBe('5x5 @ 70%')
  })

  it('generates Volume/Intensity volume and top-set waves', () => {
    const volumeSession = expandPlannedSession(
      { ...program, templateId: 'bromley-volume-intensity', title: 'Volume-Intensity Strength', currentWeekIndex: 0 },
      '2026-06-21',
    )
    const peakSession = expandPlannedSession(
      { ...program, templateId: 'bromley-volume-intensity', title: 'Volume-Intensity Strength', currentWeekIndex: 9 },
      '2026-06-21',
    )

    expect(volumeSession.title).toBe('Volume-Intensity Monday')
    expect(volumeSession.movements[0]?.targetSummary).toBe('3x12 @ 55%')
    expect(volumeSession.movements[1]?.targetSummary).toBe('65% x F')
    expect(peakSession.weekLabel).toContain('Top-set wave')
    expect(peakSession.movements[0]?.targetSummary).toBe('5x5 @ 75%')
    expect(peakSession.movements[1]?.sets[0]?.targetLoad).toBeNull()
  })
})
