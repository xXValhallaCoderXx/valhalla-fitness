import { createServerFn } from '@tanstack/react-start'
import type { ProgramSetupOptions } from '~/domains/program'
import {
  defaultMovementReplacementRules,
  freeWeightPolicyV1,
  movementCatalog,
} from '~/domains/movement/lib/movements'
import {
  getFallbackTemplateDefinition,
  templateCatalog,
} from '~/domains/program/lib/templates'
import { programSetupOptionsInputSchema } from '~/domains/program/lib/schemas'
import {
  getMovementCatalogForSwap,
  getReplacementRulesForSwap,
} from '~/domains/movement/server/movement-functions'
import {
  getLatestTemplateVersion,
  getLatestFreeWeightPolicyVersion,
  latestTemplateSummaries,
  mapTemplateRow,
} from '~/domains/program/server/program-template-data'
import { buildProgramSetupOptions } from '~/domains/program/server/program-setup'
import {
  getProgramSupabaseClient,
  hasProgramSupabaseEnv,
} from '~/domains/program/server/program-server'

export const listTemplatesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    if (!(await hasProgramSupabaseEnv())) return templateCatalog
    const supabase = await getProgramSupabaseClient()
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
  },
)

export const getProgramSetupOptionsFn = createServerFn({ method: 'GET' })
  .validator((data) => programSetupOptionsInputSchema.parse(data))
  .handler(async ({ data }): Promise<ProgramSetupOptions> => {
    if (!(await hasProgramSupabaseEnv())) {
      const template = templateCatalog.find(
        (item) => item.id === data.templateId,
      )
      if (!template) throw new Error('Template not found')
      return buildProgramSetupOptions({
        template,
        definition: getFallbackTemplateDefinition(data.templateId),
        catalog: movementCatalog,
        rules: defaultMovementReplacementRules,
        freeWeightPolicy: freeWeightPolicyV1,
      })
    }

    const supabase = await getProgramSupabaseClient()
    const { data: templateRow, error: templateError } = await supabase
      .from('program_templates')
      .select('*')
      .eq('id', data.templateId)
      .eq('is_active', true)
      .single()
    if (templateError) throw new Error(templateError.message)
    const template = mapTemplateRow(templateRow)
    const [{ definition }, catalog, rules, freeWeightPolicy] = await Promise.all([
      getLatestTemplateVersion(supabase, data.templateId),
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
  })
