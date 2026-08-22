import { createServerFn } from '@tanstack/react-start'
import { finishSession } from '@sheetless/data/session/completion'
import { finishSessionInputSchema } from '~/domains/session/lib/schemas'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const finishSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => finishSessionInputSchema.parse(data))
  .handler(async ({ data }) => finishSession(await requireSessionUser(), data))
