import { accessoryOutcomeSummary } from '@sheetless/domain/program/progression-decisions'
import { collectSessionQueryPages } from '@sheetless/domain/session/session-query-pages'
import type { SessionSummary } from '@sheetless/domain/session/types'
import { mapProgressionDecision } from '../program/active-program'
import type { UserContext } from '../shared/context'
import { getSession } from './reads'

/** Rebuild a completed workout receipt from its saved work and exact decision links. */
export async function getSessionSummary(ctx: UserContext, sessionId: string): Promise<SessionSummary> {
  const session = await getSession(ctx, sessionId)
  if (session.status !== 'completed') throw new Error('Only completed workouts have a summary')

  const { data: receipt, error } = await ctx.supabase.from('workout_sessions')
    .select('progression_receipt_recorded').eq('id', sessionId).eq('user_id', ctx.user.id).single()
  if (error) throw new Error(error.message)
  const decisionReceiptAvailable = receipt.progression_receipt_recorded === true
  // Legacy programme/date matches are ambiguous. Never borrow another workout's decisions.
  const rows = decisionReceiptAvailable && !session.isAdHoc
    ? await collectSessionQueryPages((from, to) => ctx.supabase.from('progression_decisions')
        .select('*').eq('session_id', sessionId).eq('user_id', ctx.user.id)
        .order('created_at').order('id').range(from, to))
    : []
  const sets = session.movements.flatMap((movement) => movement.sets)
  return {
    session,
    completedSets: sets.filter((set) => set.completed).length,
    totalSets: sets.length,
    topSets: sets.filter((set) => set.isTopSet || set.isAmrap),
    accessoryOutcomes: session.movements.filter((movement) => movement.role === 'accessory')
      .map((movement) => `${movement.movementName}: ${accessoryOutcomeSummary(movement)}`),
    decisions: rows.map(mapProgressionDecision),
    decisionReceiptAvailable,
  }
}
