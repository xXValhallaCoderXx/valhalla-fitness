import { z } from 'zod'
import { endProgramInputSchema, endProgramReceiptSchema, type EndedProgramSummary, type ProgramEndState } from '@sheetless/domain/program/ending'
import type { UserContext } from '../shared/context'

export async function getLastEndedProgram(ctx: UserContext): Promise<EndedProgramSummary | null> {
  const { data, error } = await ctx.supabase.from('program_instances')
    .select('id,title,ended_at,units').eq('user_id', ctx.user.id)
    .eq('status', 'completed').eq('end_reason', 'manual').not('ended_at', 'is', null)
    .order('ended_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.ended_at ? { id: data.id, title: data.title, endedAt: data.ended_at, units: data.units === 'lb' ? 'lb' : 'kg' } : null
}

export async function getProgramEndState(ctx: UserContext, programId: string): Promise<ProgramEndState> {
  const id = z.uuid().parse(programId)
  const [program, session, pending] = await Promise.all([
    ctx.supabase.from('program_instances').select('id,title,status,state_version')
      .eq('user_id', ctx.user.id).eq('id', id).single(),
    ctx.supabase.from('workout_sessions').select('id').eq('user_id', ctx.user.id)
      .eq('program_instance_id', id).eq('status', 'in_progress').limit(1).maybeSingle(),
    ctx.supabase.from('progression_decisions').select('id').eq('user_id', ctx.user.id)
      .eq('program_instance_id', id).eq('status', 'pending').limit(1).maybeSingle(),
  ])
  const error = program.error ?? session.error ?? pending.error
  if (error) throw new Error(error.message)
  if (!program.data) throw new Error('This plan is unavailable.')
  return { id, title: program.data.title, status: program.data.status, stateVersion: program.data.state_version,
    activeSessionId: session.data?.id ?? null, hasPendingDecisions: Boolean(pending.data) }
}

export async function endProgram(ctx: UserContext, input: z.input<typeof endProgramInputSchema>) {
  const data = endProgramInputSchema.parse(input)
  const { data: response, error } = await ctx.supabase.rpc('end_program_v1', {
    p_program_id: data.programId, p_expected_version: data.expectedVersion, p_request_id: data.requestId,
  })
  if (error) throw new Error(error.message)
  const receipt = endProgramReceiptSchema.parse(response)
  if (receipt.programId !== data.programId || receipt.stateVersion !== data.expectedVersion + 1) {
    throw new Error('The plan end receipt did not match this request. Retry to confirm the result.')
  }
  return receipt
}
