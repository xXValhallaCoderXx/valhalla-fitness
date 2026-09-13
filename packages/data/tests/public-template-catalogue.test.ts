import { describe, expect, it } from 'vitest'
import { getProgramSetupOptions, listTemplates } from '@sheetless/data/program/templates'
import { getFallbackTemplateDefinition } from '@sheetless/domain/program/templates'
import { freeWeightPolicyV1 } from '@sheetless/domain/movement/movements'
import { makeStubCtx } from './support/supabase-stub'

const templateId = 'generic_alternating_5x5_lp'
const definition = getFallbackTemplateDefinition(templateId)
// Only the public projection is present: no owner, parent, or internal metadata.
const template = {
  id: templateId, name: 'Public beginner plan', source: 'linear_strength', origin: 'system_default',
  description: 'Three days of linear progression', days_per_week: 3, progression_label: 'Linear',
  complexity: 'beginner', tags: ['strength'], is_active: true,
}

function catalogue() {
  return makeStubCtx({
    program_templates: [template],
    program_template_versions: [
      { id: 'older', template_id: templateId, created_at: '2026-01-01', definition: {} },
      { id: 'latest', template_id: templateId, created_at: '2026-02-01', definition, definition_checksum: 'published' },
    ],
    movements: [],
    movement_replacement_rules: [],
    equipment_mode_policy_versions: [{
      id: freeWeightPolicyV1.id, mode: 'free_weight', version: freeWeightPolicyV1.version,
      definition: { rules: freeWeightPolicyV1.rules }, definition_checksum: freeWeightPolicyV1.checksum,
      created_at: '2026-01-01',
    }],
  })
}

describe('public template projection', () => {
  it('builds available catalogue summaries from projected metadata and the latest definition', async () => {
    const { ctx } = catalogue()
    const result = await listTemplates(ctx.supabase)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: templateId, name: template.name, origin: 'system_default', available: true,
      requiredState: definition.requiredState,
    })
    expect(result[0]).not.toHaveProperty('created_by')
  })

  it('builds a real typical-week preview without ownership metadata', async () => {
    const { ctx } = catalogue()
    const result = await getProgramSetupOptions(ctx.supabase, { templateId })
    expect(result.templateId).toBe(templateId)
    expect(result.previewWeeks[0].sessions).toHaveLength(definition.sessions.length)
    expect(result.previewWeeks[0].sessions[0].movementSummary).toContain('Squat')
    expect(result.freeWeightPolicy?.id).toBe(freeWeightPolicyV1.id)
  })
})
