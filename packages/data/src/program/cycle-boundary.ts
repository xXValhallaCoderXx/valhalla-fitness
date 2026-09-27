import type { z } from 'zod'
import { cycleReviewInputSchema, repeatCycleInputSchema, repeatCycleReceiptSchema } from '@sheetless/domain/program/cycle-schemas'
import type { UserContext } from '../shared/context'
import { getActiveProgram, getPendingDecisions } from './active-program'
export { getPendingCycleBoundary, getSessionCycleBoundary } from './cycle-reads'

/** Every action sheet reads current state rather than trusting a historical recap. */
export async function getCycleReview(ctx: UserContext, input: z.input<typeof cycleReviewInputSchema>) {
  const { programId, boundaryId } = cycleReviewInputSchema.parse(input)
  const program = await getActiveProgram(ctx)
  if (program?.id !== programId || program.cycleBoundary?.id !== boundaryId) return null
  const [pendingDecisions, active] = await Promise.all([
    getPendingDecisions(ctx, programId),
    ctx.supabase.from('workout_sessions').select('id').eq('user_id', ctx.user.id).eq('status', 'in_progress').limit(1).maybeSingle(),
  ])
  if (active.error) throw new Error(active.error.message)
  return { program, boundary: program.cycleBoundary, pendingDecisions, activeSessionId: active.data?.id ?? null }
}

export async function repeatProgramCycle(ctx: UserContext, input: z.input<typeof repeatCycleInputSchema>) {
  const data = repeatCycleInputSchema.parse(input)
  if (ctx.user.id !== data.expectedUserId) throw new Error('ACCOUNT_CHANGED')
  const { data: response, error } = await ctx.supabase.rpc('repeat_program_cycle_v1', {
    p_program_id: data.programId, p_boundary_id: data.boundaryId,
    p_expected_version: data.expectedVersion, p_request_id: data.requestId, p_expected_user_id: data.expectedUserId,
  })
  if (error) throw new Error(error.message)
  const receipt = repeatCycleReceiptSchema.parse(response)
  if (receipt.programId !== data.programId || receipt.boundaryId !== data.boundaryId || receipt.stateVersion !== data.expectedVersion + 1) {
    throw new Error('The cycle receipt did not match. Retry the same request to confirm the result.')
  }
  return receipt
}
