import { z } from 'zod'
import { buildProgramSetupSuggestions } from '@sheetless/domain/program/setup-suggestions'
import { getHistoryInputs } from '../history/history'
import { normalizeProgramStateDefaults } from '../account/profile'
import type { UserContext } from '../shared/context'
import { getLatestTemplateVersion } from './template-data'

/** A read-only snapshot shared by personal preview and setup; a history failure is recoverable. */
export async function getProgramSetupSuggestions(ctx: UserContext, input: { templateId: string }) {
  const templateId = z.string().min(1).parse(input.templateId)
  const [{ data: profile, error }, version, history] = await Promise.all([
    ctx.supabase.from('profiles').select('units, rounding, program_state_defaults').eq('id', ctx.user.id).single(),
    getLatestTemplateVersion(ctx.supabase, templateId),
    getHistoryInputs(ctx.supabase, ctx.user.id, { includeFavorites: false, includeSubstitutions: false })
      .then((value) => ({ value, failed: false }), () => ({ value: null, failed: true })),
  ])
  if (error) throw new Error(error.message)
  if (!profile) throw new Error('Your profile could not be loaded.')
  const units = profile.units === 'lb' ? 'lb' : 'kg'
  const rounding = Number(profile.rounding) > 0 ? Number(profile.rounding) : units === 'lb' ? 5 : 2.5
  return buildProgramSetupSuggestions({
    templateId, requiredState: version.definition.requiredState, units, rounding,
    defaults: normalizeProgramStateDefaults(profile.program_state_defaults, units),
    sessions: history.value?.sessions ?? [], historyStatus: history.failed ? 'unavailable' : 'ready',
  })
}
