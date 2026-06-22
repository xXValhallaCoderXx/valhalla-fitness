import { queryOptions } from '@tanstack/react-query'
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

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ['me'],
    queryFn: () => getMeFn(),
  })

export const templatesQueryOptions = () =>
  queryOptions({
    queryKey: ['templates'],
    queryFn: () => listTemplatesFn(),
  })

export const programSetupOptionsQueryOptions = (templateId: string) =>
  queryOptions({
    queryKey: ['programSetupOptions', templateId],
    queryFn: () => getProgramSetupOptionsFn({ data: { templateId } }),
  })

export const activeProgramQueryOptions = () =>
  queryOptions({
    queryKey: ['activeProgram'],
    queryFn: () => getActiveProgramFn(),
  })

export const todayQueryOptions = () =>
  queryOptions({
    queryKey: ['today'],
    queryFn: () => getTodayFn(),
  })

export const sessionQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionFn({ data: { sessionId } }),
  })

export const recentHistoryQueryOptions = () =>
  queryOptions({
    queryKey: ['history', 'recent'],
    queryFn: () => getRecentHistoryFn(),
  })

export const historyDashboardQueryOptions = () =>
  queryOptions({
    queryKey: ['history', 'dashboard'],
    queryFn: () => getHistoryDashboardFn(),
  })

export const programOverviewQueryOptions = () =>
  queryOptions({
    queryKey: ['programOverview'],
    queryFn: () => getProgramOverviewFn(),
  })

export const movementHistoryQueryOptions = (movementId: string) =>
  queryOptions({
    queryKey: ['history', 'movement', movementId],
    queryFn: () => getMovementHistoryFn({ data: { movementId } }),
  })

export const movementSwapOptionsQueryOptions = (sessionId: string, exerciseLogId: string) =>
  queryOptions({
    queryKey: ['movementSwapOptions', sessionId, exerciseLogId],
    queryFn: () => listMovementSwapOptionsFn({ data: { sessionId, exerciseLogId } }),
  })

export const accessoryMovementOptionsQueryOptions = () =>
  queryOptions({
    queryKey: ['accessoryMovementOptions'],
    queryFn: () => listAccessoryMovementOptionsFn(),
  })
