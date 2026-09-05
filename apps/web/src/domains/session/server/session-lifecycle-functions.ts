import { createServerFn } from '@tanstack/react-start'
import {
  discardSession,
  renameSession,
  startAdHocSession,
  startSession,
} from '@sheetless/data/session/lifecycle'
import {
  renameSessionInputSchema,
  sessionIdInputSchema,
  startAdHocSessionInputSchema,
  startSessionInputSchema,
} from '~/domains/session/lib/schemas'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const startSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => startSessionInputSchema.parse(data))
  .handler(async ({ data }) => startSession(await requireSessionUser(), data))

export const startAdHocSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => startAdHocSessionInputSchema.parse(data))
  .handler(async ({ data }) => startAdHocSession(await requireSessionUser(), data))

export const renameSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => renameSessionInputSchema.parse(data))
  .handler(async ({ data }) => renameSession(await requireSessionUser(), data))

export const discardSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => sessionIdInputSchema.parse(data))
  .handler(async ({ data }) => discardSession(await requireSessionUser(), data))
