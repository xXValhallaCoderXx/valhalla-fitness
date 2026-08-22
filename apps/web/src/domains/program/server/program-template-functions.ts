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
import { buildProgramSetupOptions } from '~/domains/program/server/program-setup'
import { getProgramSetupOptions, listTemplates } from '@sheetless/data/program/templates'
import {
  getProgramSupabaseClient,
  hasProgramSupabaseEnv,
} from '~/domains/program/server/program-server'

export const listTemplatesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    // Without Supabase env the static code catalog serves signed-out browsing.
    if (!(await hasProgramSupabaseEnv())) return templateCatalog
    const supabase = await getProgramSupabaseClient()
    const templates = await listTemplates(supabase)
    return templates.length ? templates : []
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
    return getProgramSetupOptions(supabase, data)
  })
