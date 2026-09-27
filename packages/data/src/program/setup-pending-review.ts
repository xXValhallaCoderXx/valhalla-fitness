import { z } from 'zod'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { Unit } from '@sheetless/domain/shared/types'
import type { UserContext } from '../shared/context'
import { mapProgressionDecision } from './active-program'

export type ProgramSetupPendingReview = {
  programId: string; title: string; units: Unit; decisions: ProgressionDecision[]
}

/** Review may include an older plan: never label its numbers with today's profile units. */
export async function getProgramSetupPendingReview(ctx: UserContext, decisionIds: string[]): Promise<ProgramSetupPendingReview[]> {
  const ids = [...new Set(z.array(z.uuid()).parse(decisionIds))]
  if (!ids.length) return []
  const { data: decisions, error } = await ctx.supabase.from('progression_decisions').select('*')
    .eq('user_id', ctx.user.id).eq('status', 'pending').in('id', ids).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  if (!decisions?.length) return []
  const programIds = [...new Set(decisions.map(decision => decision.program_instance_id))]
  const { data: programs, error: programError } = await ctx.supabase.from('program_instances').select('id, title, units')
    .eq('user_id', ctx.user.id).in('id', programIds)
  if (programError) throw new Error(programError.message)
  const groups = new Map<string, ProgramSetupPendingReview>()
  for (const decision of decisions) {
    const program = programs?.find(item => item.id === decision.program_instance_id)
    if (!program || (program.units !== 'kg' && program.units !== 'lb')) {
      throw new Error('The programme and units for this pending review could not be loaded. Retry before replacing your plan.')
    }
    let group = groups.get(program.id)
    if (!group) {
      group = { programId: program.id, title: program.title, units: program.units, decisions: [] }
      groups.set(program.id, group)
    }
    group.decisions.push(mapProgressionDecision(decision))
  }
  return [...groups.values()]
}
