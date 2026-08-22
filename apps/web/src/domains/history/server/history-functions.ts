import { createServerFn } from '@tanstack/react-start'
import {
  getHistoryDashboard,
  getMovementHistory,
  getProgramOverview,
  getRecentHistory,
  getTodayHistorySupport,
} from '@sheetless/data/history/history'
import { movementHistoryInputSchema } from '~/domains/history/lib/schemas'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export const getHistoryDashboardFn = createServerFn({ method: 'GET' }).handler(async () =>
  getHistoryDashboard(await requireUser()))

export const getTodayHistorySupportFn = createServerFn({ method: 'GET' }).handler(async () =>
  getTodayHistorySupport(await requireUser()))

export const getProgramOverviewFn = createServerFn({ method: 'GET' }).handler(async () =>
  getProgramOverview(await requireUser()))

export const getRecentHistoryFn = createServerFn({ method: 'GET' }).handler(async () =>
  getRecentHistory(await requireUser()))

export const getMovementHistoryFn = createServerFn({ method: 'GET' })
  .validator((data) => movementHistoryInputSchema.parse(data))
  .handler(async ({ data }) => getMovementHistory(await requireUser(), data))
