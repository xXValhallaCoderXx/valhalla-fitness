import { createServerFn } from '@tanstack/react-start'
import { submitFeedback } from '@sheetless/data/feedback/feedback'
import { submitFeedbackInputSchema } from '~/domains/feedback/lib/schemas'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export const submitFeedbackFn = createServerFn({ method: 'POST' })
  .validator((data) => submitFeedbackInputSchema.parse(data))
  .handler(async ({ data }) => submitFeedback(await requireUser(), data))
