import { useMemo } from 'react'
import { buildCustomProgramTemplateDefinition } from '~/domains/program/lib/custom-templates'
import type { CustomProgramBuilderInput } from '~/domains/program/lib/custom-program-meta'
import type { TemplateDefinition } from '~/domains/program'

/**
 * The definition the wizard's answers currently produce.
 *
 * `buildCustomProgramTemplateDefinition` normalises and validates, and throws on a draft that is
 * not yet a programme — a half-answered wizard is the normal case here, not an error, so the throw
 * is caught and reported as "not yet" rather than surfaced as a failure.
 */
export function useDraftDefinition(draft: CustomProgramBuilderInput): {
  definition: TemplateDefinition | null
  problem: string | null
} {
  return useMemo(() => {
    try {
      const generated = buildCustomProgramTemplateDefinition({ input: draft, templateId: 'draft' })
      return { definition: generated.definition, problem: null }
    } catch (error) {
      return { definition: null, problem: error instanceof Error ? error.message : 'Draft is incomplete.' }
    }
  }, [draft])
}
