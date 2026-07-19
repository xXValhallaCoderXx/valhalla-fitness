import { z } from 'zod'
import type { Movement, ProgramTemplateSummary } from '~/shared/types'
import {
  programStateKey,
  type TemplateDefinition,
  type TemplateSetDefinition,
} from '~/domains/program/lib/template-engine'
import { validateTemplateDefinition } from '~/domains/program/lib/template-engine-schema'
import { movementCatalog } from '~/domains/movement/lib/movements'
import {
  anchorMovementIdFor,
  customProgramMethodologies,
  customProgramMethodologyValues,
  customSessionTitle,
  MAX_ACCESSORIES_PER_DAY,
  MAX_LOGGER_EXERCISES_PER_DAY,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '~/domains/program/lib/custom-program-meta'

// Client-safe metadata/defaults live in `custom-program-meta.ts` (no zod, no template-engine)
// so the browser wizard never bundles the DSL generator below; re-exported here for server
// code and tests that treat this module as the custom-programme surface.
export {
  anchorMovementIdFor,
  createDefaultCustomProgramBuilderInput,
  customProgramMethodologies,
  MAX_ACCESSORIES_PER_DAY,
  MAX_LOGGER_EXERCISES_PER_DAY,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '~/domains/program/lib/custom-program-meta'

export const customProgramMethodologySchema = z.enum(customProgramMethodologyValues)

type PrescriptionDefinition = TemplateDefinition['weeks'][number]['prescriptions'][string]
type CustomPhase = {
  key: string
  label: string
  waveLabel?: string
  focus?: string
  summary: string
  hardness: TemplateDefinition['weeks'][number]['hardness']
}

const loggerExerciseSchema = z.object({
  movementId: z.string().min(1),
  setCount: z.coerce.number().int().min(1).max(10),
  repMin: z.coerce.number().int().min(1).max(50),
  repMax: z.coerce.number().int().min(1).max(50),
  targetRir: z.coerce.number().min(0).max(10).nullable().optional(),
}).superRefine((exercise, context) => {
  if (exercise.repMin > exercise.repMax) {
    context.addIssue({
      code: 'custom',
      path: ['repMax'],
      message: 'repMax must be greater than or equal to repMin',
    })
  }
})

const accessorySchema = z.object({
  movementId: z.string().min(1),
  setCount: z.coerce.number().int().min(1).max(8),
  repMin: z.coerce.number().int().min(1).max(50),
  repMax: z.coerce.number().int().min(1).max(50),
  targetRir: z.coerce.number().min(0).max(10).nullable().optional(),
  progressionMethod: z.enum(['history_only', 'double_progression']).default('history_only'),
}).superRefine((accessory, context) => {
  if (accessory.repMin > accessory.repMax) {
    context.addIssue({
      code: 'custom',
      path: ['repMax'],
      message: 'repMax must be greater than or equal to repMin',
    })
  }
})

const builderSessionSchema = z.object({
  title: z.string().trim().min(1).max(80),
  mainMovementId: z.string().min(1),
  variationMovementId: z.string().min(1).nullable().optional(),
  mainSetCount: z.coerce.number().int().min(1).max(10),
  mainTargetReps: z.coerce.number().int().min(1).max(30),
  mainTargetRir: z.coerce.number().min(0).max(10).nullable().optional(),
  accessories: z.array(accessorySchema).max(MAX_ACCESSORIES_PER_DAY),
  loggerExercises: z.array(loggerExerciseSchema).max(MAX_LOGGER_EXERCISES_PER_DAY).default([]),
})

export const customProgramBuilderInputSchema = z.object({
  name: z.string().trim().min(3).max(80),
  goal: z.string().trim().max(220).optional().nullable(),
  methodology: customProgramMethodologySchema,
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  sessions: z.array(builderSessionSchema).min(1).max(7),
})

export type NormalizedCustomProgramBuilderInput = z.infer<typeof customProgramBuilderInputSchema>

// Compile-time lockstep guard: the hand-written, zod-free `CustomProgramBuilderInput` in
// custom-program-meta.ts must stay assignment-compatible in both directions with the schema's
// inferred output type. If either side drifts, one of the tuple slots becomes `never` and
// this assignment stops compiling.
const _builderInputLockstep: [
  NormalizedCustomProgramBuilderInput extends CustomProgramBuilderInput ? true : never,
  CustomProgramBuilderInput extends NormalizedCustomProgramBuilderInput ? true : never,
] = [true, true]
void _builderInputLockstep

export type GeneratedCustomProgramTemplate = {
  metadata: Pick<
    ProgramTemplateSummary,
    | 'id'
    | 'name'
    | 'source'
    | 'sourceLabel'
    | 'origin'
    | 'description'
    | 'daysPerWeek'
    | 'progressionLabel'
    | 'complexity'
    | 'tags'
    | 'requiredState'
    | 'available'
  >
  definition: TemplateDefinition
}

export function normalizeCustomProgramBuilderInput(
  input: unknown,
  catalog: Record<string, Movement> = movementCatalog,
): NormalizedCustomProgramBuilderInput {
  const parsed = customProgramBuilderInputSchema.parse(input)
  if (parsed.sessions.length !== parsed.daysPerWeek) {
    throw new Error('Session count must match days per week.')
  }

  for (const session of parsed.sessions) {
    if (parsed.methodology === 'none') {
      if (!session.loggerExercises.length) {
        throw new Error('Logger-only days need at least one exercise.')
      }
      for (const exercise of session.loggerExercises) {
        assertMovementExists(catalog, exercise.movementId, 'logger exercise')
      }
      continue
    }

    const mainMovement = assertMovementExists(catalog, session.mainMovementId, 'main movement')
    if (!mainMovement.isCompetition) throw new Error('Main slots must use a main lift from the catalog.')

    if (parsed.methodology === 'plus_set_wave' && session.variationMovementId) {
      assertMovementExists(catalog, session.variationMovementId, 'variation movement')
    }
    for (const accessory of session.accessories) {
      const movement = assertMovementExists(catalog, accessory.movementId, 'accessory movement')
      if (movement.isCompetition) {
        throw new Error('Accessory slots must use accessory or variation movements.')
      }
    }
  }

  return {
    ...parsed,
    sessions: parsed.sessions.map((session, index) => ({
      ...session,
      title: parsed.methodology === 'none'
        ? session.title.trim() || `Day ${index + 1}`
        : customSessionTitle(index, session.mainMovementId, catalog),
      variationMovementId: parsed.methodology === 'plus_set_wave' ? session.variationMovementId || null : null,
      mainSetCount: parsed.methodology === 'simple_linear' ? 3 : session.mainSetCount,
      mainTargetReps: parsed.methodology === 'simple_linear' ? 5 : session.mainTargetReps,
      mainTargetRir: session.mainTargetRir ?? defaultMainTargetRir(parsed.methodology),
      accessories: parsed.methodology === 'none'
        ? []
        : session.accessories.map((accessory) => ({
            ...accessory,
            targetRir: null,
            progressionMethod: 'history_only',
          })),
      loggerExercises: parsed.methodology === 'none'
        ? session.loggerExercises.map((exercise) => ({
            ...exercise,
            targetRir: exercise.targetRir ?? null,
          }))
        : [],
    })),
  }
}

export function buildCustomProgramTemplateDefinition({
  input,
  templateId,
  catalog = movementCatalog,
}: {
  input: unknown
  templateId: string
  catalog?: Record<string, Movement>
}): GeneratedCustomProgramTemplate {
  const normalized = normalizeCustomProgramBuilderInput(input, catalog)
  const methodology = customProgramMethodologies[normalized.methodology]
  const requiredState =
    normalized.methodology === 'none'
      ? []
      : unique(normalized.sessions.map((session) => anchorMovementIdFor(session.mainMovementId, catalog))).map((movementId) => ({
          key: programStateKey(
            movementId,
            normalized.methodology === 'simple_linear' ? 'working_load' : 'training_max',
          ),
          movementId,
          type: normalized.methodology === 'simple_linear' ? 'working_load' as const : 'training_max' as const,
        }))
  const durationWeeks = normalized.methodology === 'training_max_wave' ? 4 : normalized.methodology === 'plus_set_wave' ? 18 : 1
  const sessions = normalized.sessions.map((session, index): TemplateDefinition['sessions'][number] => {
    const sessionKey = `day-${index + 1}`
    if (normalized.methodology === 'none') {
      const slots: TemplateDefinition['sessions'][number]['slots'] = session.loggerExercises.map((exercise, exerciseIndex) => ({
        id: `exercise-${exerciseIndex + 1}`,
        role: loggerExerciseRole(exercise.movementId, catalog),
        movementId: exercise.movementId,
        prescriptionId: `${sessionKey}-exercise-${exerciseIndex + 1}`,
      }))
      return {
        id: sessionKey,
        title: session.title,
        estimatedMinutes: 25 + slots.length * 8,
        slots,
      }
    }

    const anchorMovementId = anchorMovementIdFor(session.mainMovementId, catalog)
    const slots: TemplateDefinition['sessions'][number]['slots'] = [
      {
        id: 'main',
        role: 'main',
        movementId: session.mainMovementId,
        prescriptionId: `${sessionKey}-main`,
        anchorMovementId,
      },
    ]

    if (session.variationMovementId) {
      slots.push({
        id: 'variation',
        role: 'variation',
        movementId: session.variationMovementId,
        prescriptionId: `${sessionKey}-variation`,
        anchorMovementId,
      })
    }

    session.accessories.forEach((accessory, accessoryIndex) => {
      slots.push({
        id: `accessory-${accessoryIndex + 1}`,
        role: 'accessory',
        movementId: accessory.movementId,
        prescriptionId: `${sessionKey}-accessory-${accessoryIndex + 1}`,
      })
    })

    return {
      id: sessionKey,
      title: session.title,
      estimatedMinutes: 45 + slots.length * 8,
      slots,
    }
  })

  const definition: TemplateDefinition = {
    schemaVersion: '2026.06.dsl',
    id: templateId,
    name: normalized.name,
    durationWeeks,
    daysPerWeek: normalized.daysPerWeek,
    requiredState,
    timelineDescription: timelineDescription(normalized.methodology, normalized.daysPerWeek),
    sessions,
    weeks: buildCustomWeeks(normalized, durationWeeks),
    progressionRules: progressionRulesFor(normalized.methodology),
  }

  const validation = validateTemplateDefinition(definition)
  if (!validation.ok) {
    throw new Error(`Generated template definition is invalid: ${validation.message}`)
  }

  const description = normalized.goal?.trim() || methodology.description
  return {
    metadata: {
      id: templateId,
      name: normalized.name,
      source: 'custom_program',
      sourceLabel: 'Custom',
      origin: 'user_created',
      description,
      daysPerWeek: normalized.daysPerWeek,
      progressionLabel: methodology.progressionLabel,
      complexity: methodology.complexity,
      tags: ['custom', methodology.tag, `${normalized.daysPerWeek} days`],
      requiredState,
      available: true,
    },
    definition: validation.definition,
  }
}

function buildCustomWeeks(
  input: NormalizedCustomProgramBuilderInput,
  durationWeeks: number,
): TemplateDefinition['weeks'] {
  return Array.from({ length: durationWeeks }, (_, weekIndex) => {
    const phase = phaseFor(input.methodology, weekIndex)
    return {
      label: `Week ${weekIndex + 1}`,
      phaseKey: phase.key,
      phaseLabel: phase.label,
      waveLabel: phase.waveLabel,
      focus: phase.focus,
      summary: phase.summary,
      hardness: phase.hardness,
      prescriptions: buildPrescriptionsForWeek(input, weekIndex),
    }
  })
}

function buildPrescriptionsForWeek(
  input: NormalizedCustomProgramBuilderInput,
  weekIndex: number,
): TemplateDefinition['weeks'][number]['prescriptions'] {
  const prescriptions: TemplateDefinition['weeks'][number]['prescriptions'] = {}
  input.sessions.forEach((session, sessionIndex) => {
    const sessionKey = `day-${sessionIndex + 1}`
    if (input.methodology === 'none') {
      session.loggerExercises.forEach((exercise, exerciseIndex) => {
        prescriptions[`${sessionKey}-exercise-${exerciseIndex + 1}`] = loggerExercisePrescription(exercise)
      })
      return
    }

    prescriptions[`${sessionKey}-main`] = mainPrescription(input.methodology, session, weekIndex)
    if (session.variationMovementId) {
      prescriptions[`${sessionKey}-variation`] = variationPrescription(input.methodology, session, weekIndex)
    }
    session.accessories.forEach((accessory, accessoryIndex) => {
      prescriptions[`${sessionKey}-accessory-${accessoryIndex + 1}`] = accessoryPrescription(
        input.methodology,
        accessory,
      )
    })
  })
  return prescriptions
}

function mainPrescription(
  methodology: CustomProgramMethodology,
  session: NormalizedCustomProgramBuilderInput['sessions'][number],
  weekIndex: number,
): PrescriptionDefinition {
  if (methodology === 'training_max_wave') return mainTrainingMaxWavePrescription(weekIndex)
  if (methodology === 'plus_set_wave') return plusSetWaveMainPrescription(weekIndex)
  if (methodology === 'simple_linear') {
    return {
      targetSummary: `${session.mainSetCount}x${session.mainTargetReps} @ current load`,
      progressionRuleId: 'simple_linear_completion',
      sets: repeatedSets(session.mainSetCount, {
        targetLoad: workingLoad(),
        targetReps: session.mainTargetReps,
        targetRir: session.mainTargetRir,
        label: `${session.mainTargetReps}`,
      }),
    }
  }

  return {
    targetSummary: `${session.mainSetCount}x${session.mainTargetReps} · choose load`,
    sets: repeatedSets(session.mainSetCount, {
      targetLoad: userSelected(),
      targetReps: session.mainTargetReps,
      targetRir: session.mainTargetRir,
      label: `${session.mainTargetReps}`,
    }),
  }
}

function variationPrescription(
  methodology: CustomProgramMethodology,
  session: NormalizedCustomProgramBuilderInput['sessions'][number],
  weekIndex: number,
): PrescriptionDefinition {
  if (methodology === 'plus_set_wave') {
    const isPeak = weekIndex >= 9
    const waveIndex = Math.floor((weekIndex % 9) / 3)
    const weekInWave = weekIndex % 3
    const variationPercent = isPeak ? [0.75, 0.8, 0.85][waveIndex] : [0.6, 0.65, 0.7][waveIndex]
    const variationSetCount = isPeak ? [4, 3, 2][weekInWave] : [3, 4, 5][weekInWave]
    const variationReps = isPeak ? [6, 5, 4][waveIndex] : [12, 10, 8][waveIndex]
    return {
      targetSummary: `${variationSetCount}x${variationReps} @ ${Math.round(variationPercent * 100)}%`,
      sets: repeatedSets(variationSetCount, {
        targetLoad: percent(variationPercent),
        targetReps: variationReps,
        targetRir: isPeak ? 3 : 5,
        label: `${variationReps}`,
      }),
    }
  }

  return {
    targetSummary: `3x${Math.max(session.mainTargetReps + 2, 6)} · choose load`,
    sets: repeatedSets(3, {
      targetLoad: userSelected(),
      targetReps: Math.max(session.mainTargetReps + 2, 6),
      targetRir: 2,
      label: `${Math.max(session.mainTargetReps + 2, 6)}`,
    }),
  }
}

function accessoryPrescription(
  _methodology: CustomProgramMethodology,
  accessory: NormalizedCustomProgramBuilderInput['sessions'][number]['accessories'][number],
): PrescriptionDefinition {
  return {
    targetSummary: `${accessory.setCount}x${accessory.repMin}-${accessory.repMax} · choose load`,
    sets: repeatedSets(accessory.setCount, {
      targetLoad: userSelected(),
      targetRepMin: accessory.repMin,
      targetRepMax: accessory.repMax,
      label: `${accessory.repMin}-${accessory.repMax}`,
    }),
  }
}

function loggerExercisePrescription(
  exercise: NormalizedCustomProgramBuilderInput['sessions'][number]['loggerExercises'][number],
): PrescriptionDefinition {
  const repText = exercise.repMin === exercise.repMax ? `${exercise.repMin}` : `${exercise.repMin}-${exercise.repMax}`
  const rirText = typeof exercise.targetRir === 'number' ? ` @ RIR ${exercise.targetRir}` : ''
  return {
    targetSummary: `${exercise.setCount}x${repText}${rirText} · choose load`,
    sets: repeatedSets(exercise.setCount, {
      targetLoad: userSelected(),
      targetRepMin: exercise.repMin,
      targetRepMax: exercise.repMax,
      targetRir: exercise.targetRir,
      label: repText,
    }),
  }
}

function mainTrainingMaxWavePrescription(weekIndex: number): PrescriptionDefinition {
  const weeks = [
    {
      summary: '65%x5 · 75%x5 · 85%x5+ · back-off 5x5',
      sets: [
        { targetLoad: percent(0.65), targetReps: 5, label: '5' },
        { targetLoad: percent(0.75), targetReps: 5, label: '5' },
        { targetLoad: percent(0.85), targetReps: 5, targetRir: 2, isTopSet: true, isAmrap: true, label: '5+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'Back-off' }),
      ],
    },
    {
      summary: '70%x3 · 80%x3 · 90%x3+ · back-off 5x5',
      sets: [
        { targetLoad: percent(0.7), targetReps: 3, label: '3' },
        { targetLoad: percent(0.8), targetReps: 3, label: '3' },
        { targetLoad: percent(0.9), targetReps: 3, targetRir: 2, isTopSet: true, isAmrap: true, label: '3+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'Back-off' }),
      ],
    },
    {
      summary: '75%x5 · 85%x3 · 95%x1+ · back-off 5x5',
      sets: [
        { targetLoad: percent(0.75), targetReps: 5, label: '5' },
        { targetLoad: percent(0.85), targetReps: 3, label: '3' },
        { targetLoad: percent(0.95), targetReps: 1, targetRir: 2, isTopSet: true, isAmrap: true, label: '1+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'Back-off' }),
      ],
    },
    {
      summary: '40%x5 · 50%x5 · 60%x5',
      sets: [
        { targetLoad: percent(0.4), targetReps: 5, label: '5' },
        { targetLoad: percent(0.5), targetReps: 5, label: '5' },
        { targetLoad: percent(0.6), targetReps: 5, label: '5' },
      ],
    },
  ]
  const week = weeks[weekIndex % weeks.length]
  return {
    targetSummary: week.summary,
    progressionRuleId: 'training_max_band',
    sets: week.sets,
  }
}

function plusSetWaveMainPrescription(weekIndex: number): PrescriptionDefinition {
  const isPeak = weekIndex >= 9
  const phaseWeekIndex = weekIndex % 9
  const waveIndex = Math.floor(phaseWeekIndex / 3)
  const weekInWave = phaseWeekIndex % 3
  const mainReps = isPeak ? [3, 2, 1][waveIndex] : [6, 5, 4][waveIndex]
  const mainPercent = isPeak ? [0.85, 0.88, 0.92][waveIndex] : [0.7, 0.75, 0.8][waveIndex]
  const mainSetCount = isPeak ? [5, 3, 1][weekInWave] : 4
  const percentLabel = Math.round(mainPercent * 100)
  return {
    targetSummary: `${mainSetCount}x${mainReps}+ @ ${percentLabel}%`,
    progressionRuleId: 'plus_set_wave',
    sets: repeatedSets(
      mainSetCount,
      {
        targetLoad: percent(mainPercent),
        targetReps: mainReps,
        targetRir: 2,
        label: `${mainReps}`,
      },
      true,
    ).map((set, index, sets) => ({
      ...set,
      targetRir: index === sets.length - 1 ? 0 : 2,
    })),
  }
}

function phaseFor(methodology: CustomProgramMethodology, weekIndex: number): CustomPhase {
  if (methodology === 'training_max_wave') {
    const phaseLabels = ['5s week', '3s week', 'Peak week', 'Deload']
    return {
      key: 'cycle',
      label: phaseLabels[weekIndex % 4] ?? 'Cycle',
      summary: 'Training-max percentage work with back-off work.',
      hardness: weekIndex % 4 === 3 ? 'Deload' as const : weekIndex % 4 === 2 ? 'Hard' as const : 'Medium' as const,
    }
  }
  if (methodology === 'plus_set_wave') {
    const isPeak = weekIndex >= 9
    const phaseWeekIndex = weekIndex % 9
    const waveIndex = Math.floor(phaseWeekIndex / 3)
    const weekInWave = phaseWeekIndex % 3
    return {
      key: isPeak ? 'peak' : 'base',
      label: isPeak ? 'Peak phase' : 'Base phase',
      waveLabel: `Wave ${waveIndex + 1}`,
      summary: isPeak
        ? 'Peak work keeps the plus-set main lift and tapers variation volume.'
        : 'Base work builds volume through plus-set main lifts and higher-rep variation work.',
      hardness: weekInWave === 2 ? 'Hard' as const : weekInWave === 1 ? 'Medium' as const : 'Light' as const,
    }
  }
  if (methodology === 'simple_linear') {
    return {
      key: 'linear',
      label: 'Linear progression',
      summary: 'Repeat the planned sessions and increase working loads after completed target work.',
      hardness: 'Medium' as const,
    }
  }
  return {
    key: 'logger',
    label: 'Logger only',
    summary: 'Repeat the planned sessions and log performance for history.',
    hardness: 'Medium' as const,
  }
}

function progressionRulesFor(methodology: CustomProgramMethodology): TemplateDefinition['progressionRules'] {
  if (methodology === 'none') return undefined
  if (methodology === 'training_max_wave') {
    return {
      main: 'training_max_band',
    }
  }
  if (methodology === 'plus_set_wave') {
    return {
      main: 'plus_set_wave',
    }
  }
  return {
    main: 'simple_linear_completion',
  }
}

function timelineDescription(methodology: CustomProgramMethodology, daysPerWeek: number) {
  const label = customProgramMethodologies[methodology].shortLabel
  return `${daysPerWeek}-day custom ${label.toLowerCase()} programme generated from the guided builder.`
}

function percent(percentValue: number, percentMax?: number) {
  return { kind: 'percent_of_state' as const, stateType: 'training_max' as const, percent: percentValue, percentMax, default: 'low' as const }
}

function workingLoad() {
  return { kind: 'state' as const, stateType: 'working_load' as const }
}

function userSelected() {
  return { kind: 'user_selected' as const }
}

function repeatedSets(
  count: number,
  base: Omit<TemplateSetDefinition, 'label'> & { label?: string },
  topSet = false,
) {
  return Array.from({ length: count }, (_, index): TemplateSetDefinition => ({
    ...base,
    isTopSet: topSet && index === count - 1,
    isAmrap: Boolean(base.isAmrap || (topSet && index === count - 1)),
    label: topSet && index === count - 1 && base.targetReps ? `${base.targetReps}+` : base.label,
  }))
}

function loggerExerciseRole(movementId: string, catalog: Record<string, Movement>) {
  return catalog[movementId]?.isCompetition ? 'main' as const : 'accessory' as const
}

function assertMovementExists(catalog: Record<string, Movement>, movementId: string, label: string) {
  const movement = catalog[movementId]
  if (!movement) throw new Error(`Invalid ${label}.`)
  return movement
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function defaultMainTargetRir(methodology: CustomProgramMethodology) {
  return methodology === 'none' ? 2 : 1
}
