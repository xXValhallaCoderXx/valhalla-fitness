import { z } from 'zod'
import type {
  AnchorInput,
  MovementRole,
  MovementSlot,
  PlannedSession,
  ProgramInstance,
  ProgramMovementOverride,
  SetLog,
  Unit,
} from '~/types/training'
import { getMovementName } from './movements'
import { mround } from './progression'

const hardnessSchema = z.enum(['Light', 'Medium', 'Hard', 'Deload'])

const loadSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('percent'),
    anchor: z.literal('training_max').default('training_max'),
    percent: z.number().positive(),
    percentMax: z.number().positive().optional(),
    default: z.enum(['low', 'high', 'blank']).default('low'),
  }),
  z.object({
    kind: z.literal('fixed'),
    kg: z.number().nonnegative(),
    lb: z.number().nonnegative().optional(),
  }),
  z.object({
    kind: z.literal('user_selected'),
  }),
])

const setSchema = z.object({
  targetLoad: loadSchema.optional(),
  targetReps: z.number().int().positive().optional(),
  targetRepMin: z.number().int().positive().optional(),
  targetRepMax: z.number().int().positive().optional(),
  targetRir: z.number().nonnegative().optional().nullable(),
  targetRpe: z.number().positive().optional().nullable(),
  isTopSet: z.boolean().optional(),
  isAmrap: z.boolean().optional(),
  isBackoff: z.boolean().optional(),
  label: z.string().optional(),
})

const prescriptionSchema = z.object({
  targetSummary: z.string(),
  progressionRuleId: z.string().optional(),
  sets: z.array(setSchema).min(1),
})

const movementByPhaseSchema = z.object({
  default: z.string(),
  byPhase: z.record(z.string(), z.string()).optional(),
})

const slotSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['main', 'variation', 'accessory', 'warmup', 'event']),
  movementId: z.union([z.string(), movementByPhaseSchema]),
  prescriptionId: z.string().min(1),
  anchorMovementId: z.string().optional(),
  targetSummary: z.string().optional(),
})

const sessionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  slots: z.array(slotSchema).min(1),
})

const weekSchema = z.object({
  label: z.string().min(1),
  phaseKey: z.string().min(1),
  phaseLabel: z.string().min(1),
  waveLabel: z.string().optional(),
  focus: z.string().optional(),
  summary: z.string().min(1),
  hardness: hardnessSchema,
  prescriptions: z.record(z.string(), prescriptionSchema),
})

export const templateDefinitionSchema = z.object({
  schemaVersion: z.literal('2026.06.dsl'),
  id: z.string().min(1),
  name: z.string().min(1),
  anchorType: z.enum(['training_max', 'one_rep_max', 'manual']).default('training_max'),
  durationWeeks: z.number().int().positive(),
  daysPerWeek: z.number().int().positive(),
  requiredAnchors: z.array(z.string().min(1)).min(1),
  timelineDescription: z.string().min(1),
  sessions: z.array(sessionSchema).min(1),
  weeks: z.array(weekSchema).min(1),
  progressionRules: z.record(z.string(), z.string()).optional(),
}).superRefine((definition, context) => {
  if (definition.sessions.length !== definition.daysPerWeek) {
    context.addIssue({
      code: 'custom',
      path: ['sessions'],
      message: 'sessions length must match daysPerWeek',
    })
  }
  if (definition.weeks.length !== definition.durationWeeks) {
    context.addIssue({
      code: 'custom',
      path: ['weeks'],
      message: 'weeks length must match durationWeeks',
    })
  }
  for (const [sessionIndex, session] of definition.sessions.entries()) {
    for (const [slotIndex, slot] of session.slots.entries()) {
      for (const [weekIndex, week] of definition.weeks.entries()) {
        if (!week.prescriptions[slot.prescriptionId]) {
          context.addIssue({
            code: 'custom',
            path: ['weeks', weekIndex, 'prescriptions', slot.prescriptionId],
            message: `missing prescription for ${session.id}/${slot.id}`,
          })
        }
      }
      if (slot.role === 'main') {
        const movementId = typeof slot.movementId === 'string' ? slot.movementId : slot.movementId.default
        const anchorMovementId = slot.anchorMovementId ?? movementId
        if (!definition.requiredAnchors.includes(anchorMovementId)) {
          context.addIssue({
            code: 'custom',
            path: ['sessions', sessionIndex, 'slots', slotIndex, 'anchorMovementId'],
            message: `${anchorMovementId} must be listed in requiredAnchors`,
          })
        }
      }
    }
  }
})

export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>
export type TemplateSetDefinition = TemplateDefinition['weeks'][number]['prescriptions'][string]['sets'][number]
export type TemplateValidationResult =
  | { ok: true; definition: TemplateDefinition }
  | { ok: false; message: string }

export type TimelineSession = {
  label: string
  title: string
  mainMovement: string
  mainPrescription: string
  variationMovement: string
  variationPrescription: string
  accessoryPrescription: string
  progressionNote: string
  globalIndex: number
}

export type TimelineWeek = {
  index: number
  subtitle: string
  summary: string
  sessions: TimelineSession[]
}

export type ProgramTimelineModel = {
  totalWeeks: number
  daysPerWeek: number
  currentWeekIndex: number
  currentSessionInWeek: number
  description: string
  weeks: TimelineWeek[]
}

export function parseTemplateDefinition(input: unknown): TemplateDefinition {
  return templateDefinitionSchema.parse(input)
}

export function validateTemplateDefinition(input: unknown): TemplateValidationResult {
  const result = templateDefinitionSchema.safeParse(input)
  if (result.success) return { ok: true, definition: result.data }
  return { ok: false, message: z.prettifyError(result.error) }
}

export function validateRequiredAnchors(definition: TemplateDefinition, anchors: AnchorInput[]) {
  const values = new Map(anchors.map((anchor) => [anchor.movementId, anchor.value]))
  const missing = definition.requiredAnchors.filter((movementId) => {
    const value = values.get(movementId)
    return !Number.isFinite(value) || Number(value) <= 0
  })
  if (missing.length) {
    throw new Error(`Missing valid training max anchors for ${missing.map(getMovementName).join(', ')}`)
  }
}

export function expandSessionFromTemplateDefinition(
  program: ProgramInstance,
  definition: TemplateDefinition,
  scheduledDate: string,
  previousBySlotId: Record<string, MovementSlot['previous']> = {},
): PlannedSession {
  validateRequiredAnchors(definition, program.anchors)
  const sessionIndex = positiveModulo(program.currentWeekIndex, definition.daysPerWeek)
  const programmeWeekIndex = positiveModulo(
    Math.floor(program.currentWeekIndex / definition.daysPerWeek),
    definition.durationWeeks,
  )
  const session = definition.sessions[sessionIndex]
  const week = definition.weeks[programmeWeekIndex]
  if (!session || !week) throw new Error('Template definition cannot resolve the current session')

  const movements = session.slots.map((slot, index): MovementSlot => {
    const prescription = week.prescriptions[slot.prescriptionId]
    if (!prescription) throw new Error(`Missing ${slot.prescriptionId} prescription`)
    const plannedMovementId = resolveMovementId(slot.movementId, week.phaseKey)
    const slotId = `slot-${session.id}-${slot.id}`
    const movementId = applyMovementOverride(program.movementOverrides ?? [], {
      slotId,
      phaseKey: week.phaseKey,
      role: slot.role,
      movementId: plannedMovementId,
      currentWeekIndex: program.currentWeekIndex,
    })
    const anchorMovementId = slot.anchorMovementId ?? plannedMovementId

    return {
      id: slotId,
      slotId,
      phaseKey: week.phaseKey,
      movementId,
      movementName: getMovementName(movementId),
      role: slot.role,
      orderIndex: index + 1,
      targetSummary: slot.targetSummary ?? prescription.targetSummary,
      sets: prescription.sets.map((set, setIndex) =>
        expandSet(set, setIndex, {
          anchors: program.anchors,
          anchorMovementId,
          rounding: program.rounding,
          units: program.units,
        }),
      ),
      previous: previousBySlotId[slotId] ?? null,
    }
  })

  return {
    id: `${session.id}-w${programmeWeekIndex + 1}`,
    title: session.title,
    programTitle: program.title,
    templateId: program.templateId,
    weekIndex: program.currentWeekIndex,
    weekLabel: week.waveLabel
      ? `${week.phaseLabel.replace(/\s+phase$/i, '')} ${week.waveLabel} · ${week.label}`
      : week.label,
    hardness: week.hardness,
    scheduledDate,
    estimatedMinutes: session.estimatedMinutes,
    units: program.units,
    rounding: program.rounding,
    movements,
  }
}

export function programForNextUncompletedSessionFromDefinition(
  program: ProgramInstance,
  definition: TemplateDefinition,
  completedPlannedSessionIds: Iterable<string>,
  scheduledDate: string,
) {
  const completedIds = new Set(completedPlannedSessionIds)
  if (!completedIds.size) return program

  let nextProgram = program
  for (let attempts = 0; attempts < definition.daysPerWeek * definition.durationWeeks * 2; attempts += 1) {
    const plannedSession = expandSessionFromTemplateDefinition(nextProgram, definition, scheduledDate)
    if (!completedIds.has(plannedSession.id)) return nextProgram
    nextProgram = { ...nextProgram, currentWeekIndex: nextProgram.currentWeekIndex + 1 }
  }

  return nextProgram
}

export function buildProgramTimelineFromDefinition(
  program: Pick<ProgramInstance, 'currentWeekIndex'>,
  definition: TemplateDefinition,
): ProgramTimelineModel {
  const currentWeekIndex = Math.min(
    positiveModulo(Math.floor(program.currentWeekIndex / definition.daysPerWeek), definition.durationWeeks),
    definition.durationWeeks - 1,
  )
  const currentSessionInWeek = positiveModulo(program.currentWeekIndex, definition.daysPerWeek)

  return {
    totalWeeks: definition.durationWeeks,
    daysPerWeek: definition.daysPerWeek,
    currentWeekIndex,
    currentSessionInWeek,
    description: definition.timelineDescription,
    weeks: definition.weeks.map((week, weekIndex): TimelineWeek => ({
      index: weekIndex,
      subtitle: week.waveLabel ? `${week.phaseLabel} · ${week.waveLabel}, ${week.label.toLowerCase()}` : week.phaseLabel,
      summary: week.summary,
      sessions: definition.sessions.map((session, sessionIndex): TimelineSession => {
        const mainSlot = session.slots.find((slot) => slot.role === 'main')
        const variationSlot = session.slots.find((slot) => slot.role === 'variation')
        const accessorySlots = session.slots.filter((slot) => slot.role === 'accessory')
        const mainPrescription = mainSlot ? week.prescriptions[mainSlot.prescriptionId] : null
        const variationPrescription = variationSlot ? week.prescriptions[variationSlot.prescriptionId] : null
        return {
          label: `S${sessionIndex + 1}`,
          title: session.title,
          mainMovement: mainSlot ? getMovementName(resolveMovementId(mainSlot.movementId, week.phaseKey)) : 'None',
          mainPrescription: mainPrescription?.targetSummary ?? 'No main prescription',
          variationMovement: variationSlot
            ? getMovementName(resolveMovementId(variationSlot.movementId, week.phaseKey))
            : accessorySlots.length
              ? `${accessorySlots.length} accessories`
              : 'None',
          variationPrescription: variationPrescription?.targetSummary ?? 'No variation prescription',
          accessoryPrescription: accessorySlots.length
            ? `${accessorySlots.length} accessory ${accessorySlots.length === 1 ? 'slot' : 'slots'}`
            : 'No accessories',
          progressionNote: mainPrescription?.progressionRuleId
            ? `Main work uses ${mainPrescription.progressionRuleId.replaceAll('_', ' ')}.`
            : 'Log completed sets honestly; future recommendations use saved performance.',
          globalIndex: weekIndex * definition.daysPerWeek + sessionIndex,
        }
      }),
    })),
  }
}

function expandSet(
  set: TemplateSetDefinition,
  setIndex: number,
  context: {
    anchors: AnchorInput[]
    anchorMovementId: string
    rounding: number
    units: Unit
  },
): SetLog {
  const targetLoad = resolveTargetLoad(set.targetLoad, context)
  const label =
    set.label ??
    (set.targetReps
      ? `${set.targetReps}${set.isAmrap ? '+' : ''}`
      : set.targetRepMin && set.targetRepMax
        ? `${set.targetRepMin}-${set.targetRepMax}`
        : undefined)

  return {
    id: `set-${setIndex + 1}`,
    setIndex: setIndex + 1,
    targetLoad,
    targetReps: set.targetReps ?? null,
    targetRepMin: set.targetRepMin ?? null,
    targetRepMax: set.targetRepMax ?? null,
    targetRir: set.targetRir ?? null,
    targetRpe: set.targetRpe ?? null,
    isTopSet: Boolean(set.isTopSet),
    isAmrap: Boolean(set.isAmrap),
    isBackoff: Boolean(set.isBackoff),
    completed: false,
    actualLoad: targetLoad,
    actualReps: set.targetReps ?? set.targetRepMin ?? null,
    label,
  }
}

function resolveTargetLoad(
  load: TemplateSetDefinition['targetLoad'] | undefined,
  context: {
    anchors: AnchorInput[]
    anchorMovementId: string
    rounding: number
    units: Unit
  },
) {
  if (!load || load.kind === 'user_selected') return null
  if (load.kind === 'fixed') {
    return context.units === 'kg' ? load.kg : load.lb ?? mround(load.kg * 2.205, 5)
  }
  if (load.default === 'blank') return null
  const anchor = context.anchors.find((item) => item.movementId === context.anchorMovementId)?.value
  if (!Number.isFinite(anchor) || Number(anchor) <= 0) {
    throw new Error(`Missing valid training max anchor for ${getMovementName(context.anchorMovementId)}`)
  }
  const percent = load.default === 'high' && load.percentMax ? load.percentMax : load.percent
  return mround(Number(anchor) * percent, context.rounding)
}

function resolveMovementId(movementId: string | { default: string; byPhase?: Record<string, string> }, phaseKey: string) {
  if (typeof movementId === 'string') return movementId
  return movementId.byPhase?.[phaseKey] ?? movementId.default
}

function applyMovementOverride(
  overrides: ProgramMovementOverride[],
  {
    slotId,
    phaseKey,
    role,
    movementId,
    currentWeekIndex,
  }: {
    slotId: string
    phaseKey: string
    role: MovementRole
    movementId: string
    currentWeekIndex: number
  },
) {
  const override = overrides.find(
    (item) =>
      item.slotId === slotId &&
      item.phaseKey === phaseKey &&
      item.role === role &&
      item.effectiveFromWeekIndex <= currentWeekIndex,
  )
  return override?.replacementMovementId ?? movementId
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}
