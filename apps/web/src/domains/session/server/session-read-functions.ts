import { createServerFn } from '@tanstack/react-start'
import type { TodayPayload, WorkoutSession } from '~/domains/session'
import { sessionIdInputSchema } from '~/domains/session/lib/schemas'
import { requireSessionUser } from '~/domains/session/server/session-server'

// @sheetless/data is loaded dynamically: this module exports plain helpers
// alongside server fns, so a static import would survive the client transform
// and drag the data package's graph into the /today bundle.
async function reads() {
  return import('@sheetless/data/session/reads')
}

/** Web-signature shims: acquire the cookie-authenticated context themselves. */
export async function getTodayInternal(timeZone?: string | null): Promise<TodayPayload> {
  const { getToday } = await reads()
  return getToday(await requireSessionUser(), timeZone)
}

export async function getSessionInternal(sessionId: string): Promise<WorkoutSession> {
  const { getSession } = await reads()
  return getSession(await requireSessionUser(), sessionId)
}

export const getTodayFn = createServerFn({ method: 'GET' }).handler(() => getTodayInternal())

export const getSessionFn = createServerFn({ method: 'GET' })
  .validator((data) => sessionIdInputSchema.parse(data))
  .handler(async ({ data }) => getSessionInternal(data.sessionId))
