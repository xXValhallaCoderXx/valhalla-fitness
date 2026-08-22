import { createServerFn } from '@tanstack/react-start'
import type {
  ProgramAccessoryAddition,
  ProgramCustomizationSummary,
  ProgramInstance,
  ProgramMovementOverride,
  ProgramEquipmentModeChoice,
  ProgramStateInput,
  ProgressionDecision,
} from '~/domains/program'
import type { Unit } from '~/shared/types'
import { getMovementName } from '~/domains/movement/lib/movements'
import {
  resolveProgressionDecisionInputSchema,
  resolveProgressionDecisionsInputSchema,
} from '~/domains/program/lib/schemas'
import { getPinnedTemplateDefinition } from '~/domains/program/server/program-template-data'
import { requireProgramUser } from '~/domains/program/server/program-server'
import type { Tables } from '~/shared/types/database'
import type { SupabaseServerClient } from '~/shared/server/supabase'

function mapProgramMovementOverride(
  row: Tables<'program_movement_overrides'>,
): ProgramMovementOverride {
  return {
    id: row.id,
    programInstanceId: row.program_instance_id,
    slotId: row.slot_id,
    phaseKey: row.phase_key,
    role: row.role as ProgramMovementOverride['role'],
    originalMovementId: row.original_movement_id,
    replacementMovementId: row.replacement_movement_id,
    effectiveFromWeekIndex: row.effective_from_week_index,
  }
}

function defaultCustomizationSummary(): ProgramCustomizationSummary {
  return {
    movementOverrideCount: 0,
    accessoryAdditionCount: 0,
  }
}

export function normalizeCustomizationSummary(
  input: unknown,
): ProgramCustomizationSummary {
  if (!input || typeof input !== 'object') return defaultCustomizationSummary()
  const value = input as Record<string, unknown>
  return {
    movementOverrideCount: Number(value.movementOverrideCount ?? 0),
    accessoryAdditionCount: Number(value.accessoryAdditionCount ?? 0),
  }
}

function mapProgramAccessoryAddition(
  row: Tables<'program_accessory_additions'>,
): ProgramAccessoryAddition {
  return {
    id: row.id,
    programInstanceId: row.program_instance_id,
    sessionId: row.session_id,
    slotId: row.slot_id,
    phaseKey: row.phase_key,
    movementId: row.movement_id,
    prescriptionId: row.prescription_id,
    sourceSlotId: row.source_slot_id,
    targetSummary: row.target_summary,
    sets: Array.isArray(row.sets)
      ? (row.sets as unknown as ProgramAccessoryAddition['sets'])
      : [],
    note: row.note,
    progressionMethod: (row.progression_method ??
      'history_only') as ProgramAccessoryAddition['progressionMethod'],
    effectiveFromWeekIndex: Number(row.effective_from_week_index),
    orderIndex: Number(row.order_index),
  }
}

function mapProgramEquipmentModeChoice(
  row: Tables<'program_equipment_mode_choices'>,
): ProgramEquipmentModeChoice {
  return {
    id: row.id,
    programInstanceId: row.program_instance_id,
    templateSessionId: row.template_session_id,
    slotId: row.slot_id,
    phaseKey: row.phase_key,
    role: row.role as ProgramEquipmentModeChoice['role'],
    sourceMovementId: row.source_movement_id,
    replacementMovementId: row.replacement_movement_id,
    policyRuleId: row.policy_rule_id,
  }
}

export function mapProgressionDecision(
  row: Tables<'progression_decisions'>,
): ProgressionDecision {
  return {
    id: row.id,
    movementId: row.movement_id,
    movementName: getMovementName(row.movement_id),
    stateKey: row.state_key,
    stateType: row.state_type as ProgressionDecision['stateType'],
    ruleId: row.rule_id,
    scope: row.scope as ProgressionDecision['scope'],
    status: row.status as ProgressionDecision['status'],
    inputSummary: row.input_summary,
    recommendation: row.recommendation,
    previousValue:
      row.previous_value === null ? null : Number(row.previous_value),
    recommendedValue:
      row.recommended_value === null ? null : Number(row.recommended_value),
    resolvedAt: row.resolved_at ?? null,
  }
}

export async function getActiveProgramInternal(): Promise<ProgramInstance | null> {
  const { supabase, user } = await requireProgramUser()
  const { data: instance, error } = await supabase
    .from('program_instances')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!instance) return null

  const { data: stateRows, error: stateError } = await supabase
    .from('program_state_values')
    .select('*')
    .eq('program_instance_id', instance.id)
    .order('key')
  if (stateError) throw new Error(stateError.message)

  const { data: movementOverrides, error: overrideError } = await supabase
    .from('program_movement_overrides')
    .select('*')
    .eq('user_id', user.id)
    .eq('program_instance_id', instance.id)
    .order('created_at', { ascending: true })
  if (overrideError) throw new Error(overrideError.message)

  const { data: accessoryAdditions, error: additionError } = await supabase
    .from('program_accessory_additions')
    .select('*')
    .eq('user_id', user.id)
    .eq('program_instance_id', instance.id)
    .order('order_index', { ascending: true })
  if (additionError) throw new Error(additionError.message)

  const { data: equipmentModeChoices, error: equipmentModeChoiceError } =
    await supabase
      .from('program_equipment_mode_choices')
      .select('*')
      .eq('user_id', user.id)
      .eq('program_instance_id', instance.id)
      .order('template_session_id', { ascending: true })
      .order('phase_key', { ascending: true })
      .order('slot_id', { ascending: true })
  if (equipmentModeChoiceError) {
    throw new Error(equipmentModeChoiceError.message)
  }

  const templateDefinition = await getPinnedTemplateDefinition(
    supabase,
    instance.template_version_id,
    instance.template_id,
  )

  return {
    id: instance.id,
    templateId: instance.template_id,
    templateVersionId: instance.template_version_id,
    title: instance.title,
    status: instance.status as ProgramInstance['status'],
    startDate: instance.start_date,
    units: instance.units as Unit,
    rounding: Number(instance.rounding),
    currentWeekIndex: instance.current_week_index,
    stateVersion: instance.state_version,
    equipmentMode:
      (instance.equipment_mode as ProgramInstance['equipmentMode']) ??
      'standard',
    freeWeightPolicyVersionId:
      instance.free_weight_policy_version_id ?? null,
    freeWeightChoicesHash: instance.free_weight_choices_hash ?? null,
    customizationStatus: (instance.customization_status ??
      'default') as ProgramInstance['customizationStatus'],
    customizationSummary: normalizeCustomizationSummary(
      instance.customization_summary,
    ),
    stateValues: (stateRows ?? []).map((state) => ({
      key: state.key,
      movementId: state.movement_id,
      type: state.state_type as ProgramStateInput['type'],
      label: state.label ?? undefined,
      value: Number(state.value),
      unit: (state.unit ?? instance.units) as Unit,
      updatedAt: state.updated_at ?? null,
    })),
    movementOverrides: (movementOverrides ?? []).map(mapProgramMovementOverride),
    accessoryAdditions: (accessoryAdditions ?? []).map(
      mapProgramAccessoryAddition,
    ),
    equipmentModeChoices: (equipmentModeChoices ?? []).map(
      mapProgramEquipmentModeChoice,
    ),
    templateDefinition,
  }
}

export async function getPendingDecisionsInternal(
  programInstanceId?: string,
) {
  const { supabase, user } = await requireProgramUser()
  let query = supabase
    .from('progression_decisions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (programInstanceId) {
    query = query.eq('program_instance_id', programInstanceId)
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapProgressionDecision)
}

export async function updateProgramCurrentWeekIndex(
  supabase: SupabaseServerClient,
  _userId: string,
  program: ProgramInstance,
): Promise<ProgramInstance> {
  const { data, error } = await supabase
    .rpc('advance_program_position_v2', {
      p_program_id: program.id,
      p_expected_state_version: program.stateVersion,
      p_current_week_index: program.currentWeekIndex,
    })
  if (error) {
    if (error.message.includes('CONFLICT')) {
      throw new Error('Program position changed. Refresh and try again.')
    }
    throw new Error(error.message)
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Program position update returned an invalid result.')
  }
  const result = data as {
    advanced?: unknown
    currentWeekIndex?: unknown
    programId?: unknown
    stateVersion?: unknown
  }
  if (
    result.programId !== program.id ||
    Number(result.currentWeekIndex) !== program.currentWeekIndex ||
    !Number.isInteger(Number(result.stateVersion))
  ) {
    throw new Error('Program position update returned an invalid result.')
  }
  if (result.advanced === true) {
    return { ...program, stateVersion: Number(result.stateVersion) }
  }

  const refreshed = await getActiveProgramInternal()
  if (
    refreshed?.id !== program.id ||
    refreshed.currentWeekIndex !== program.currentWeekIndex
  ) {
    throw new Error('Program position changed. Refresh and try again.')
  }
  return refreshed
}

export const getActiveProgramFn = createServerFn({ method: 'GET' }).handler(
  getActiveProgramInternal,
)

export const resolveProgressionDecisionFn = createServerFn({ method: 'POST' })
  .validator((data) => resolveProgressionDecisionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireProgramUser()
    const { data: decision, error } = await supabase
      .from('progression_decisions')
      .select('program_instance_id')
      .eq('id', data.decisionId)
      .eq('user_id', user.id)
      .single()
    if (error) throw new Error(error.message)

    const { error: updateError } = await supabase.rpc(
      'resolve_progression_decisions_v2',
      {
        p_decision_ids: [data.decisionId],
        p_action: data.action,
        p_request_id: data.requestId,
      },
    )
    if (updateError) throw new Error(updateError.message)
    return getPendingDecisionsInternal(decision.program_instance_id)
  })

export const resolveProgressionDecisionsFn = createServerFn({ method: 'POST' })
  .validator((data) => resolveProgressionDecisionsInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase } = await requireProgramUser()
    const { error } = await supabase.rpc('resolve_progression_decisions_v2', {
      p_decision_ids: data.decisionIds,
      p_action: data.action,
      p_request_id: data.requestId,
    })
    if (error) throw new Error(error.message)
    return data.decisionIds
  })
