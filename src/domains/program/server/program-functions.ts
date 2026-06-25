import { createServerFn } from '@tanstack/react-start'
import type {
  Movement,
  MovementReplacementRule,
  ProgramAccessoryAddition,
  ProgramCustomizationSummary,
  ProgramInstance,
  ProgramMovementOverride,
  ProgramSetupOptions,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  ProgramStateInput,
  ProgramTemplateOrigin,
  ProgramTemplateSummary,
  ProgressionDecision,
  Unit,
} from '~/shared/types'
import { defaultStateValues, getFallbackTemplateDefinition, templateCatalog } from '~/domains/program/lib/templates'
import {
  parseTemplateDefinition,
  validateRequiredState,
  validateTemplateDefinition,
  type TemplateDefinition,
} from '~/domains/program/lib/template-engine'
import {
  buildCustomProgramTemplateDefinition,
  type CustomProgramBuilderInput,
} from '~/domains/program/lib/custom-templates'
import { buildMovementSwapOptions, defaultMovementReplacementRules, getMovementName, movementCatalog } from '~/domains/movement/lib/movements'
import { buildProgramStartPreview } from '~/domains/program/lib/program-start-preview'
import { ensureProfile, normalizeProgramStateDefaults } from '~/domains/account/server/profile-functions'
import { getMovementCatalogForSwap, getReplacementRulesForSwap } from '~/domains/movement/server/movement-functions'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

async function getSupabaseServerClient() {
  const { getSupabaseServerClient } = await import('~/shared/server/supabase')
  return getSupabaseServerClient()
}

function validProgramStateValues(
  definition: TemplateDefinition,
  stateValues: ProgramStateInput[],
): Array<ProgramStateInput & { value: number }> {
  const requiredKeys = new Set(definition.requiredState.map((state) => state.key))
  const requiredStateValues = stateValues.filter((state) => requiredKeys.has(state.key))
  validateRequiredState(definition, requiredStateValues)
  return requiredStateValues.map((state) => {
    const value = Number(state.value)
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Missing valid programme state for ${state.label ?? getMovementName(state.movementId)}`)
    }
    return { ...state, value }
  })
}

function normalizeTemplateSource(row: any): ProgramTemplateSummary['source'] {
  if (row.source === 'custom_import') return 'custom_program'
  if (row.source === 'healthy_531') return 'training_max_wave'
  if (row.source === 'bromley_base_strength') {
    return row.id === 'bromley-70s-powerlifter' || row.id === 'bromley-volume-intensity'
      ? 'volume_strength'
      : 'wave_powerbuilding'
  }
  if (
    row.source === 'linear_strength' ||
    row.source === 'training_max_wave' ||
    row.source === 'wave_powerbuilding' ||
    row.source === 'volume_strength' ||
    row.source === 'custom_program'
  ) {
    return row.source
  }
  return 'linear_strength'
}

function sourceLabelFor(source: ProgramTemplateSummary['source']) {
  if (source === 'custom_program') return 'Custom'
  if (source === 'linear_strength') return 'Linear Strength'
  if (source === 'training_max_wave') return 'Training Max Wave'
  if (source === 'wave_powerbuilding') return 'Wave Powerbuilding'
  return 'Volume Strength'
}

function normalizeTemplateOrigin(row: any, source: ProgramTemplateSummary['source']): ProgramTemplateOrigin {
  if (row.origin === 'user_created' || source === 'custom_program') return 'user_created'
  if (row.origin === 'licensed_partner') return 'licensed_partner'
  return 'system_default'
}

function mapTemplateRow(row: any, available = true, definition?: TemplateDefinition | null): ProgramTemplateSummary {
  const source = normalizeTemplateSource(row)
  const origin = normalizeTemplateOrigin(row, source)
  return {
    id: row.id,
    name: row.name,
    source,
    sourceLabel: sourceLabelFor(source),
    origin,
    description: row.description,
    daysPerWeek: row.days_per_week,
    progressionLabel: row.progression_label,
    complexity: row.complexity,
    tags: row.tags ?? [],
    requiredState: definition?.requiredState ?? [],
    available,
  }
}

function templateVersionIdFromRows(rows: any[]) {
  const version = rows[0]
  if (!version?.id) throw new Error('Template version missing')
  return version.id as string
}

function templateDefinitionFromRows(rows: any[]) {
  const version = rows[0]
  if (!version?.definition) throw new Error('Template definition missing')
  try {
    return parseTemplateDefinition(version.definition)
  } catch (error) {
    if (version.template_id) return getFallbackTemplateDefinition(version.template_id)
    throw error
  }
}

async function getPinnedTemplateDefinition(
  supabase: any,
  templateVersionId: string,
  templateId: string,
): Promise<TemplateDefinition> {
  const { data, error } = await supabase
    .from('program_template_versions')
    .select('id, template_id, definition')
    .eq('id', templateVersionId)
    .eq('template_id', templateId)
    .single()
  if (error) throw new Error(error.message)
  try {
    return parseTemplateDefinition(data.definition)
  } catch {
    return getFallbackTemplateDefinition(templateId)
  }
}

async function getLatestTemplateVersion(
  supabase: any,
  templateId: string,
): Promise<{ id: string; definition: TemplateDefinition }> {
  const { data, error } = await supabase
    .from('program_template_versions')
    .select('id, template_id, definition')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return {
    id: templateVersionIdFromRows(data ?? []),
    definition: templateDefinitionFromRows(data ?? []),
  }
}

function mapProgramMovementOverride(row: any): ProgramMovementOverride {
  return {
    id: row.id,
    programInstanceId: row.program_instance_id,
    slotId: row.slot_id,
    phaseKey: row.phase_key,
    role: row.role,
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

export function normalizeCustomizationSummary(input: unknown): ProgramCustomizationSummary {
  if (!input || typeof input !== 'object') return defaultCustomizationSummary()
  const value = input as Record<string, unknown>
  return {
    movementOverrideCount: Number(value.movementOverrideCount ?? 0),
    accessoryAdditionCount: Number(value.accessoryAdditionCount ?? 0),
  }
}

function mapProgramAccessoryAddition(row: any): ProgramAccessoryAddition {
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
    sets: Array.isArray(row.sets) ? row.sets : [],
    note: row.note,
    progressionMethod: row.progression_method ?? 'history_only',
    effectiveFromWeekIndex: Number(row.effective_from_week_index),
    orderIndex: Number(row.order_index),
  }
}

function resolveTemplateMovementId(
  movementId: TemplateDefinition['sessions'][number]['slots'][number]['movementId'],
  phaseKey: string,
) {
  if (typeof movementId === 'string') return movementId
  return movementId.byPhase?.[phaseKey] ?? movementId.default
}

function uniqueTemplatePhases(definition: TemplateDefinition) {
  const phases = new Map<string, string>()
  for (const week of definition.weeks) {
    if (!phases.has(week.phaseKey)) phases.set(week.phaseKey, week.phaseLabel)
  }
  return Array.from(phases.entries()).map(([phaseKey, phaseLabel]) => ({ phaseKey, phaseLabel }))
}

function firstWeekForPhase(definition: TemplateDefinition, phaseKey: string) {
  return definition.weeks.find((week) => week.phaseKey === phaseKey) ?? definition.weeks[0]
}

function sourceLabelForAccessoryPrescription(movementId: string, targetSummary: string) {
  return `${getMovementName(movementId)} plan · ${targetSummary}`
}

function buildProgramSetupOptions({
  template,
  definition,
  catalog,
  rules,
}: {
  template: ProgramTemplateSummary
  definition: TemplateDefinition
  catalog: Record<string, Movement>
  rules: MovementReplacementRule[]
}): ProgramSetupOptions {
  const phases = uniqueTemplatePhases(definition)
  const accessoryCatalog = Object.values(catalog)
    .filter((movement) => !movement.isCompetition)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((movement) => ({
      movementId: movement.id,
      movementName: movement.name,
      category: movement.category,
      equipment: movement.equipment,
    }))

  return {
    templateId: template.id,
    templateName: template.name,
    origin: template.origin,
    previewWeeks: buildProgramStartPreview({
      templateId: template.id,
      definition,
      catalog,
      rules,
    }),
    accessoryCatalog,
    sessions: definition.sessions.map((session) => {
      const accessoryPrescriptions = session.slots
        .filter((slot) => slot.role === 'accessory')
        .map((slot) => {
          const phase = phases[0]
          const week = firstWeekForPhase(definition, phase?.phaseKey ?? definition.weeks[0]?.phaseKey ?? 'cycle')
          const movementId = resolveTemplateMovementId(slot.movementId, week.phaseKey)
          const prescription = week.prescriptions[slot.prescriptionId]
          return {
            sourceSlotId: slot.id,
            label: sourceLabelForAccessoryPrescription(movementId, prescription?.targetSummary ?? 'Accessory work'),
            prescriptionId: slot.prescriptionId,
            targetSummary: prescription?.targetSummary ?? 'Accessory work',
          }
        })

      const slots = session.slots.flatMap((slot) => {
        if (slot.role !== 'variation' && slot.role !== 'accessory') return []
        const slotId = `slot-${session.id}-${slot.id}`
        const phaseRows = phases.map((phase) => {
          const week = firstWeekForPhase(definition, phase.phaseKey)
          const movementId = resolveTemplateMovementId(slot.movementId, phase.phaseKey)
          const prescription = week.prescriptions[slot.prescriptionId]
          return {
            phaseKey: phase.phaseKey,
            phaseLabel: phase.phaseLabel,
            movementId,
            targetSummary: prescription?.targetSummary ?? slot.targetSummary ?? 'Planned work',
          }
        })
        const uniqueMovementIds = new Set(phaseRows.map((phase) => phase.movementId))
        const rows =
          slot.role === 'accessory' && uniqueMovementIds.size === 1
            ? [{
                phaseKey: '*',
                phaseLabel: 'All phases',
                movementId: phaseRows[0]?.movementId ?? resolveTemplateMovementId(slot.movementId, phases[0]?.phaseKey ?? 'cycle'),
                targetSummary: phaseRows[0]?.targetSummary ?? slot.targetSummary ?? 'Accessory work',
              }]
            : phaseRows

        return rows.map((row) => ({
          sessionId: session.id,
          sessionTitle: session.title,
          slotId,
          templateSlotId: slot.id,
          phaseKey: row.phaseKey,
          phaseLabel: row.phaseLabel,
          role: slot.role as 'variation' | 'accessory',
          defaultMovementId: row.movementId,
          defaultMovementName: getMovementName(row.movementId),
          prescriptionId: slot.prescriptionId,
          targetSummary: row.targetSummary,
          replacementOptions: buildMovementSwapOptions({
            movementId: row.movementId,
            role: slot.role,
            templateId: template.id,
            phaseKey: row.phaseKey === '*' ? null : row.phaseKey,
            slotId,
            catalog,
            rules,
          }).filter((option) => option.allowedScopes.includes('phase_slot')),
        }))
      })

      return {
        id: session.id,
        title: session.title,
        slots,
        accessoryPrescriptions,
      }
    }),
  }
}

export async function getActiveProgramInternal(): Promise<ProgramInstance | null> {
  const { supabase, user } = await requireUser()
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
    status: instance.status,
    startDate: instance.start_date,
    units: instance.units,
    rounding: Number(instance.rounding),
    currentWeekIndex: instance.current_week_index,
    customizationStatus: instance.customization_status ?? 'default',
    customizationSummary: normalizeCustomizationSummary(instance.customization_summary),
    stateValues: (stateRows ?? []).map((state: any) => ({
      key: state.key,
      movementId: state.movement_id,
      type: state.state_type,
      label: state.label,
      value: Number(state.value),
      unit: state.unit ?? instance.units,
    })),
    movementOverrides: (movementOverrides ?? []).map(mapProgramMovementOverride),
    accessoryAdditions: (accessoryAdditions ?? []).map(mapProgramAccessoryAddition),
    templateDefinition,
  }
}

export async function getPendingDecisionsInternal(programInstanceId?: string) {
  const { supabase, user } = await requireUser()
  let query = supabase
    .from('progression_decisions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (programInstanceId) query = query.eq('program_instance_id', programInstanceId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapProgressionDecision)
}

export function mapProgressionDecision(row: any): ProgressionDecision {
  return {
    id: row.id,
    movementId: row.movement_id,
    movementName: getMovementName(row.movement_id),
    stateKey: row.state_key,
    stateType: row.state_type,
    ruleId: row.rule_id,
    scope: row.scope,
    status: row.status,
    inputSummary: row.input_summary,
    recommendation: row.recommendation,
    previousValue: row.previous_value === null ? null : Number(row.previous_value),
    recommendedValue: row.recommended_value === null ? null : Number(row.recommended_value),
  }
}

export async function updateProgramCurrentWeekIndex(supabase: any, userId: string, program: ProgramInstance) {
  const { error } = await supabase
    .from('program_instances')
    .update({ current_week_index: program.currentWeekIndex })
    .eq('id', program.id)
    .eq('user_id', userId)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
}

export const listTemplatesFn = createServerFn({ method: 'GET' }).handler(async () => {
  if (!(await hasSupabaseEnv())) return templateCatalog
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from('program_templates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error || !data?.length) return templateCatalog

  const { data: versions, error: versionError } = await supabase
    .from('program_template_versions')
    .select('template_id, definition, created_at')
    .order('created_at', { ascending: false })
  if (versionError) throw new Error(versionError.message)

  const latestByTemplateId = new Map<string, any>()
  for (const version of versions ?? []) {
    if (!latestByTemplateId.has(version.template_id)) latestByTemplateId.set(version.template_id, version)
  }

  const seeded = data.map((row: any) => {
    const latestDefinition = latestByTemplateId.get(row.id)?.definition
    const validation = validateTemplateDefinition(latestDefinition)
    if (validation.ok) return mapTemplateRow(row, true, validation.definition)
    try {
      return mapTemplateRow(row, true, getFallbackTemplateDefinition(row.id))
    } catch {
      return mapTemplateRow(row, false, null)
    }
  })
  const missing = templateCatalog.filter((template) => !seeded.some((row) => row.id === template.id))
  return [...seeded, ...missing]
})

export const getProgramSetupOptionsFn = createServerFn({ method: 'GET' })
  .validator((data: { templateId: string }) => data)
  .handler(async ({ data }): Promise<ProgramSetupOptions> => {
    if (!(await hasSupabaseEnv())) {
      const template = templateCatalog.find((item) => item.id === data.templateId)
      if (!template) throw new Error('Template not found')
      return buildProgramSetupOptions({
        template,
        definition: getFallbackTemplateDefinition(data.templateId),
        catalog: movementCatalog,
        rules: defaultMovementReplacementRules,
      })
    }

    const supabase = await getSupabaseServerClient()
    const { data: templateRow, error: templateError } = await supabase
      .from('program_templates')
      .select('*')
      .eq('id', data.templateId)
      .eq('is_active', true)
      .single()
    if (templateError) throw new Error(templateError.message)
    const template = mapTemplateRow(templateRow)
    const [{ definition }, catalog, rules] = await Promise.all([
      getLatestTemplateVersion(supabase, data.templateId),
      getMovementCatalogForSwap(supabase),
      getReplacementRulesForSwap(supabase),
    ])
    return buildProgramSetupOptions({ template, definition, catalog, rules })
  })

function normalizeStartMovementOverrides(
  input: ProgramStartMovementOverrideInput[] | undefined,
  setupOptions: ProgramSetupOptions,
): Array<Omit<ProgramMovementOverride, 'id' | 'programInstanceId' | 'effectiveFromWeekIndex'> & { effectiveFromWeekIndex: number }> {
  const setupSlots = setupOptions.sessions.flatMap((session) => session.slots)
  const overrides = new Map<string, Omit<ProgramMovementOverride, 'id' | 'programInstanceId' | 'effectiveFromWeekIndex'> & { effectiveFromWeekIndex: number }>()

  for (const item of input ?? []) {
    if (item.replacementMovementId === item.originalMovementId) continue
    const setupSlot = setupSlots.find(
      (slot) => slot.slotId === item.slotId && slot.phaseKey === item.phaseKey && slot.role === item.role,
    )
    if (!setupSlot) throw new Error('Invalid customization slot.')
    if (setupSlot.defaultMovementId !== item.originalMovementId) {
      throw new Error('Customization no longer matches the selected template.')
    }
    const selectedOption = setupSlot.replacementOptions.find(
      (option) => option.movementId === item.replacementMovementId && option.allowedScopes.includes('phase_slot'),
    )
    if (!selectedOption) {
      throw new Error('This movement is not an allowed programme replacement for the selected slot.')
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
  const slug = sanitizeSlotPart(name.toLowerCase()).replace(/^-|-$/g, '').slice(0, 32) || 'programme'
  return `custom-${userId.slice(0, 8)}-${Date.now().toString(36)}-${slug}`
}

export const createCustomProgramTemplateFn = createServerFn({ method: 'POST' })
  .validator((data: CustomProgramBuilderInput) => data)
  .handler(async ({ data }): Promise<ProgramTemplateSummary> => {
    await ensureProfile()
    const { supabase, user } = await requireUser()
    const catalog = await getMovementCatalogForSwap(supabase)
    const generated = buildCustomProgramTemplateDefinition({
      input: data,
      templateId: customTemplateId(user.id, data.name),
      catalog,
    })

    const { data: templateRow, error: templateError } = await supabase
      .from('program_templates')
      .insert({
        id: generated.metadata.id,
        name: generated.metadata.name,
        source: 'custom_program',
        origin: 'user_created',
        created_by: user.id,
        description: generated.metadata.description,
        days_per_week: generated.metadata.daysPerWeek,
        progression_label: generated.metadata.progressionLabel,
        complexity: generated.metadata.complexity,
        schema_version: generated.definition.schemaVersion,
        tags: generated.metadata.tags,
        is_active: true,
      })
      .select('*')
      .single()
    if (templateError) throw new Error(templateError.message)

    const { error: versionError } = await supabase
      .from('program_template_versions')
      .insert({
        template_id: generated.metadata.id,
        version: '1',
        definition: generated.definition,
      })
    if (versionError) throw new Error(versionError.message)

    return mapTemplateRow(templateRow, true, generated.definition)
  })

function normalizeStartAccessoryAdditions(
  input: ProgramStartAccessoryAdditionInput[] | undefined,
  setupOptions: ProgramSetupOptions,
): Array<Omit<ProgramAccessoryAddition, 'id' | 'programInstanceId'>> {
  const additionsBySession = new Map<string, number>()
  const validMovements = new Set(setupOptions.accessoryCatalog.map((movement) => movement.movementId))

  return (input ?? []).map((item) => {
    const session = setupOptions.sessions.find((candidate) => candidate.id === item.sessionId)
    if (!session) throw new Error('Invalid accessory session.')
    const source = session.accessoryPrescriptions.find((candidate) => candidate.sourceSlotId === item.sourceSlotId)
    if (!source) throw new Error('Added accessories must copy an existing accessory prescription from the same session.')
    if (!validMovements.has(item.movementId)) throw new Error('Invalid accessory movement.')

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
  .validator(
    (data: {
      templateId: string
      title?: string
      units?: Unit
      rounding?: number
      stateValues?: ProgramStateInput[]
      movementOverrides?: ProgramStartMovementOverrideInput[]
      accessoryAdditions?: ProgramStartAccessoryAdditionInput[]
      replaceActiveProgram?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    const profile = await ensureProfile()
    const { supabase, user } = await requireUser()
    const { data: templateRow, error: templateError } = await supabase
      .from('program_templates')
      .select('*')
      .eq('id', data.templateId)
      .eq('is_active', true)
      .single()
    if (templateError) throw new Error(templateError.message)

    const template = mapTemplateRow(templateRow)
    const templateVersion = await getLatestTemplateVersion(supabase, data.templateId)
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
    const movementOverrides = normalizeStartMovementOverrides(data.movementOverrides, setupOptions)
    const accessoryAdditions = normalizeStartAccessoryAdditions(data.accessoryAdditions, setupOptions)
    const customizationSummary: ProgramCustomizationSummary = {
      movementOverrideCount: movementOverrides.length,
      accessoryAdditionCount: accessoryAdditions.length,
    }
    const customizationStatus =
      customizationSummary.movementOverrideCount || customizationSummary.accessoryAdditionCount
        ? 'customized'
        : 'default'
    const units = (data.units ?? profile.units) as Unit
    const rounding = data.rounding ?? Number(profile.rounding)
    const profileStateDefaults = normalizeProgramStateDefaults(profile.program_state_defaults, units)
    const stateValues = data.stateValues
      ? data.stateValues
      : defaultStateValues(
          units,
          templateVersion.definition.requiredState.filter(
            (state) => state.type !== 'training_max' && state.type !== 'working_load',
          ),
          profileStateDefaults,
        )
    const persistedStateValues = validProgramStateValues(templateVersion.definition, stateValues)

    const { data: activePrograms, error: activeProgramError } = await supabase
      .from('program_instances')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
    if (activeProgramError) throw new Error(activeProgramError.message)

    const { data: activeSessions, error: activeSessionError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
    if (activeSessionError) throw new Error(activeSessionError.message)

    const activeProgramIds = (activePrograms ?? []).map((program: any) => program.id as string)
    const activeSessionIds = (activeSessions ?? []).map((session: any) => session.id as string)
    if ((activeProgramIds.length || activeSessionIds.length) && !data.replaceActiveProgram) {
      throw new Error('Active program in progress')
    }

    if (activeSessionIds.length) {
      const { error: abandonError } = await supabase
        .from('workout_sessions')
        .update({ status: 'skipped' })
        .eq('user_id', user.id)
        .in('id', activeSessionIds)
      if (abandonError) throw new Error(abandonError.message)
    }

    await supabase
      .from('program_instances')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('status', 'active')

    const { data: instance, error } = await supabase
      .from('program_instances')
      .insert({
        user_id: user.id,
        template_id: data.templateId,
        template_version_id: templateVersion.id,
        title: data.title || template.name,
        units,
        rounding,
        current_block_id: templateVersion.definition.weeks[0]?.phaseKey ?? null,
        current_week_index: 0,
        customization_status: customizationStatus,
        customization_summary: customizationSummary,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    if (persistedStateValues.length) {
      const { error: stateInsertError } = await supabase.from('program_state_values').insert(
        persistedStateValues.map((state) => ({
          user_id: user.id,
          program_instance_id: instance.id,
          key: state.key,
          movement_id: state.movementId,
          state_type: state.type,
          label: state.label ?? null,
          value: state.value,
          unit: state.unit ?? units,
          metadata: { source: 'setup' },
        })),
      )
      if (stateInsertError) throw new Error(stateInsertError.message)
    }

    if (movementOverrides.length) {
      const { error: overrideError } = await supabase.from('program_movement_overrides').insert(
        movementOverrides.map((override) => ({
          user_id: user.id,
          program_instance_id: instance.id,
          slot_id: override.slotId,
          phase_key: override.phaseKey,
          role: override.role,
          original_movement_id: override.originalMovementId,
          replacement_movement_id: override.replacementMovementId,
          effective_from_week_index: override.effectiveFromWeekIndex,
        })),
      )
      if (overrideError) throw new Error(overrideError.message)
    }

    if (accessoryAdditions.length) {
      const { error: additionError } = await supabase.from('program_accessory_additions').insert(
        accessoryAdditions.map((addition) => ({
          user_id: user.id,
          program_instance_id: instance.id,
          session_id: addition.sessionId,
          slot_id: addition.slotId,
          phase_key: addition.phaseKey,
          movement_id: addition.movementId,
          prescription_id: addition.prescriptionId,
          source_slot_id: addition.sourceSlotId,
          effective_from_week_index: addition.effectiveFromWeekIndex,
          order_index: addition.orderIndex,
        })),
      )
      if (additionError) throw new Error(additionError.message)
    }
    return getActiveProgramInternal()
  })

export const getActiveProgramFn = createServerFn({ method: 'GET' }).handler(getActiveProgramInternal)

export const resolveProgressionDecisionFn = createServerFn({ method: 'POST' })
  .validator((data: { decisionId: string; action: 'accepted' | 'dismissed' | 'pending' }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { data: decision, error } = await supabase
      .from('progression_decisions')
      .select('*')
      .eq('id', data.decisionId)
      .eq('user_id', user.id)
      .single()
    if (error) throw new Error(error.message)
    if (data.action === 'pending') return decision

    const { error: updateError } = await supabase
      .from('progression_decisions')
      .update({ status: data.action, resolved_at: new Date().toISOString() })
      .eq('id', data.decisionId)
      .eq('user_id', user.id)
    if (updateError) throw new Error(updateError.message)

    if (data.action === 'accepted' && decision.recommended_value !== null && decision.state_key) {
      const { error: stateUpdateError } = await supabase
        .from('program_state_values')
        .update({ value: decision.recommended_value })
        .eq('user_id', user.id)
        .eq('program_instance_id', decision.program_instance_id)
        .eq('key', decision.state_key)
        .select('id')
        .single()
      if (stateUpdateError) throw new Error(stateUpdateError.message)
    }
    return getPendingDecisionsInternal(decision.program_instance_id)
  })
