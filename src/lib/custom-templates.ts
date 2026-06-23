import { z } from 'zod'
import type { Movement, ProgramTemplateSummary } from '~/types/training'
import {
  validateTemplateDefinition,
  type TemplateDefinition,
  type TemplateSetDefinition,
} from './template-engine'
import { movementCatalog } from './movements'

export const customProgramMethodologySchema = z.enum(['none', '531', 'bromley', 'simple_linear'])

export type CustomProgramMethodology = z.infer<typeof customProgramMethodologySchema>

export type CustomProgramBuilderInput = z.infer<typeof customProgramBuilderInputSchema>

type PrescriptionDefinition = TemplateDefinition['weeks'][number]['prescriptions'][string]
type CustomPhase = {
  key: string
  label: string
  waveLabel?: string
  focus?: string
  summary: string
  hardness: TemplateDefinition['weeks'][number]['hardness']
}

export const customProgramMethodologies: Record<
  CustomProgramMethodology,
  {
    label: string
    shortLabel: string
    description: string
    tooltip: string
    progressionLabel: string
    complexity: string
    tag: string
  }
> = {
  none: {
    label: 'None (logger only)',
    shortLabel: 'Logger only',
    description: 'Structured sessions repeat as written and loads are chosen while training.',
    tooltip: 'No automatic recommendations are created; workouts are logged for history only.',
    progressionLabel: 'Logger only',
    complexity: 'Custom',
    tag: 'logger',
  },
  '531': {
    label: '5/3/1-style',
    shortLabel: '5/3/1',
    description: 'Training-max anchors drive percentage main work and 5/3/1 TM recommendations.',
    tooltip: 'Regulates only main-lift training-max changes through the healthy 5/3/1 TM band rule.',
    progressionLabel: '5/3/1 TM band',
    complexity: 'Intermediate',
    tag: '5/3/1',
  },
  bromley: {
    label: 'Bromley base/peak',
    shortLabel: 'Bromley',
    description: 'Base-to-peak waves use anchored percentages and plus-set regulation for main lifts.',
    tooltip: 'Regulates main-lift plus sets with bullmastiff_plus_set; variation and phase structure are planned only in v1.',
    progressionLabel: 'Bromley plus set',
    complexity: 'Advanced',
    tag: 'bromley',
  },
  simple_linear: {
    label: 'Simple linear progression',
    shortLabel: 'Linear',
    description: 'Repeat fixed sets and reps, then recommend conservative load increases after completed work.',
    tooltip: 'Regulates main lifts only when all target work is completed at or above target reps and RIR.',
    progressionLabel: 'Linear completion',
    complexity: 'Beginner',
    tag: 'linear',
  },
}

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
  accessories: z.array(accessorySchema).max(6),
})

export const customProgramBuilderInputSchema = z.object({
  name: z.string().trim().min(3).max(80),
  goal: z.string().trim().max(220).optional().nullable(),
  methodology: customProgramMethodologySchema,
  daysPerWeek: z.coerce.number().int().min(3).max(4),
  sessions: z.array(builderSessionSchema).min(3).max(4),
})

export type NormalizedCustomProgramBuilderInput = z.infer<typeof customProgramBuilderInputSchema>

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
    | 'requiredAnchors'
    | 'available'
  >
  definition: TemplateDefinition
}

export function createDefaultCustomProgramBuilderInput({
  methodology = 'none',
  daysPerWeek = 3,
}: {
  methodology?: CustomProgramMethodology
  daysPerWeek?: 3 | 4
} = {}): CustomProgramBuilderInput {
  const dayDefaults = [
    {
      title: 'Squat Day',
      mainMovementId: 'squat',
      variationMovementId: methodology === 'bromley' ? 'front_squat' : null,
      accessoryMovementId: 'leg_press',
    },
    {
      title: 'Bench Day',
      mainMovementId: 'bench_press',
      variationMovementId: methodology === 'bromley' ? 'close_grip_bench_press' : null,
      accessoryMovementId: 'chest_supported_row',
    },
    {
      title: 'Deadlift Day',
      mainMovementId: 'deadlift',
      variationMovementId: methodology === 'bromley' ? 'romanian_deadlift' : null,
      accessoryMovementId: 'hamstring_curl',
    },
    {
      title: 'Press Day',
      mainMovementId: 'overhead_press',
      variationMovementId: methodology === 'bromley' ? 'push_press' : null,
      accessoryMovementId: 'face_pull',
    },
  ].slice(0, daysPerWeek)

  return {
    name: 'Custom programme',
    goal: '',
    methodology,
    daysPerWeek,
    sessions: dayDefaults.map((day) => ({
      title: day.title,
      mainMovementId: day.mainMovementId,
      variationMovementId: day.variationMovementId,
      mainSetCount: methodology === 'simple_linear' ? 3 : 4,
      mainTargetReps: methodology === 'simple_linear' ? 5 : 8,
      mainTargetRir: methodology === 'none' ? 2 : 1,
      accessories: [
        {
          movementId: day.accessoryMovementId,
          setCount: 3,
          repMin: 10,
          repMax: 15,
          targetRir: 2,
          progressionMethod: methodology === 'none' ? 'history_only' : 'double_progression',
        },
      ],
    })),
  }
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
    const mainMovement = assertMovementExists(catalog, session.mainMovementId, 'main movement')
    if (!mainMovement.isCompetition) {
      throw new Error('Main slots must use a main lift from the catalog.')
    }
    if (session.variationMovementId) {
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
    sessions: parsed.sessions.map((session) => ({
      ...session,
      variationMovementId: session.variationMovementId || null,
      mainTargetRir: session.mainTargetRir ?? null,
      accessories: session.accessories.map((accessory) => ({
        ...accessory,
        targetRir: accessory.targetRir ?? null,
        progressionMethod: parsed.methodology === 'none' ? 'history_only' : accessory.progressionMethod,
      })),
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
  const requiredAnchors =
    normalized.methodology === 'none'
      ? []
      : unique(normalized.sessions.map((session) => anchorMovementIdFor(session.mainMovementId, catalog)))
  const durationWeeks = normalized.methodology === '531' ? 4 : normalized.methodology === 'bromley' ? 18 : 1
  const sessions = normalized.sessions.map((session, index): TemplateDefinition['sessions'][number] => {
    const sessionKey = `day-${index + 1}`
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
    anchorType: normalized.methodology === 'none' ? 'manual' : 'training_max',
    durationWeeks,
    daysPerWeek: normalized.daysPerWeek,
    requiredAnchors,
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
      source: 'custom_import',
      sourceLabel: 'Custom',
      origin: 'user_created',
      description,
      daysPerWeek: normalized.daysPerWeek,
      progressionLabel: methodology.progressionLabel,
      complexity: methodology.complexity,
      tags: ['custom', methodology.tag, `${normalized.daysPerWeek} days`],
      requiredAnchors,
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
  if (methodology === '531') return main531Prescription(weekIndex)
  if (methodology === 'bromley') return bromleyMainPrescription(weekIndex)
  if (methodology === 'simple_linear') {
    return {
      targetSummary: `${session.mainSetCount}x${session.mainTargetReps} @ current load`,
      progressionRuleId: 'simple_linear_completion',
      sets: repeatedSets(session.mainSetCount, {
        targetLoad: percent(1),
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
  if (methodology === 'bromley') {
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
  methodology: CustomProgramMethodology,
  accessory: NormalizedCustomProgramBuilderInput['sessions'][number]['accessories'][number],
): PrescriptionDefinition {
  const progressionRuleId =
    methodology !== 'none' && accessory.progressionMethod === 'double_progression'
      ? 'accessory_double_progression'
      : undefined
  return {
    targetSummary: `${accessory.setCount}x${accessory.repMin}-${accessory.repMax} · choose load`,
    progressionRuleId,
    sets: repeatedSets(accessory.setCount, {
      targetLoad: userSelected(),
      targetRepMin: accessory.repMin,
      targetRepMax: accessory.repMax,
      targetRir: accessory.targetRir,
      label: `${accessory.repMin}-${accessory.repMax}`,
    }),
  }
}

function main531Prescription(weekIndex: number): PrescriptionDefinition {
  const weeks = [
    {
      summary: '65%x5 · 75%x5 · 85%x5+ · FSL 5x5',
      sets: [
        { targetLoad: percent(0.65), targetReps: 5, label: '5' },
        { targetLoad: percent(0.75), targetReps: 5, label: '5' },
        { targetLoad: percent(0.85), targetReps: 5, targetRir: 2, isTopSet: true, isAmrap: true, label: '5+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'FSL' }),
      ],
    },
    {
      summary: '70%x3 · 80%x3 · 90%x3+ · FSL 5x5',
      sets: [
        { targetLoad: percent(0.7), targetReps: 3, label: '3' },
        { targetLoad: percent(0.8), targetReps: 3, label: '3' },
        { targetLoad: percent(0.9), targetReps: 3, targetRir: 2, isTopSet: true, isAmrap: true, label: '3+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'FSL' }),
      ],
    },
    {
      summary: '75%x5 · 85%x3 · 95%x1+ · FSL 5x5',
      sets: [
        { targetLoad: percent(0.75), targetReps: 5, label: '5' },
        { targetLoad: percent(0.85), targetReps: 3, label: '3' },
        { targetLoad: percent(0.95), targetReps: 1, targetRir: 2, isTopSet: true, isAmrap: true, label: '1+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'FSL' }),
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
    progressionRuleId: 'healthy_531_tm_band',
    sets: week.sets,
  }
}

function bromleyMainPrescription(weekIndex: number): PrescriptionDefinition {
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
    progressionRuleId: 'bullmastiff_plus_set',
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
  if (methodology === '531') {
    const phaseLabels = ['5s week', '3s week', '5/3/1 week', 'Deload']
    return {
      key: 'cycle',
      label: phaseLabels[weekIndex % 4] ?? 'Cycle',
      summary: '5/3/1-style percentage work with first-set-last backoff work.',
      hardness: weekIndex % 4 === 3 ? 'Deload' as const : weekIndex % 4 === 2 ? 'Hard' as const : 'Medium' as const,
    }
  }
  if (methodology === 'bromley') {
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
      summary: 'Repeat the planned sessions and increase anchors after completed target work.',
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
  if (methodology === '531') {
    return {
      main: 'healthy_531_tm_band',
      accessory: 'accessory_double_progression',
    }
  }
  if (methodology === 'bromley') {
    return {
      main: 'bullmastiff_plus_set',
      accessory: 'accessory_double_progression',
    }
  }
  return {
    main: 'simple_linear_completion',
    accessory: 'accessory_double_progression',
  }
}

function timelineDescription(methodology: CustomProgramMethodology, daysPerWeek: number) {
  const label = customProgramMethodologies[methodology].shortLabel
  return `${daysPerWeek}-day custom ${label.toLowerCase()} programme generated from the guided builder.`
}

function percent(percentValue: number, percentMax?: number) {
  return { kind: 'percent' as const, anchor: 'training_max' as const, percent: percentValue, percentMax, default: 'low' as const }
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

function anchorMovementIdFor(movementId: string, catalog: Record<string, Movement>) {
  const movement = catalog[movementId]
  return movement?.variationOf ?? movementId
}

function assertMovementExists(catalog: Record<string, Movement>, movementId: string, label: string) {
  const movement = catalog[movementId]
  if (!movement) throw new Error(`Invalid ${label}.`)
  return movement
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}
