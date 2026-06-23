import { queryOptions } from '@tanstack/react-query'
import { fetchUserFn } from '~/server/auth'
import {
  getActiveProgramFn,
  getHistoryDashboardFn,
  getMeFn,
  getMovementHistoryFn,
  getProgramSetupOptionsFn,
  getProgramOverviewFn,
  getRecentHistoryFn,
  getSessionFn,
  getTodayFn,
  listAccessoryMovementOptionsFn,
  listMovementSwapOptionsFn,
  listTemplatesFn,
} from '~/server/api'

export const queryStaleTimes = {
  auth: 5 * 60_000,
  profile: 2 * 60_000,
  catalog: 10 * 60_000,
  today: 15_000,
  session: 15_000,
  program: 45_000,
  history: 2 * 60_000,
  options: 10 * 60_000,
}

export const authUserQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'user'],
    queryFn: () => fetchUserFn(),
    staleTime: queryStaleTimes.auth,
    gcTime: 30 * 60_000,
  })

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ['me'],
    queryFn: () => getMeFn(),
    staleTime: queryStaleTimes.profile,
    gcTime: 30 * 60_000,
  })

export const templatesQueryOptions = () =>
  queryOptions({
    queryKey: ['templates'],
    queryFn: () => listTemplatesFn(),
    staleTime: queryStaleTimes.catalog,
    gcTime: 30 * 60_000,
  })

export const programSetupOptionsQueryOptions = (templateId: string) =>
  queryOptions({
    queryKey: ['programSetupOptions', templateId],
    queryFn: () => getProgramSetupOptionsFn({ data: { templateId } }),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })

export const activeProgramQueryOptions = () =>
  queryOptions({
    queryKey: ['activeProgram'],
    queryFn: () => getActiveProgramFn(),
    staleTime: queryStaleTimes.program,
  })

export const todayQueryOptions = () =>
  queryOptions({
    queryKey: ['today'],
    queryFn: () => getTodayFn(),
    staleTime: queryStaleTimes.today,
  })

export const sessionQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionFn({ data: { sessionId } }),
    staleTime: queryStaleTimes.session,
  })

export const recentHistoryQueryOptions = () =>
  queryOptions({
    queryKey: ['history', 'recent'],
    queryFn: () => getRecentHistoryFn(),
    staleTime: queryStaleTimes.history,
  })

export const historyDashboardQueryOptions = () =>
  queryOptions({
    queryKey: ['history', 'dashboard'],
    queryFn: () => getHistoryDashboardFn(),
    staleTime: queryStaleTimes.history,
    gcTime: 30 * 60_000,
  })

export const programOverviewQueryOptions = () =>
  queryOptions({
    queryKey: ['programOverview'],
    queryFn: () => getProgramOverviewFn(),
    staleTime: queryStaleTimes.program,
  })

export const movementHistoryQueryOptions = (movementId: string) =>
  queryOptions({
    queryKey: ['history', 'movement', movementId],
    queryFn: () => getMovementHistoryFn({ data: { movementId } }),
    staleTime: queryStaleTimes.history,
  })

export const movementSwapOptionsQueryOptions = (sessionId: string, exerciseLogId: string) =>
  queryOptions({
    queryKey: ['movementSwapOptions', sessionId, exerciseLogId],
    queryFn: () => listMovementSwapOptionsFn({ data: { sessionId, exerciseLogId } }),
    staleTime: queryStaleTimes.options,
  })

export const accessoryMovementOptionsQueryOptions = () =>
  queryOptions({
    queryKey: ['accessoryMovementOptions'],
    queryFn: () => listAccessoryMovementOptionsFn(),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })
