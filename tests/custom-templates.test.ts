import { describe, expect, it } from 'vitest'
import {
  buildCustomProgramTemplateDefinition,
  createDefaultCustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '../src/lib/custom-templates'
import { buildProgressionDecisionsForSession } from '../src/lib/progression-decisions'
import { expandPlannedSession } from '../src/lib/templates'
import { validateTemplateDefinition, type TemplateDefinition } from '../src/lib/template-engine'
import type { ProgramInstance, WorkoutSession } from '../src/types/training'

function build(methodology: CustomProgramMethodology, templateId = `custom-${methodology}`) {
  return buildCustomProgramTemplateDefinition({
    templateId,
    input: createDefaultCustomProgramBuilderInput({ methodology, daysPerWeek: methodology === 'training_max_wave' ? 4 : 3 }),
  })
}

function programFor(definition: TemplateDefinition): ProgramInstance {
  return {
    id: 'program-1',
    templateId: definition.id,
    templateVersionId: 'template-version-1',
    title: definition.name,
    status: 'active',
    startDate: '2026-06-23',
    units: 'kg',
    rounding: 2.5,
    currentWeekIndex: 0,
    customizationStatus: 'default',
    customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
    stateValues: definition.requiredState.map((state) => ({
      ...state,
      value: 100,
    })),
    templateDefinition: definition,
  }
}

function completeMainWork(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    movements: session.movements.map((movement) =>
      movement.role === 'main'
        ? {
            ...movement,
            sets: movement.sets.map((set) => ({
              ...set,
              completed: true,
              actualReps: set.targetReps ?? set.targetRepMin ?? 1,
              actualRir: set.targetRir ?? 2,
            })),
          }
        : movement,
    ),
  }
}

function firstSessionFor(definition: TemplateDefinition): WorkoutSession {
  const planned = expandPlannedSession(programFor(definition), '2026-06-23', definition)
  return {
    ...planned,
    sessionId: 'session-1',
    status: 'in_progress',
  }
}

describe('custom programme templates', () => {
  it('generates valid template definitions for all supported methodologies', () => {
    for (const methodology of ['none', 'training_max_wave', 'plus_set_wave', 'simple_linear'] as const) {
      const generated = build(methodology)
      expect(validateTemplateDefinition(generated.definition)).toMatchObject({ ok: true })
      expect(generated.metadata.origin).toBe('user_created')
      expect(generated.metadata.sourceLabel).toBe('Custom')
      expect(generated.definition.sessions).toHaveLength(generated.definition.daysPerWeek)
    }
  })

  it('generates valid 1-day, 5-day, and 7-day templates', () => {
    for (const daysPerWeek of [1, 5, 7]) {
      const generated = buildCustomProgramTemplateDefinition({
        templateId: `custom-${daysPerWeek}-day`,
        input: createDefaultCustomProgramBuilderInput({ methodology: 'simple_linear', daysPerWeek }),
      })
      expect(validateTemplateDefinition(generated.definition)).toMatchObject({ ok: true })
      expect(generated.definition.daysPerWeek).toBe(daysPerWeek)
      expect(generated.definition.sessions).toHaveLength(daysPerWeek)
    }
  })

  it('dedupes required state when main lifts repeat across days', () => {
    const generated = buildCustomProgramTemplateDefinition({
      templateId: 'custom-repeated-main-lifts',
      input: createDefaultCustomProgramBuilderInput({ methodology: 'simple_linear', daysPerWeek: 5 }),
    })
    expect(generated.definition.sessions).toHaveLength(5)
    expect(generated.definition.requiredState).toEqual([
      expect.objectContaining({ key: 'squat_working_load', movementId: 'squat', type: 'working_load' }),
      expect.objectContaining({ key: 'bench_press_working_load', movementId: 'bench_press', type: 'working_load' }),
      expect.objectContaining({ key: 'deadlift_working_load', movementId: 'deadlift', type: 'working_load' }),
      expect.objectContaining({ key: 'overhead_press_working_load', movementId: 'overhead_press', type: 'working_load' }),
    ])
  })

  it('keeps custom accessories history-only without target RIR prescriptions', () => {
    const input = createDefaultCustomProgramBuilderInput({ methodology: 'training_max_wave', daysPerWeek: 5 })
    input.sessions[0]!.accessories[0] = {
      ...input.sessions[0]!.accessories[0]!,
      targetRir: 4,
      progressionMethod: 'double_progression',
    }

    const { definition } = buildCustomProgramTemplateDefinition({
      templateId: 'custom-history-only-accessories',
      input,
    })
    const accessoryPrescriptions = Object.entries(definition.weeks[0]!.prescriptions)
      .filter(([id]) => id.includes('accessory'))
      .map(([, prescription]) => prescription)

    expect(definition.progressionRules).not.toHaveProperty('accessory')
    expect(accessoryPrescriptions.length).toBeGreaterThan(0)
    expect(accessoryPrescriptions.every((prescription) => !prescription.progressionRuleId)).toBe(true)
    expect(
      accessoryPrescriptions
        .flatMap((prescription) => prescription.sets)
        .every((set) => !('targetRir' in set)),
    ).toBe(true)
  })

  it('generates logger-only templates without required state, progression rules, or calculated loads', () => {
    const { definition, metadata } = build('none')
    expect(definition.requiredState).toEqual([])
    expect(metadata.progressionLabel).toBe('Logger only')

    const prescriptions = Object.values(definition.weeks[0]!.prescriptions)
    expect(prescriptions.every((prescription) => !prescription.progressionRuleId)).toBe(true)
    expect(
      prescriptions
        .flatMap((prescription) => prescription.sets)
        .every((set) => set.targetLoad?.kind === 'user_selected'),
    ).toBe(true)
  })

  it('rejects invalid movement ids before generating DSL', () => {
    const input = createDefaultCustomProgramBuilderInput()
    input.sessions[0]!.mainMovementId = 'not_a_movement'
    expect(() =>
      buildCustomProgramTemplateDefinition({
        templateId: 'custom-invalid',
        input,
      }),
    ).toThrow('Invalid main movement')
  })

  it('generates no progression decisions for logger-only sessions', () => {
    const { definition } = build('none')
    const program = programFor(definition)
    const decisions = buildProgressionDecisionsForSession(
      completeMainWork(firstSessionFor(definition)),
      program,
    )
    expect(decisions).toEqual([])
  })

  it('uses movement progression rule ids for custom training-max wave decisions', () => {
    const { definition } = build('training_max_wave')
    const program = programFor(definition)
    const decisions = buildProgressionDecisionsForSession(
      completeMainWork(firstSessionFor(definition)),
      program,
    )
    expect(decisions.map((decision) => decision.ruleId)).toContain('training_max_standard')
  })

  it('uses movement progression rule ids for custom plus-set wave decisions', () => {
    const { definition } = build('plus_set_wave')
    const program = programFor(definition)
    const decisions = buildProgressionDecisionsForSession(
      completeMainWork(firstSessionFor(definition)),
      program,
    )
    expect(decisions.map((decision) => decision.ruleId)).toContain('plus_set_wave')
  })

  it('keeps legacy progression rule ids compatible with pinned snapshots', () => {
    const trainingMax = build('training_max_wave').definition
    const legacyTrainingMax: TemplateDefinition = {
      ...trainingMax,
      weeks: trainingMax.weeks.map((week) => ({
        ...week,
        prescriptions: {
          ...week.prescriptions,
          main: {
            ...week.prescriptions.main!,
            progressionRuleId: 'healthy_531_tm_band',
          },
        },
      })),
    }
    const plusSet = build('plus_set_wave').definition
    const legacyPlusSet: TemplateDefinition = {
      ...plusSet,
      weeks: plusSet.weeks.map((week) => ({
        ...week,
        prescriptions: {
          ...week.prescriptions,
          main: {
            ...week.prescriptions.main!,
            progressionRuleId: 'bullmastiff_plus_set',
          },
        },
      })),
    }

    expect(
      buildProgressionDecisionsForSession(
        completeMainWork(firstSessionFor(legacyTrainingMax)),
        programFor(legacyTrainingMax),
      ).map((decision) => decision.ruleId),
    ).toContain('training_max_standard')
    expect(
      buildProgressionDecisionsForSession(
        completeMainWork(firstSessionFor(legacyPlusSet)),
        programFor(legacyPlusSet),
      ).map((decision) => decision.ruleId),
    ).toContain('plus_set_wave')
  })

  it('uses simple linear completion decisions for custom linear templates', () => {
    const { definition } = build('simple_linear')
    const program = programFor(definition)
    const decisions = buildProgressionDecisionsForSession(
      completeMainWork(firstSessionFor(definition)),
      program,
    )
    expect(decisions).toContainEqual(
      expect.objectContaining({
        ruleId: 'simple_linear_completion',
        previousValue: 100,
        recommendedValue: 105,
      }),
    )
  })
})
