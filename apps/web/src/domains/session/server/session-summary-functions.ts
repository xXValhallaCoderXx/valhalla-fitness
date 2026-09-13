import { createServerFn } from '@tanstack/react-start'
import { getSessionSummary } from '@sheetless/data/session/summary'
import { sessionIdInputSchema } from '~/domains/session/lib/schemas'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const getSessionSummaryFn = createServerFn({ method: 'GET' })
  .validator((data) => sessionIdInputSchema.parse(data))
  .handler(async ({ data }) => getSessionSummary(await requireSessionUser(), data.sessionId))
