import { createServerFn } from '@tanstack/react-start'
import {
  getActiveProgram,
  getPendingDecisions,
  resolveProgressionDecision,
  resolveProgressionDecisions,
  updateProgramCurrentWeekIndex as updateProgramCurrentWeekIndexData,
} from '@sheetless/data/program/active-program'
import {
  resolveProgressionDecisionInputSchema,
  resolveProgressionDecisionsInputSchema,
} from '~/domains/program/lib/schemas'
import { requireProgramUser } from '~/domains/program/server/program-server'
import type { ProgramInstance } from '~/domains/program'
import type { SupabaseServerClient } from '~/shared/server/supabase'

export {
  mapProgressionDecision,
  normalizeCustomizationSummary,
} from '@sheetless/data/program/active-program'

/** Web-signature shims: acquire the cookie-authenticated context themselves. */
export async function getActiveProgramInternal(): Promise<ProgramInstance | null> {
  return getActiveProgram(await requireProgramUser())
}

export async function getPendingDecisionsInternal(programInstanceId?: string) {
  return getPendingDecisions(await requireProgramUser(), programInstanceId)
}

// Compat: keeps the pre-extraction 3-arg signature until the session reads
// thread a ctx themselves (next extraction commit); the passed client is the
// same one requireProgramUser() re-acquires.
export async function updateProgramCurrentWeekIndex(
  _supabase: SupabaseServerClient,
  _userId: string,
  program: ProgramInstance,
): Promise<ProgramInstance> {
  return updateProgramCurrentWeekIndexData(await requireProgramUser(), program)
}

export const getActiveProgramFn = createServerFn({ method: 'GET' }).handler(
  getActiveProgramInternal,
)

export const resolveProgressionDecisionFn = createServerFn({ method: 'POST' })
  .validator((data) => resolveProgressionDecisionInputSchema.parse(data))
  .handler(async ({ data }) => resolveProgressionDecision(await requireProgramUser(), data))

export const resolveProgressionDecisionsFn = createServerFn({ method: 'POST' })
  .validator((data) => resolveProgressionDecisionsInputSchema.parse(data))
  .handler(async ({ data }) => resolveProgressionDecisions(await requireProgramUser(), data))
