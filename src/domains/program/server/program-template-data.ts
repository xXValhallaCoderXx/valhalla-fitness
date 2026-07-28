import type { ProgramTemplateOrigin, ProgramTemplateSummary } from '~/domains/program'
import { applyFamilyMeta } from '~/domains/program/lib/template-families'
import { parseTemplateDefinition, validateTemplateDefinition } from '~/domains/program/lib/template-engine-schema'
import type { TemplateDefinition } from '~/domains/program/lib/template-engine'
import type { Tables } from '~/shared/types/database'
import type { SupabaseServerClient } from '~/shared/server/supabase'

function normalizeTemplateSource(
  row: Pick<Tables<'program_templates'>, 'id' | 'source'>,
): ProgramTemplateSummary['source'] {
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

function normalizeTemplateOrigin(
  row: Pick<Tables<'program_templates'>, 'origin'>,
  source: ProgramTemplateSummary['source'],
): ProgramTemplateOrigin {
  if (row.origin === 'user_created' || source === 'custom_program') return 'user_created'
  if (row.origin === 'licensed_partner') return 'licensed_partner'
  return 'system_default'
}

export function mapTemplateRow(
  row: Tables<'program_templates'>,
  available = true,
  definition?: TemplateDefinition | null,
): ProgramTemplateSummary {
  const source = normalizeTemplateSource(row)
  const origin = normalizeTemplateOrigin(row, source)
  return applyFamilyMeta({
    id: row.id,
    name: row.name,
    source,
    sourceLabel: sourceLabelFor(source),
    origin,
    description: row.description,
    daysPerWeek: row.days_per_week,
    progressionLabel: row.progression_label,
    complexity: row.complexity as ProgramTemplateSummary['complexity'],
    tags: row.tags ?? [],
    requiredState: definition?.requiredState ?? [],
    available,
  })
}

function templateVersionIdFromRows(
  rows: Array<Pick<Tables<'program_template_versions'>, 'id'>>,
) {
  const version = rows[0]
  if (!version?.id) throw new Error('Template version missing')
  return version.id
}

function templateDefinitionFromRows(
  rows: Array<Pick<Tables<'program_template_versions'>, 'definition' | 'template_id'>>,
) {
  const version = rows[0]
  if (!version?.definition) throw new Error('Template definition missing')
  try {
    return parseTemplateDefinition(version.definition)
  } catch {
    throw new Error('PINNED_TEMPLATE_INVALID')
  }
}

export async function getPinnedTemplateDefinition(
  supabase: SupabaseServerClient,
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
    throw new Error('PINNED_TEMPLATE_INVALID')
  }
}

export async function getLatestTemplateVersion(
  supabase: SupabaseServerClient,
  templateId: string,
): Promise<{
  id: string
  definition: TemplateDefinition
  definitionChecksum: string
}> {
  const { data, error } = await supabase
    .from('program_template_versions')
    .select('id, template_id, definition, definition_checksum')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return {
    id: templateVersionIdFromRows(data ?? []),
    definition: templateDefinitionFromRows(data ?? []),
    definitionChecksum: data?.[0]?.definition_checksum ?? '',
  }
}

export function latestTemplateSummaries(
  templates: Tables<'program_templates'>[],
  versions: Array<
    Pick<
      Tables<'program_template_versions'>,
      'template_id' | 'definition' | 'created_at'
    >
  >,
) {
  const latestByTemplateId = new Map<
    string,
    Pick<
      Tables<'program_template_versions'>,
      'template_id' | 'definition' | 'created_at'
    >
  >()
  for (const version of versions) {
    if (!latestByTemplateId.has(version.template_id)) {
      latestByTemplateId.set(version.template_id, version)
    }
  }

  return templates.map((row) => {
    const latestDefinition = latestByTemplateId.get(row.id)?.definition
    const validation = validateTemplateDefinition(latestDefinition)
    if (validation.ok) return mapTemplateRow(row, true, validation.definition)
    return mapTemplateRow(row, false, null)
  })
}
