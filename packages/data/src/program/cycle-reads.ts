import { cycleBoundarySchema } from '@sheetless/domain/program/cycle-schemas'
import type { Tables } from '@sheetless/domain/shared/types/database'
import type { UserContext } from '../shared/context'

export function mapCycleBoundary(row: Tables<'program_cycle_boundaries'>) {
  return cycleBoundarySchema.parse({
    id: row.id, programId: row.program_instance_id, sessionId: row.session_id,
    templateVersionId: row.template_version_id, cycleNumber: row.cycle_number,
    nextSessionIndex: row.next_session_index, completedAt: row.completed_at,
    status: row.status, resolvedAt: row.resolved_at,
  })
}

export async function getPendingCycleBoundary(ctx: UserContext, programId: string) {
  const { data, error } = await ctx.supabase.from('program_cycle_boundaries').select('*')
    .eq('user_id', ctx.user.id).eq('program_instance_id', programId).eq('status', 'pending').maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapCycleBoundary(data) : null
}

export async function getSessionCycleBoundary(ctx: UserContext, sessionId: string) {
  const { data, error } = await ctx.supabase.from('program_cycle_boundaries').select('*')
    .eq('user_id', ctx.user.id).eq('session_id', sessionId).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapCycleBoundary(data) : null
}

