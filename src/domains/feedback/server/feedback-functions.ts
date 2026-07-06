import { createServerFn } from '@tanstack/react-start'
import { normalizeFeedbackInput, type SubmitFeedbackInput } from '~/domains/feedback/lib/feedback-options'
import type { Json } from '~/shared/types/database'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

/** Append-only insert into `feedback_events`; the app never reads feedback back. */
export const submitFeedbackFn = createServerFn({ method: 'POST' })
  .validator((data: SubmitFeedbackInput) => data)
  .handler(async ({ data }) => {
    const input = normalizeFeedbackInput(data)
    const { supabase, user } = await requireUser()
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
  })
