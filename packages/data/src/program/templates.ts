import type { z } from 'zod'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { programSetupOptionsInputSchema } from '@sheetless/domain/program/schemas'
import { buildProgramSetupOptions } from '@sheetless/domain/program/program-setup-options'
import type { DataClient } from '../shared/context'
import { getMovementCatalogForSwap, getReplacementRulesForSwap } from '../movement/catalog'
import {
  getLatestTemplateVersion,
  getLatestFreeWeightPolicyVersion,
  latestTemplateSummaries,
  mapTemplateRow,
} from './template-data'

/**
 * Template browsing is deliberately unauthenticated — the caller passes
 * whichever anon client its shell owns, so signed-out visitors can browse.
 */
export async function listTemplates(supabase: DataClient): Promise<ProgramTemplateSummary[]> {
  const { data, error } = await supabase
    .from('program_templates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  if (!data?.length) return []

  const { data: versions, error: versionError } = await supabase
    .from('program_template_versions')
    .select('template_id, definition, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (versionError) throw new Error(versionError.message)

  return latestTemplateSummaries(data, versions ?? [])
}

export async function getProgramSetupOptions(
  supabase: DataClient,
  data: z.infer<typeof programSetupOptionsInputSchema>,
): Promise<ProgramSetupOptions> {
  const input = programSetupOptionsInputSchema.parse(data)
  const { data: templateRow, error: templateError } = await supabase
    .from('program_templates')
    .select('*')
    .eq('id', input.templateId)
    .eq('is_active', true)
    .single()
  if (templateError) throw new Error(templateError.message)
  const template = mapTemplateRow(templateRow)
  const [{ definition }, catalog, rules, freeWeightPolicy] = await Promise.all([
    getLatestTemplateVersion(supabase, input.templateId),
    getMovementCatalogForSwap(supabase),
    getReplacementRulesForSwap(supabase),
    getLatestFreeWeightPolicyVersion(supabase),
  ])
  return buildProgramSetupOptions({
    template,
    definition,
    catalog,
    rules,
    freeWeightPolicy,
  })
}
