import type { z } from 'zod'
import { normalizeFeedbackInput } from '@sheetless/domain/feedback/feedback-options'
import type { submitFeedbackInputSchema } from '@sheetless/domain/feedback/schemas'
import type { Json } from '@sheetless/domain/shared/types/database'
import type { UserContext } from '../shared/context'

/** Append-only insert into `feedback_events`; the app never reads feedback back. */
export async function submitFeedback(
  ctx: UserContext,
  data: z.infer<typeof submitFeedbackInputSchema>,
) {
  const input = normalizeFeedbackInput(data)
  const { supabase, user } = ctx
  const { error } = await supabase.from('feedback_events').insert({
    user_id: user.id,
    source: input.source,
    answer: input.answer,
    category: input.category,
    message: input.message,
    route: input.route,
    session_id: input.sessionId,
    decision_id: input.decisionId,
    metadata: (input.metadata ?? {}) as Json,
  })
  if (error) throw new Error(error.message)
  return { ok: true as const }
}
