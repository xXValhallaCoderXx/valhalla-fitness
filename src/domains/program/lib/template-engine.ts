import { z } from 'zod'
import type {
  MovementRole,
  MovementSlot,
  Movement,
  ProgramAccessoryAddition,
  PlannedSession,
  ProgramInstance,
  ProgramMovementOverride,
  ProgramStateInput,
  ProgramStateType,
  SetLog,
  Unit,
} from '~/shared/types'
import { accessoryProgressionRuleId } from '~/domains/session/lib/accessories'
import { getMovementName } from '~/domains/movement/lib/movements'
import { mround } from '~/domains/program/lib/progression'
import { convertWeight } from '~/shared/lib/math'

const hardnessSchema = z.enum(['Light', 'Medium', 'Hard', 'Deload'])

const loadSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('percent_of_state'),
    stateKey: z.string().min(1).optional(),
    stateType: z.enum(['training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual']).default('training_max'),
    percent: z.number().positive(),
    percentMax: z.number().positive().optional(),
    default: z.enum(['low', 'high', 'blank']).default('low'),
  }),
  z.object({
    kind: z.literal('state'),
    stateKey: z.string().min(1).optional(),
    stateType: z.enum(['training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual']).default('working_load'),
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

const requiredStateSchema = z.object({
  key: z.string().min(1),
  movementId: z.string().min(1),
  type: z.enum(['training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual']),
  label: z.string().optional(),
})

const progressionConfigSchema = z.object({
  simple_linear_completion: z.object({
    increments: z.record(z.string(), z.object({
      kg: z.number().positive(),
      lb: z.number().positive(),
    })),
  }).optional(),
}).optional()

export const templateDefinitionSchema = z.object({
  schemaVersion: z.literal('2026.06.dsl'),
  id: z.string().min(1),
  name: z.string().min(1),
  durationWeeks: z.number().int().positive(),
  daysPerWeek: z.number().int().positive(),
  requiredState: z.array(requiredStateSchema),
  timelineDescription: z.string().min(1),
  sessions: z.array(sessionSchema).min(1),
  weeks: z.array(weekSchema).min(1),
  progressionRules: z.record(z.string(), z.string()).optional(),
  progressionConfig: progressionConfigSchema,
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
  const stateKeys = new Set<string>()
  for (const [stateIndex, state] of definition.requiredState.entries()) {
    if (stateKeys.has(state.key)) {
      context.addIssue({
        code: 'custom',
        path: ['requiredState', stateIndex, 'key'],
        message: `${state.key} is declared more than once`,
      })
    }
    stateKeys.add(state.key)
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
      for (const stateKey of slotStateKeys(definition, slot)) {
        if (!stateKeys.has(stateKey)) {
          context.addIssue({
            code: 'custom',
            path: ['sessions', sessionIndex, 'slots', slotIndex, 'anchorMovementId'],
            message: `${stateKey} must be listed in requiredState because this slot references programme state`,
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

export type TimelineSessionMovement = {
  role: MovementRole
  roleLabel: string
  movementName: string
  targetSummary: string
  progressionRuleId?: string | null
}

export type TimelineSession = {
  label: string
  title: string
  movementSummary: string
  keyPrescription: string
  movements: TimelineSessionMovement[]
  progressionNote: string
  globalIndex: number
}

export type TimelineWeek = {
  index: number
  subtitle: string
  summary: string
  phaseKey: string
  phaseLabel: string
  waveLabel?: string
  hardness: TemplateDefinition['weeks'][number]['hardness']
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

export function findMissingTemplateMovementIds(
  definition: TemplateDefinition,
  catalog: Record<string, Movement>,
) {
  const movementIds = new Set<string>()
  for (const state of definition.requiredState) movementIds.add(state.movementId)
  for (const session of definition.sessions) {
    for (const slot of session.slots) {
      for (const movementId of movementIdsForSlot(slot.movementId)) movementIds.add(movementId)
      if (slot.anchorMovementId) movementIds.add(slot.anchorMovementId)
    }
  }
  return Array.from(movementIds).filter((movementId) => !catalog[movementId]).sort()
}

export function validateRequiredState(definition: TemplateDefinition, stateValues: ProgramStateInput[]) {
  const values = new Map(stateValues.map((state) => [state.key, state.value]))
  const missing = definition.requiredState.filter((state) => {
    const value = values.get(state.key)
    return !Number.isFinite(value) || Number(value) <= 0
  })
  if (missing.length) {
    throw new Error(`Missing valid programme state for ${missing.map((state) => state.label ?? getMovementName(state.movementId)).join(', ')}`)
  }
}

function slotStateKeys(
  definition: z.infer<typeof templateDefinitionSchema>,
  slot: z.infer<typeof slotSchema>,
) {
  const stateKeys = new Set<string>()
  for (const week of definition.weeks) {
    const prescription = week.prescriptions[slot.prescriptionId]
    for (const set of prescription?.sets ?? []) {
      if (set.targetLoad?.kind === 'state' || set.targetLoad?.kind === 'percent_of_state') {
        if (set.targetLoad.stateKey) {
          stateKeys.add(set.targetLoad.stateKey)
          continue
        }
        const movementIds =
          set.targetLoad.kind === 'percent_of_state'
            ? slot.anchorMovementId
              ? [slot.anchorMovementId]
              : movementIdsForSlot(slot.movementId)
            : movementIdsForSlot(slot.movementId)
        for (const movementId of movementIds) {
          stateKeys.add(programStateKey(movementId, set.targetLoad.stateType))
        }
      }
    }
  }
  return stateKeys
}

export function expandSessionFromTemplateDefinition(
  program: ProgramInstance,
  definition: TemplateDefinition,
  scheduledDate: string,
  previousBySlotId: Record<string, MovementSlot['previous']> = {},
): PlannedSession {
  validateRequiredState(definition, program.stateValues)
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
    return {
      id: slotId,
      slotId,
      phaseKey: week.phaseKey,
      movementId,
      movementName: getMovementName(movementId),
      role: slot.role,
      orderIndex: index + 1,
      targetSummary: slot.targetSummary ?? prescription.targetSummary,
      progressionRuleId: prescription.progressionRuleId ?? null,
      sets: prescription.sets.map((set, setIndex) =>
        expandSet(set, setIndex, {
          stateValues: program.stateValues,
          movementId,
          anchorMovementId: slot.anchorMovementId ?? plannedMovementId,
          rounding: program.rounding,
          units: program.units,
        }),
      ),
      previous: previousBySlotId[slotId] ?? null,
    }
  })
  const additions = (program.accessoryAdditions ?? [])
    .filter((addition) => {
      if (addition.sessionId !== session.id) return false
      if (addition.effectiveFromWeekIndex > program.currentWeekIndex) return false
      return addition.phaseKey === '*' || addition.phaseKey === week.phaseKey
    })
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((addition, additionIndex) =>
      expandAccessoryAddition(addition, {
        session,
        week,
        additionIndex,
        baseOrderIndex: session.slots.length,
        program,
        previousBySlotId,
      }),
    )

  return {
    id: `${session.id}-w${programmeWeekIndex + 1}`,
    templateSessionId: session.id,
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
    movements: [...movements, ...additions],
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
      phaseKey: week.phaseKey,
      phaseLabel: week.phaseLabel,
      waveLabel: week.waveLabel,
      hardness: week.hardness,
      sessions: definition.sessions.map((session, sessionIndex): TimelineSession => {
        const roleCounts = countSlotRoles(session.slots)
        const roleIndexes = new Map<MovementRole, number>()
        const movements = session.slots.map((slot): TimelineSessionMovement => {
          const roleIndex = (roleIndexes.get(slot.role) ?? 0) + 1
          roleIndexes.set(slot.role, roleIndex)
          const prescription = week.prescriptions[slot.prescriptionId]
          return {
            role: slot.role,
            roleLabel: timelineRoleLabel(slot.role, roleCounts.get(slot.role) ?? 1, roleIndex),
            movementName: getMovementName(resolveMovementId(slot.movementId, week.phaseKey)),
            targetSummary: slot.targetSummary ?? prescription?.targetSummary ?? 'No prescription',
            progressionRuleId: prescription?.progressionRuleId ?? null,
          }
        })
        const progressionRuleIds = uniqueCompact(movements.map((movement) => movement.progressionRuleId).filter(Boolean) as string[])
        return {
          label: `S${sessionIndex + 1}`,
          title: session.title,
          movementSummary: movements.map((movement) => movement.movementName).join(', ') || 'No movements',
          keyPrescription: movements.find((movement) => movement.role === 'main')?.targetSummary ?? movements[0]?.targetSummary ?? 'No prescription',
          movements,
          progressionNote: progressionRuleIds.length
            ? `Session work uses ${progressionRuleIds.map((ruleId) => ruleId.replaceAll('_', ' ')).join(', ')}.`
            : 'Log completed sets honestly; future recommendations use saved performance.',
          globalIndex: weekIndex * definition.daysPerWeek + sessionIndex,
        }
      }),
    })),
  }
}

function countSlotRoles(slots: TemplateDefinition['sessions'][number]['slots']) {
  const counts = new Map<MovementRole, number>()
  for (const slot of slots) counts.set(slot.role, (counts.get(slot.role) ?? 0) + 1)
  return counts
}

function timelineRoleLabel(role: MovementRole, roleCount: number, roleIndex: number) {
  const label = role.replaceAll('_', ' ')
  const title = label.charAt(0).toUpperCase() + label.slice(1)
  return roleCount > 1 ? `${title} ${roleIndex}` : title
}

function uniqueCompact(values: string[]) {
  return Array.from(new Set(values))
}

function expandSet(
  set: TemplateSetDefinition,
  setIndex: number,
  context: {
    stateValues: ProgramStateInput[]
    movementId: string
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
    stateValues: ProgramStateInput[]
    movementId: string
    anchorMovementId: string
    rounding: number
    units: Unit
  },
) {
  if (!load || load.kind === 'user_selected') return null
  if (load.kind === 'fixed') {
    return context.units === 'kg' ? load.kg : load.lb ?? mround(convertWeight(load.kg, 'kg', 'lb'), 5)
  }
  const movementId = load.kind === 'percent_of_state' ? context.anchorMovementId : context.movementId
  const stateKey = load.stateKey ?? programStateKey(movementId, load.stateType)
  const state = context.stateValues.find((item) => item.key === stateKey)
  if (!state || !Number.isFinite(state.value) || Number(state.value) <= 0) {
    throw new Error(`Missing valid programme state for ${stateKey}`)
  }
  if (load.kind === 'state') return Number(state.value)
  if (load.default === 'blank') return null
  const percent = load.default === 'high' && load.percentMax ? load.percentMax : load.percent
  return mround(Number(state.value) * percent, context.rounding)
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
      (item.phaseKey === phaseKey || item.phaseKey === '*') &&
      item.role === role &&
      item.effectiveFromWeekIndex <= currentWeekIndex,
  )
  return override?.replacementMovementId ?? movementId
}

function expandAccessoryAddition(
  addition: ProgramAccessoryAddition,
  {
    session,
    week,
    additionIndex,
    baseOrderIndex,
    program,
    previousBySlotId,
  }: {
    session: TemplateDefinition['sessions'][number]
    week: TemplateDefinition['weeks'][number]
    additionIndex: number
    baseOrderIndex: number
    program: ProgramInstance
    previousBySlotId: Record<string, MovementSlot['previous']>
  },
): MovementSlot {
  const sourceSlot = addition.sourceSlotId
    ? session.slots.find((slot) => slot.id === addition.sourceSlotId)
    : null
  const prescription = week.prescriptions[addition.prescriptionId]
  if (!addition.sets?.length && !prescription) throw new Error(`Missing ${addition.prescriptionId} prescription`)
  const slotId = `slot-${session.id}-${addition.slotId}`
  const sets = addition.sets?.length
    ? expandManualAccessorySets(addition.sets)
    : prescription!.sets.map((set, setIndex) =>
        expandSet(set, setIndex, {
          stateValues: program.stateValues,
          movementId: addition.movementId,
          anchorMovementId: sourceSlot?.anchorMovementId ?? addition.movementId,
          rounding: program.rounding,
          units: program.units,
        }),
      )

  return {
    id: slotId,
    slotId,
    phaseKey: week.phaseKey,
    movementId: addition.movementId,
    movementName: getMovementName(addition.movementId),
    role: 'accessory',
    orderIndex: baseOrderIndex + additionIndex + 1,
    targetSummary: addition.targetSummary ?? prescription?.targetSummary ?? 'Accessory work',
    progressionRuleId: accessoryProgressionRuleId(addition.progressionMethod ?? 'history_only'),
    progressionMethod: addition.progressionMethod ?? 'history_only',
    sets,
    previous: previousBySlotId[slotId] ?? null,
    notes: addition.note ?? null,
    isAdded: true,
    addedScope: 'phase_slot',
  }
}

function expandManualAccessorySets(sets: ProgramAccessoryAddition['sets']): SetLog[] {
  return (sets ?? []).map((set, index) => ({
    ...set,
    id: set.id ?? `set-${index + 1}`,
    setIndex: set.setIndex ?? index + 1,
    completed: false,
    actualLoad: set.targetLoad ?? null,
    actualReps: set.targetReps ?? set.targetRepMin ?? null,
  }))
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

export function programStateKey(movementId: string, stateType: ProgramStateType) {
  return `${movementId}_${stateType}`
}

function movementIdsForSlot(movementId: string | { default: string; byPhase?: Record<string, string> }) {
  if (typeof movementId === 'string') return [movementId]
  return Array.from(new Set([movementId.default, ...Object.values(movementId.byPhase ?? {})]))
}
