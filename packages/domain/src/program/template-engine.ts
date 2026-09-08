import { applyReturnPrescription } from './return-prescription'
import { fixedLoadKey, percentOf, referencedStateKey } from './return-loads'
import type { Movement } from '@sheetless/domain/movement/types'
import type {
  ProgramAccessoryAddition,
  ProgramInstance,
  ProgramMovementOverride,
  ProgramStateInput,
  ProgramStateType,
  TemplateDefinition,
  TemplateSetDefinition,
} from '@sheetless/domain/program/types'
import type { MovementSlot, PlannedSession, SetLog } from '@sheetless/domain/session/types'
import type { MovementRole, Unit } from '@sheetless/domain/shared/types'
import { accessoryProgressionRuleId } from '@sheetless/domain/session/accessories'
import { getMovementName } from '@sheetless/domain/movement/movements'
import {
  applyEquipmentModeToSlot,
  resolveEquipmentModeMovement,
  resolveProgramMovementOverride,
} from '@sheetless/domain/program/equipment-mode'
import { mround } from '@sheetless/domain/program/progression'
import { convertWeight } from '@sheetless/domain/shared/math'
// Zod parsing stays in `template-engine-schema.ts` so clients that only build
// timelines and previews never bundle Zod.
export type {
  TemplateDefinition,
  TemplateSetDefinition,
} from '@sheetless/domain/program/types/template'
export type { TemplateValidationResult } from '@sheetless/domain/program/template-engine-schema'

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
    const sourceMovementId = applyMovementOverride(program.movementOverrides ?? [], {
      slotId,
      phaseKey: week.phaseKey,
      role: slot.role,
      movementId: plannedMovementId,
      currentWeekIndex: program.currentWeekIndex,
    })
    const equipmentResolution = resolveEquipmentModeMovement({
      program,
      templateSessionId: session.id,
      slotId,
      phaseKey: week.phaseKey,
      role: slot.role,
      sourceMovementId,
    })
    const movementId = equipmentResolution.movementId
    return applyEquipmentModeToSlot({
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
          fixedOverride: program.loadOverrides?.find((override) => override.key === fixedLoadKey({
            templateSessionId: session.id, slotId, weekIndex: programmeWeekIndex,
            movementId: sourceMovementId, setIndex: setIndex + 1,
          }))?.value,
          stateValues: program.stateValues,
          movementId: sourceMovementId,
          anchorMovementId: slot.anchorMovementId ?? plannedMovementId,
          rounding: program.rounding,
          units: program.units,
        }),
      ),
      previous: previousBySlotId[slotId] ?? null,
    }, equipmentResolution.adaptation)
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

  return applyReturnPrescription({
    id: `${session.id}-w${programmeWeekIndex + 1}`,
    templateSessionId: session.id,
    title: session.title,
    programTitle: program.title,
    templateId: program.templateId,
    equipmentMode: program.equipmentMode,
    freeWeightPolicyVersionId: program.freeWeightPolicyVersionId ?? null,
    weekIndex: program.currentWeekIndex,
    phaseLabel: week.phaseLabel,
    weekLabel: week.waveLabel
      ? `${week.phaseLabel.replace(/\s+phase$/i, '')} ${week.waveLabel} · ${week.label}`
      : week.label,
    hardness: week.hardness,
    scheduledDate,
    estimatedMinutes: session.estimatedMinutes,
    units: program.units,
    rounding: program.rounding,
    movements: [...movements, ...additions],
  }, program)
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
    fixedOverride?: number
    stateValues: ProgramStateInput[]
    movementId: string
    anchorMovementId: string
    rounding: number
    units: Unit
  },
): SetLog {
  const targetLoad = set.targetLoad?.kind === 'fixed' && context.fixedOverride !== undefined
    ? context.fixedOverride : resolveTargetLoad(set.targetLoad, context)
  const key = referencedStateKey(set.targetLoad, context.movementId, context.anchorMovementId)
  const state = key ? context.stateValues.find((item) => item.key === key) : null
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
    sourcePrescription: set,
    sourceBinding: state?.value != null ? { stateKey: state.key, stateType: state.type, value: state.value } : null,
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
    fixedOverride?: number
    stateValues: ProgramStateInput[]
    movementId: string
    anchorMovementId: string
    rounding: number
    units: Unit
  },
) {
  if (!load || load.kind === 'user_selected' || (load.kind === 'percent_of_state' && load.default === 'blank')) return null
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
  return mround(Number(state.value) * percentOf(load), context.rounding)
}

export function resolveMovementId(movementId: string | { default: string; byPhase?: Record<string, string> }, phaseKey: string) {
  if (typeof movementId === 'string') return movementId
  return movementId.byPhase?.[phaseKey] ?? movementId.default
}

export function applyMovementOverride(
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
  return resolveProgramMovementOverride(overrides, {
    slotId,
    phaseKey,
    role,
    movementId,
    currentWeekIndex,
  })
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

  const equipmentResolution = resolveEquipmentModeMovement({
    program,
    templateSessionId: session.id,
    slotId,
    phaseKey: week.phaseKey,
    role: 'accessory',
    sourceMovementId: addition.movementId,
  })
  const movementId = equipmentResolution.movementId

  return applyEquipmentModeToSlot({
    id: slotId,
    slotId,
    phaseKey: week.phaseKey,
    movementId,
    movementName: getMovementName(movementId),
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
  }, equipmentResolution.adaptation)
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

export function movementIdsForSlot(movementId: string | { default: string; byPhase?: Record<string, string> }) {
  if (typeof movementId === 'string') return [movementId]
  return Array.from(new Set([movementId.default, ...Object.values(movementId.byPhase ?? {})]))
}
