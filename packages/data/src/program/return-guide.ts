import type { z } from 'zod'
import { changeReturnInputSchema } from '@sheetless/domain/program/return-schemas'
import type { Json } from '@sheetless/domain/shared/types/database'
import { returnSettingsSchema } from '@sheetless/domain/program/return-settings'
import { buildReturnPreview } from '@sheetless/domain/program/return-preview'
import type { ProgramLoadChange } from '@sheetless/domain/program/types'
import { getActiveProgram, getPendingDecisions } from './active-program'
import type { UserContext } from '../shared/context'
import { getReturnBaseline } from './return-baseline'

export async function getReturnGuide(ctx: UserContext) {
  const program = await getActiveProgram(ctx)
  if (!program) throw new Error('Choose a programme before starting a return guide.')
  const [pending, active, baseline, last] = await Promise.all([
    getPendingDecisions(ctx, program.id),
    ctx.supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', ctx.user.id)
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle(),
    getReturnBaseline(ctx, program),
    ctx.supabase
      .from('workout_sessions')
      .select('scheduled_date')
      .eq('user_id', ctx.user.id)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (active.error || last.error) throw new Error((active.error ?? last.error)!.message)
  return {
    program,
    baseline,
    pendingDecisions: pending,
    pendingDecisionIds: pending.map((decision) => decision.id).sort(),
    hasActiveSession: Boolean(active.data),
    lastWorkoutLogged: last.data?.scheduled_date ?? null,
  }
}

export async function previewProgramReturn(
  ctx: UserContext,
  input: Parameters<typeof buildReturnPreview>[1],
) {
  const state = await getReturnGuide(ctx)
  return { ...state, ...buildReturnPreview(state.program, input) }
}

export async function changeProgramReturn(
  ctx: UserContext,
  input: z.input<typeof changeReturnInputSchema>,
) {
  const data = changeReturnInputSchema.parse(input)
  const { error } = await ctx.supabase.rpc('change_program_return_v1', {
    p_program_id: data.programId,
    p_expected_version: data.expectedVersion,
    p_request_id: data.requestId,
    p_action: data.action,
    p_settings: data.settings as unknown as Json,
    p_changes: data.changes as unknown as Json,
    p_pending_decision_ids: data.pendingDecisionIds,
  })
  if (error) throw new Error(error.message)
  return { programId: data.programId }
}

type ReturnChangeInput = z.input<typeof changeReturnInputSchema>
export function applyProgramReturn(ctx: UserContext, input: Omit<ReturnChangeInput, 'action'>) {
  return changeProgramReturn(ctx, { ...input, action: 'apply' })
}
export function updateProgramReturn(
  ctx: UserContext,
  input: Omit<ReturnChangeInput, 'action'> & { action?: 'update' | 'extend' },
) {
  return changeProgramReturn(ctx, { ...input, action: input.action ?? 'update' })
}
export function resolveProgramReturn(ctx: UserContext, input: Omit<ReturnChangeInput, 'action'>) {
  return changeProgramReturn(ctx, { ...input, action: 'end' })
}

export function returnChangeInput(
  state: Awaited<ReturnType<typeof getReturnGuide>>,
  settings: z.infer<typeof returnSettingsSchema>,
  changes: ProgramLoadChange[],
  action: z.infer<typeof changeReturnInputSchema>['action'],
  requestId: string,
) {
  return changeReturnInputSchema.parse({
    programId: state.program.id,
    expectedVersion: state.program.stateVersion,
    requestId,
    action,
    settings,
    changes: action === 'end' ? [] : changes,
    pendingDecisionIds: state.pendingDecisionIds,
  })
}
