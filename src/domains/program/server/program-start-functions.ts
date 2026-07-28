import { createServerFn } from '@tanstack/react-start'
import type {
  ProgramAccessoryAddition,
  ProgramMovementOverride,
  ProgramSetupOptions,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  ProgramStateInput,
  ProgramTemplateSummary,
} from '~/domains/program'
import type { Unit } from '~/shared/types'
import { defaultStateValues } from '~/domains/program/lib/templates'
import {
  validateRequiredState,
  type TemplateDefinition,
} from '~/domains/program/lib/template-engine'
import {
  buildCustomProgramTemplateDefinition,
  customProgramBuilderInputSchema,
} from '~/domains/program/lib/custom-templates'
import { getMovementName } from '~/domains/movement/lib/movements'
import { startProgramInputSchema } from '~/domains/program/lib/schemas'
import {
  ensureProfile,
  normalizeProgramStateDefaults,
} from '~/domains/account/server/profile-functions'
import {
  getMovementCatalogForSwap,
  getReplacementRulesForSwap,
} from '~/domains/movement/server/movement-functions'
import { calendarDateInTimeZone } from '~/shared/lib/calendar-date'
import type { Json } from '~/shared/types/database'
import { getActiveProgramInternal } from '~/domains/program/server/active-program-functions'
import {
  getLatestTemplateVersion,
  mapTemplateRow,
} from '~/domains/program/server/program-template-data'
import { buildProgramSetupOptions } from '~/domains/program/server/program-setup'
import { requireProgramUser } from '~/domains/program/server/program-server'

function validProgramStateValues(
  definition: TemplateDefinition,
  stateValues: ProgramStateInput[],
): Array<ProgramStateInput & { value: number }> {
  const requiredKeys = new Set(
    definition.requiredState.map((state) => state.key),
  )
  const requiredStateValues = stateValues.filter((state) =>
    requiredKeys.has(state.key),
  )
  validateRequiredState(definition, requiredStateValues)
  return requiredStateValues.map((state) => {
    const value = Number(state.value)
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Missing valid programme state for ${state.label ?? getMovementName(state.movementId)}`,
      )
    }
    return { ...state, value }
  })
}

function normalizeStartMovementOverrides(
  input: ProgramStartMovementOverrideInput[] | undefined,
  setupOptions: ProgramSetupOptions,
): Array<
  Omit<
    ProgramMovementOverride,
    'id' | 'programInstanceId' | 'effectiveFromWeekIndex'
  > & { effectiveFromWeekIndex: number }
> {
  const setupSlots = setupOptions.sessions.flatMap((session) => session.slots)
  const overrides = new Map<
    string,
    Omit<
      ProgramMovementOverride,
      'id' | 'programInstanceId' | 'effectiveFromWeekIndex'
    > & { effectiveFromWeekIndex: number }
  >()

  for (const item of input ?? []) {
    if (item.replacementMovementId === item.originalMovementId) continue
    const setupSlot = setupSlots.find(
      (slot) =>
        slot.slotId === item.slotId &&
        slot.phaseKey === item.phaseKey &&
        slot.role === item.role,
    )
    if (!setupSlot) throw new Error('Invalid customization slot.')
    if (setupSlot.defaultMovementId !== item.originalMovementId) {
      throw new Error(
        'Customization no longer matches the selected template.',
      )
    }
    const selectedOption = setupSlot.replacementOptions.find(
      (option) =>
        option.movementId === item.replacementMovementId &&
        option.allowedScopes.includes('phase_slot'),
    )
    if (!selectedOption) {
      throw new Error(
        'This movement is not an allowed programme replacement for the selected slot.',
      )
    }
    overrides.set(`${item.slotId}:${item.phaseKey}:${item.role}`, {
      slotId: item.slotId,
      phaseKey: item.phaseKey,
      role: item.role,
      originalMovementId: item.originalMovementId,
      replacementMovementId: item.replacementMovementId,
      effectiveFromWeekIndex: 0,
    })
  }

  return Array.from(overrides.values())
}

function sanitizeSlotPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-')
}

function customTemplateId(userId: string, name: string) {
  const slug =
    sanitizeSlotPart(name.toLowerCase()).replace(/^-|-$/g, '').slice(0, 32) ||
    'programme'
  return `custom-${userId.slice(0, 8)}-${Date.now().toString(36)}-${slug}`
}

export const createCustomProgramTemplateFn = createServerFn({ method: 'POST' })
  .validator((data) => customProgramBuilderInputSchema.parse(data))
  .handler(async ({ data }): Promise<ProgramTemplateSummary> => {
    await ensureProfile()
    const { supabase, user } = await requireProgramUser()
    const catalog = await getMovementCatalogForSwap(supabase)
    const generated = buildCustomProgramTemplateDefinition({
      input: data,
      templateId: customTemplateId(user.id, data.name),
      catalog,
    })

    const { data: templateId, error: createError } = await supabase.rpc(
      'create_custom_program_template_v2',
      {
        p_template: {
          id: generated.metadata.id,
          name: generated.metadata.name,
          description: generated.metadata.description,
          daysPerWeek: generated.metadata.daysPerWeek,
          progressionLabel: generated.metadata.progressionLabel,
          complexity: generated.metadata.complexity,
          schemaVersion: generated.definition.schemaVersion,
          tags: generated.metadata.tags,
        },
        p_definition: generated.definition as unknown as Json,
      },
    )
    if (createError) throw new Error(createError.message)
    if (templateId !== generated.metadata.id) {
      throw new Error('Custom programme creation returned an invalid template.')
    }

    const { data: templateRow, error: templateError } = await supabase
      .from('program_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    if (templateError) throw new Error(templateError.message)

    return mapTemplateRow(templateRow, true, generated.definition)
  })

function normalizeStartAccessoryAdditions(
  input: ProgramStartAccessoryAdditionInput[] | undefined,
  setupOptions: ProgramSetupOptions,
): Array<Omit<ProgramAccessoryAddition, 'id' | 'programInstanceId'>> {
  const additionsBySession = new Map<string, number>()
  const validMovements = new Set(
    setupOptions.accessoryCatalog.map((movement) => movement.movementId),
  )

  return (input ?? []).map((item) => {
    const session = setupOptions.sessions.find(
      (candidate) => candidate.id === item.sessionId,
    )
    if (!session) throw new Error('Invalid accessory session.')
    const source = session.accessoryPrescriptions.find(
      (candidate) => candidate.sourceSlotId === item.sourceSlotId,
    )
    if (!source) {
      throw new Error(
        'Added accessories must copy an existing accessory prescription from the same session.',
      )
    }
    if (!validMovements.has(item.movementId)) {
      throw new Error('Invalid accessory movement.')
    }

    const index = (additionsBySession.get(item.sessionId) ?? 0) + 1
    additionsBySession.set(item.sessionId, index)
    return {
      sessionId: item.sessionId,
      slotId: `added-accessory-${index}-${sanitizeSlotPart(item.movementId)}`,
      phaseKey: item.phaseKey ?? '*',
      movementId: item.movementId,
      prescriptionId: source.prescriptionId,
      sourceSlotId: item.sourceSlotId,
      effectiveFromWeekIndex: 0,
      orderIndex: index,
    }
  })
}

export const startProgramFn = createServerFn({ method: 'POST' })
  .validator((data) => startProgramInputSchema.parse(data))
  .handler(async ({ data }) => {
    const profile = await ensureProfile()
    const { supabase } = await requireProgramUser()
    const { data: templateRow, error: templateError } = await supabase
      .from('program_templates')
      .select('*')
      .eq('id', data.templateId)
      .eq('is_active', true)
      .single()
    if (templateError) throw new Error(templateError.message)

    const template = mapTemplateRow(templateRow)
    const templateVersion = await getLatestTemplateVersion(
      supabase,
      data.templateId,
    )
    const [catalog, rules] = await Promise.all([
      getMovementCatalogForSwap(supabase),
      getReplacementRulesForSwap(supabase),
    ])
    const setupOptions = buildProgramSetupOptions({
      template,
      definition: templateVersion.definition,
      catalog,
      rules,
    })
    const movementOverrides = normalizeStartMovementOverrides(
      data.movementOverrides,
      setupOptions,
    )
    const accessoryAdditions = normalizeStartAccessoryAdditions(
      data.accessoryAdditions,
      setupOptions,
    )
    const units = (data.units ?? profile.units) as Unit
    const rounding = data.rounding ?? Number(profile.rounding)
    const profileStateDefaults = normalizeProgramStateDefaults(
      profile.program_state_defaults,
      units,
    )
    const stateValues = data.stateValues
      ? data.stateValues
      : defaultStateValues(
          units,
          templateVersion.definition.requiredState.filter(
            (state) =>
              state.type !== 'training_max' &&
              state.type !== 'working_load',
          ),
          profileStateDefaults,
        )
    const persistedStateValues = validProgramStateValues(
      templateVersion.definition,
      stateValues,
    )

    const { error } = await supabase.rpc('start_program_v2', {
      p_request_id: data.requestId,
      p_template_id: data.templateId,
      p_template_version_id: templateVersion.id,
      p_definition_checksum: templateVersion.definitionChecksum,
      p_title: data.title || template.name,
      p_start_date: calendarDateInTimeZone(
        new Date(),
        data.timeZone ?? profile.timezone,
      ),
      p_units: units,
      p_rounding: rounding,
      p_current_block_id:
        templateVersion.definition.weeks[0]?.phaseKey ?? null,
      p_state_values: persistedStateValues as unknown as Json,
      p_movement_overrides: movementOverrides as unknown as Json,
      p_accessory_additions: accessoryAdditions as unknown as Json,
      p_replace_active: data.replaceActiveProgram ?? false,
    })
    if (error) {
      if (error.message.includes('ACTIVE_PROGRAM_EXISTS')) {
        throw new Error('Active program in progress')
      }
      throw new Error(error.message)
    }
    return getActiveProgramInternal()
  })
